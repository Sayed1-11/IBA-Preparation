/* ==========================================================================
   ocr.js  —  BUILT-IN OCR + LOCAL QUESTION PARSER   (no API key, no account)

   Two independent pieces:

   1. OcrEngine    Wraps Tesseract.js (open-source, runs as WebAssembly inside
                   your browser). Nothing is uploaded: the page image is read
                   on your own machine. The library + English model are fetched
                   from a CDN the FIRST time only, then cached in IndexedDB, so
                   every later import works fully offline.
                   Want it offline from the very first run? Drop the files in
                   vendor/tesseract/ (see README) — they are used if present.

   2. QuestionParser
                   Turns raw text (from a text-layer PDF, from OCR, or pasted
                   by hand) into MCQ objects the exam runner understands.
                   Pure regex/heuristics — no model, no network, no key.
   ========================================================================== */

const OcrEngine = {
  VERSION: "5.1.1",
  _worker: null,
  _loaded: false,
  _localBase: "vendor/tesseract/",   // optional fully-offline copy
  _usingLocal: false,

  _scriptCandidates() {
    return [
      this._localBase + "tesseract.min.js",
      `https://cdn.jsdelivr.net/npm/tesseract.js@${this.VERSION}/dist/tesseract.min.js`,
      `https://unpkg.com/tesseract.js@${this.VERSION}/dist/tesseract.min.js`
    ];
  },

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve(src);
      s.onerror = () => { s.remove(); reject(new Error("script failed: " + src)); };
      document.head.appendChild(s);
    });
  },

  async loadLibrary(say) {
    if (this._loaded && window.Tesseract) return window.Tesseract;
    const srcs = this._scriptCandidates();
    for (let i = 0; i < srcs.length; i++) {
      try {
        if (say) say(i === 0 ? "Looking for a local OCR copy…" : "Loading the OCR engine (one-time download)…");
        await this._loadScript(srcs[i]);
        if (window.Tesseract) {
          this._loaded = true;
          this._usingLocal = (i === 0);
          return window.Tesseract;
        }
      } catch (e) { /* next candidate */ }
    }
    throw new Error("NETWORK_ERROR: couldn't load the built-in OCR engine. It downloads once from a CDN — connect to the internet for this first run, or place the Tesseract files in vendor/tesseract/ (see README).");
  },

  async getWorker(say, onPct) {
    const T = await this.loadLibrary(say);
    if (this._worker) return this._worker;
    const opts = {
      logger: (m) => {
        if (!onPct) return;
        if (m.status === "recognizing text") onPct(Math.round((m.progress || 0) * 100), "recognising");
        else if (/loading|initializ|downloading/i.test(m.status || "")) onPct(Math.round((m.progress || 0) * 100), m.status);
      },
      errorHandler: (e) => console.warn("[ocr]", e)
    };
    if (this._usingLocal) {
      opts.workerPath = this._localBase + "worker.min.js";
      opts.corePath = this._localBase + "core/";
      opts.langPath = this._localBase + "lang/";
    }
    if (say) say("Starting the OCR engine (first run downloads the English model, ~12 MB — it is cached afterwards)…");
    this._worker = await T.createWorker("eng", 1, opts);
    try {
      await this._worker.setParameters({
        preserve_interword_spaces: "1",
        user_defined_dpi: "300"
      });
    } catch (e) { /* older builds ignore this */ }
    return this._worker;
  },

  /* images: ["<base64 png/jpeg>", …]  ->  [{page, text}] */
  async recognize(images, say, onProgress) {
    const worker = await this.getWorker(say, (pct, what) => {
      if (onProgress) onProgress(null, null, pct, what);
    });
    const out = [];
    for (let i = 0; i < images.length; i++) {
      if (say) say(`Reading page ${i + 1} of ${images.length} with built-in OCR…`);
      const src = images[i].b64 ? images[i].b64 : images[i];
      const pageNo = images[i].page || (i + 1);
      const res = await worker.recognize("data:image/png;base64," + src);
      out.push({ page: pageNo, text: (res && res.data && res.data.text) || "" });
      if (onProgress) onProgress(i + 1, images.length, 100, "page done");
    }
    return out;
  },

  async terminate() {
    if (this._worker) { try { await this._worker.terminate(); } catch (e) {} this._worker = null; }
  }
};


