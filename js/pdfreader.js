/* ==========================================================================
   pdfreader.js
   Reads PDFs entirely in the browser using Mozilla's pdf.js (loaded from a
   CDN the first time it is needed — so PDF import needs internet once).
   Two ways to read a PDF:
     1. extractText()  — for PDFs with a selectable text layer (exact, fast)
     2. renderPages()  — turns pages into JPEG images for a vision model
                         (scanned papers / photos-in-a-PDF / diagrams)
   Nothing is uploaded anywhere except what you then send to your chosen AI.
   ========================================================================== */
/* pdf.js 5.x uses the very new Map/WeakMap "upsert" methods. Older browsers
   don't have them yet, so provide them (used in the page AND in the worker). */
const PDF_POLYFILL_SRC = `
(function () {
  [Map, WeakMap].forEach(function (C) {
    if (!C.prototype.getOrInsert) Object.defineProperty(C.prototype, "getOrInsert", { configurable: true, writable: true,
      value: function (k, v) { if (this.has(k)) return this.get(k); this.set(k, v); return v; } });
    if (!C.prototype.getOrInsertComputed) Object.defineProperty(C.prototype, "getOrInsertComputed", { configurable: true, writable: true,
      value: function (k, f) { if (this.has(k)) return this.get(k); var v = f(k); this.set(k, v); return v; } });
  });
})();
`;

const PdfReader = {
  VERSION: "5.6.205",
  _lib: null,

  _bases() {
    return [
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${this.VERSION}/build/`,
      `https://unpkg.com/pdfjs-dist@${this.VERSION}/build/`
    ];
  },

  async load() {
    if (this._lib) return this._lib;
    (0, eval)(PDF_POLYFILL_SRC); // must run before pdf.js is evaluated
    for (const base of this._bases()) {
      try {
        const lib = await import(base + "pdf.min.mjs");
        // Cross-origin workers are blocked from file:// pages, so hand pdf.js
        // the worker code as a same-origin blob instead.
        try {
          const r = await fetch(base + "pdf.worker.min.mjs");
          if (!r.ok) throw new Error("worker fetch failed");
          const code = await r.text();
          lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([PDF_POLYFILL_SRC + "\n" + code], { type: "text/javascript" }));
        } catch (e) {
          lib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
        }
        this._lib = lib;
        return lib;
      } catch (e) { /* try next CDN */ }
    }
    throw new Error("NETWORK_ERROR: couldn't load the PDF reader library. It is downloaded once from a CDN, so check your internet connection.");
  },

  async open(file) {
    const lib = await this.load();
    const data = new Uint8Array(await file.arrayBuffer());
    try {
      return await lib.getDocument({ data }).promise;
    } catch (e) {
      if (e && e.name === "PasswordException") throw new Error("PDF_LOCKED: this PDF is password-protected. Remove the password and try again.");
      throw new Error("PDF_UNREADABLE: couldn't open this file as a PDF (" + ((e && e.message) || "unknown error") + ").");
    }
  },

  /* [{page, text}] for the given 1-based page numbers. */
  async extractText(doc, pages, onProgress) {
    const out = [];
    for (let i = 0; i < pages.length; i++) {
      const page = await doc.getPage(pages[i]);
      const tc = await page.getTextContent();
      let text = "", lastY = null;
      for (const it of tc.items) {
        if (typeof it.str !== "string") continue;
        const y = it.transform ? it.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && text && !text.endsWith("\n")) text += "\n";
        text += it.str;
        if (it.hasEOL && !text.endsWith("\n")) text += "\n";
        if (y !== null) lastY = y;
      }
      out.push({ page: pages[i], text: text.replace(/[ \t]+\n/g, "\n").trim() });
      page.cleanup();
      if (onProgress) onProgress(i + 1, pages.length);
    }
    return out;
  },

  /* [{page, b64}] — JPEG (base64, no data: prefix) for each requested page. */
  async renderPages(doc, pages, onProgress, opts) {
    opts = opts || {};
    const maxWidth = opts.maxWidth || 1500;
    const png = !!opts.png;
    const out = [];
    for (let i = 0; i < pages.length; i++) {
      const page = await doc.getPage(pages[i]);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.max(1, Math.min(opts.maxScale || 2.2, maxWidth / base.width)); // wider = better OCR
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      if (opts.grayscale) {
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
        for (let k = 0; k < d.length; k += 4) {
          const g = 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2];
          const v = g > 186 ? 255 : (g < 110 ? 0 : g);   // gentle contrast lift, not hard binarisation
          d[k] = d[k + 1] = d[k + 2] = v;
        }
        ctx.putImageData(img, 0, 0);
      }
      out.push({ page: pages[i], b64: (png ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85)).split(",")[1] });
      page.cleanup();
      canvas.width = canvas.height = 0;
      if (onProgress) onProgress(i + 1, pages.length);
    }
    return out;
  },

  /* Sliding windows of `size` pages advancing by `stride`, so a question that
     straddles a page break is fully visible in at least one window. */
  makeBatches(items, size, stride) {
    size = size || 3; stride = stride || 2;
    const out = [];
    for (let i = 0; i < items.length; i += stride) {
      out.push(items.slice(i, i + size));
      if (i + size >= items.length) break;
    }
    return out;
  },

  pageLabel(group) {
    const p = group.map(g => g.page).filter(x => x != null);
    if (!p.length) return "images";
    return p.length === 1 || p[0] === p[p.length - 1] ? "page " + p[0] : "pages " + p[0] + "–" + p[p.length - 1];
  }
};