/* ==========================================================================
   QuestionParser — text  ->  MCQs, with no AI involved.
   Handles the layouts that actually show up in IBA / GMAT / SAT papers:
     1. What is …?            1) …          Q.1 …
        (a) x  (b) y          A. x          ক. x
     and answer keys written as: "Answer Key  1. c  2. a  3. d …"
     or inline as "Ans: (c)" / "Answer: C" at the end of a question.
   ========================================================================== */
const QuestionParser = {
  BN_LETTERS: "কখগঘঙ",

  /* ---------- text hygiene ---------- */
  normalize(t) {
    return String(t || "")
      .replace(/\r/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/[–—]/g, "-")
      .replace(/\t/g, " ")
      .replace(/[ ]{2,}/g, "  ")
      .replace(/\n{3,}/g, "\n\n");
  },

  /* Drop page headers/footers that repeat on most pages, and bare page numbers. */
  stripRepeats(pages) {
    const counts = {};
    pages.forEach(p => {
      const seen = {};
      this.normalize(p.text).split("\n").forEach(l => {
        const k = l.trim();
        if (!k || k.length > 70) return;
        if (seen[k]) return; seen[k] = 1;
        counts[k] = (counts[k] || 0) + 1;
      });
    });
    const threshold = Math.max(2, Math.ceil(pages.length * 0.6));
    const junk = new Set(Object.keys(counts).filter(k => counts[k] >= threshold && pages.length >= 3));
    return pages.map(p => ({
      page: p.page,
      text: this.normalize(p.text).split("\n")
        .filter(l => {
          const k = l.trim();
          if (!k) return true;
          if (junk.has(k)) return false;
          if (/^page\s*\d+(\s*(of|\/)\s*\d+)?$/i.test(k)) return false;
          if (/^\d{1,3}$/.test(k)) return false;           // lone page number
          return true;
        }).join("\n")
    }));
  },

  letterToId(ch) {
    if (!ch) return null;
    const bn = this.BN_LETTERS.indexOf(ch);
    if (bn >= 0) return "abcde"[bn];
    if (/[1-5]/.test(ch)) return "abcde"[Number(ch) - 1];
    if (/[ivx]+/i.test(ch) && /^(i|ii|iii|iv|v)$/i.test(ch)) return "abcde"[["i", "ii", "iii", "iv", "v"].indexOf(ch.toLowerCase())];
    return ch.toLowerCase();
  },

  /* ---------- answer key ---------- */
  /* Returns {map: {qnum: "a"}, keyText, bodyPages} — key pages are removed
     from the body so their digits don't look like question numbers.       */
  /* Which subject a key heading names. "Section I: Language & Communication",
     "Section II: Mathematics", "Section III: Analytical Ability" — and the
     numbering restarts at 1 inside each, so keys are stored per section. */
  sectionOf(line) {
    const t = String(line).toLowerCase();
    if (/math|quantitative|numerical/.test(t)) return "math";
    if (/analytic|reasoning|logic|data sufficiency/.test(t)) return "analytical";
    if (/language|communication|english|verbal|comprehension/.test(t)) return "english";
    return null;
  },

  /* text -> { "english|7": "c", "*|7": "c", … }  ("*" = no section given) */
  parseKeyText(text) {
    const map = {};
    const pairRe = new RegExp("(\\d{1,3})\\s*[.):\\-]?\\s*[\\(\\[]?([a-eA-E" + this.BN_LETTERS + "1-5])[\\)\\]]?(?![a-zA-Z0-9])", "g");
    const secHead = /section\s*[IVX\d]*\s*[-:.–]?\s*(.{0,40})|^\s*(mathematics|maths|quantitative|english|language|analytical|verbal|reasoning)\b/i;
    let sec = "*";
    let count = 0;
    this.normalize(text).split("\n").forEach(line => {
      const h = secHead.exec(line);
      if (h) {
        const guess = this.sectionOf(line);
        if (guess) { sec = guess; return; }        // heading line, no pairs expected
      }
      let m; pairRe.lastIndex = 0;
      while ((m = pairRe.exec(line))) {
        const q = Number(m[1]);
        if (q < 1 || q > 400) continue;
        const a = this.letterToId(m[2]);
        const k = sec + "|" + q;
        if (map[k] === undefined) { map[k] = a; count++; }
      }
    });
    map.__count = count;
    return map;
  },

  /* Look a question up in a section-aware key. */
  keyFor(map, num, subject) {
    if (num == null) return { answer: null, ambiguous: false };
    if (subject && map[subject + "|" + num]) return { answer: map[subject + "|" + num], ambiguous: false };
    if (map["*|" + num]) return { answer: map["*|" + num], ambiguous: false };
    const seen = [];
    ["english", "math", "analytical"].forEach(sc => { const v = map[sc + "|" + num]; if (v) seen.push(v); });
    const uniq = Array.from(new Set(seen));
    if (uniq.length === 1) return { answer: uniq[0], ambiguous: false };
    if (uniq.length > 1) return { answer: null, ambiguous: true };   // same number in several sections
    return { answer: null, ambiguous: false };
  },

  extractAnswerKey(pages, pastedKey) {
    const map = {};
    let found = 0;
    const merge = (m) => {
      Object.keys(m).forEach(k => {
        if (k === "__count") return;
        if (map[k] === undefined) { map[k] = m[k]; found++; }
      });
    };
    const pairRe = new RegExp("(\\d{1,3})\\s*[.):\\-]?\\s*[\\(\\[]?([a-eA-E" + this.BN_LETTERS + "1-5])[\\)\\]]?(?![a-zA-Z0-9])", "g");
    const pairsIn = (txt) => {
      const out = []; let m; pairRe.lastIndex = 0;
      while ((m = pairRe.exec(txt))) { const q = Number(m[1]); if (q >= 1 && q <= 400) out.push({ q }); }
      return out;
    };
    /* A real key is a long, mostly-consecutive run (1,2,3,4…) — or several such
       runs, one per section. Question pages also contain "3  (b)"-looking
       noise, so sequence is what tells them apart. */
    const looksLikeKey = (pairs) => {
      if (pairs.length < 8) return false;
      let steps = 0, ones = 0;
      for (let i = 1; i < pairs.length; i++) { steps++; if (pairs[i].q === pairs[i - 1].q + 1 || pairs[i].q === 1) ones++; }
      return steps > 0 && ones / steps >= 0.75;
    };

    if (pastedKey && pastedKey.trim()) merge(this.parseKeyText(pastedKey));

    const body = [];
    pages.forEach(p => {
      const txt = p.text;
      const headIdx = txt.search(/answer\s*(key|sheet)|answers\s*:|correct\s*answers|উত্তরমালা/i);
      if (headIdx >= 0) {
        const after = txt.slice(headIdx);
        if (pairsIn(after).length >= 3) {
          merge(this.parseKeyText(after));
          const before = txt.slice(0, headIdx).trim();
          if (before) body.push({ page: p.page, text: before });
          return;
        }
      }
      const all = pairsIn(txt);
      const words = (txt.match(/[A-Za-z]{3,}/g) || []).length;
      if (looksLikeKey(all) && words < all.length * 2.5) { merge(this.parseKeyText(txt)); return; }
      body.push(p);
    });
    return { map, bodyPages: body.length ? body : pages, found };
  },

  /* ---------- option splitting ---------- */
  /* Find the best ascending run of option markers inside one question block. */
  findOptions(block) {
    const re = new RegExp("(^|[\\s>\\-])[\\(\\[]?([a-eA-E" + this.BN_LETTERS + "])[\\)\\].:]\\s+", "g");
    const hits = [];
    let m;
    while ((m = re.exec(block))) {
      hits.push({ idx: m.index + m[1].length, end: re.lastIndex, id: this.letterToId(m[2]) });
    }
    if (hits.length < 2) return null;

    // longest ascending a,b,c,… run
    let best = null, run = [];
    const push = () => { if (!best || run.length > best.length) best = run.slice(); };
    for (const h of hits) {
      const want = run.length ? "abcde"[ "abcde".indexOf(run[run.length - 1].id) + 1 ] : "a";
      if (h.id === want) run.push(h);
      else if (h.id === "a") { push(); run = [h]; }
      else { /* stray marker — ignore */ }
    }
    push();
    if (!best || best.length < 2) return null;

    const prompt = block.slice(0, best[0].idx).trim();
    const options = best.map((h, i) => {
      const stop = i + 1 < best.length ? best[i + 1].idx : block.length;
      return { id: h.id, text: block.slice(h.end, stop).replace(/\s+/g, " ").trim() };
    }).filter(o => o.text);
    if (options.length < 2) return null;
    return { prompt, options, tail: block.slice(best[best.length - 1].end) };
  },

  guessSubject(text, forced) {
    if (forced && forced !== "auto") return forced;
    const t = text.toLowerCase();
    const mathHits = (t.match(/\d/g) || []).length
      + (t.match(/\b(sum|average|ratio|percent|per cent|angle|triangle|circle|radius|probability|equation|x\s*[=+\-]|sqrt|integer|digit|profit|interest|speed|area|volume|median)\b/g) || []).length * 3;
    if (/\b(which of the following must be true|if all|arrangement|seated|sits|to the left of|conclusion follows|assumption|strengthens|weakens|neither .* nor .* can)\b/.test(t)) return "analytical";
    if (/\b(synonym|antonym|analogy|underlined|grammatical|sentence|passage|author|paragraph|word)\b/.test(t) && mathHits < 8) return "english";
    if (mathHits >= 8) return "math";
    return "english";
  },

  /* ---------- main ---------- */
  /* pages: [{page, text}]   opts: {subject, max, answerKeyText} */
  parse(pages, opts) {
    opts = opts || {};
    const cleaned = this.stripRepeats(pages.map(p => ({ page: p.page, text: this.normalize(p.text) })));
    const { map: keyMap, bodyPages, found } = this.extractAnswerKey(cleaned, opts.answerKeyText);

    // Flatten to lines, remembering section headings
    const lines = [];
    bodyPages.forEach(p => {
      p.text.split("\n").forEach(l => lines.push({ page: p.page, raw: l }));
    });

    const qStartQ = /^\s*(?:Q|Question|No)\s*\.?\s*(\d{1,3})\s*[.)\]:]?\s+(?=\S)/i;  // "Q.1 …", "Q3. …"
    const qStartN = /^\s*(\d{1,3})\s*[.)\]:]\s*(?=\S)/;                                  // "1. …", "12) …"
    const qStart = { exec: (s2) => qStartQ.exec(s2) || qStartN.exec(s2), test: (s2) => qStartQ.test(s2) || qStartN.test(s2) };
    const sectionRe = /^\s*(?:section\s*[IVX\d]*\s*[-:.–]?\s*)?(mathematics|maths?|quantitative|english|language\s*(?:&|and)?\s*communication|language|verbal|analytical\s*ability|analytical|reasoning|data sufficiency)\b/i;

    /* Shared stimulus text — RC passages, analytical game set-ups, "Directions:"
       blocks, data tables. These sit BETWEEN questions, so they must be pulled
       aside and attached to the questions they belong to, not swallowed by the
       previous question's option list. */
    const dirRe = /^\s*(directions?|instructions?|read the following|refer to the following|the following passage|passage\b|questions?\s+\d{1,3}\s*(?:-|to|through|–)\s*\d{1,3})/i;
    const rangeRe = /questions?\s+(\d{1,3})\s*(?:-|to|through|–)\s*(\d{1,3})/i;
    const optLineRe = new RegExp("^\\s*[\\(\\[]?[a-eA-E" + this.BN_LETTERS + "][\\)\\].:]\\s+\\S", "");
    const optAnyRe = new RegExp("(^|[\\s>\\-])[\\(\\[]?[a-eA-E" + this.BN_LETTERS + "][\\)\\].:]\\s+", "g");
    const countOpts = (line) => { optAnyRe.lastIndex = 0; let n = 0; while (optAnyRe.exec(line)) n++; return n; };

    const blocks = [];
    let cur = null, section = null, lastNum = 0;
    let pending = [];                 // stimulus lines waiting for their questions
    let active = null;                // {text, from, to} currently in force
    const flush = () => { if (cur && cur.text.trim()) blocks.push(cur); cur = null; };
    const startPending = (line) => { flush(); pending.push(line); };

    const commitPending = () => {
      if (!pending.length) return;
      const text = pending.join("\n").replace(/\n{3,}/g, "\n\n").trim();
      pending = [];
      if (text.length < 40) return;                       // too short to be a passage
      const r = rangeRe.exec(text);
      active = {
        text,
        from: r ? Number(r[1]) : null,
        to: r ? Number(r[2]) : null,
        // no explicit range: a long passage carries to following questions,
        // a short instruction line applies only to the next one
        span: r ? "range" : (text.length > 260 ? "until-next" : "one")
      };
    };

    lines.forEach(ln => {
      const s = ln.raw.trim();
      if (!s) { if (pending.length) pending.push(""); else if (cur) cur.text += "\n"; return; }

      const sec = s.length < 60 && sectionRe.exec(s);
      if (sec && !qStart.test(s)) {
        flush(); pending = []; active = null;
        section = this.sectionOf(s) || "english";
        lastNum = 0;                                  // numbering restarts inside a new section
        return;
      }

      const m = qStart.exec(s);
      if (m) {
        const n = Number(m[1]);
        const ok = n === lastNum + 1 || (n === 1 && lastNum > 3) || (n > lastNum && n - lastNum <= 3) || lastNum === 0;
        if (ok) {
          commitPending();
          flush();
          let passage = null;
          if (active) {
            if (active.span === "range") { if (n >= active.from && n <= active.to) passage = active.text; }
            else if (active.span === "until-next") passage = active.text;
            else { passage = active.text; active = null; }   // one-shot instruction
          }
          cur = { number: n, page: ln.page, section, text: s.slice(m[0].length), passage, optSeen: 0 };
          lastNum = n;
          return;
        }
      }

      if (pending.length) { pending.push(s); return; }

      if (dirRe.test(s)) { startPending(s); return; }           // explicit passage/directions marker

      if (cur) {
        if (optLineRe.test(s)) { cur.optSeen += Math.max(1, countOpts(s)); cur.text += "\n" + s; return; }
        // Prose arriving after the options are done is the next set's stimulus,
        // not a continuation of this question.
        if (cur.optSeen >= 2 && s.length > 60) { startPending(s); return; }
        cur.text += "\n" + s;
        return;
      }
      startPending(s);                                          // prose before any question
    });
    commitPending();
    flush();

    const questions = [];
    let noOptions = 0, noAnswer = 0, ambiguous = 0;
    for (const b of blocks) {
      if (opts.max && questions.length >= opts.max) break;
      let blockText = b.text;
      let inlineAns = null;
      blockText = blockText.replace(/(^|\n)[ \t]*(?:ans|answer|correct answer)\s*[:.\-]?\s*[\(\[]?([a-eA-E])[\)\]]?[ \t]*(?=\n|$)/gi,
        (mm, pre, letter) => { inlineAns = this.letterToId(letter); return pre; });
      const split = this.findOptions(blockText);
      if (!split || !split.prompt) { noOptions++; continue; }

      const sect = b.section || this.guessSubject(blockText, opts.subject);
      const look = this.keyFor(keyMap, b.number, sect);
      let correct = look.answer;
      if (look.ambiguous) ambiguous++;
      let source = correct ? "key" : null;
      if (!correct && inlineAns) { correct = inlineAns; source = "key"; }
      if (!correct) { source = "unknown"; noAnswer++; }

      const prompt = split.prompt.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
      if (prompt.length < 4) { noOptions++; continue; }

      questions.push({
        id: "lq" + b.number + "_" + questions.length + "_" + Date.now().toString(36),
        number: b.number,
        prompt,
        options: split.options.map(o => ({ id: o.id, text: o.text })),
        correctOptionId: correct,
        answerSource: source,
        passage: b.passage || null,
        subject: b.section || this.guessSubject(prompt + " " + split.options.map(o => o.text).join(" "), opts.subject),
        keyAmbiguous: look.ambiguous || false,
        explanation: ""
      });
    }

    return {
      questions,
      stats: {
        fromKey: questions.filter(q => q.answerSource === "key").length,
        withPassage: questions.filter(q => q.passage).length,
        unknown: noAnswer,
        dropped: noOptions,
        keyEntries: found,
        ambiguous,
        blocks: blocks.length
      }
    };
  }
};
