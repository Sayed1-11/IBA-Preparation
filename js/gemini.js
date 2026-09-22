/* ==========================================================================
   gemini.js
   AI client. Supports Google Gemini plus ANY OpenAI-compatible endpoint,
   including the free providers catalogued at
   https://github.com/mnfst/awesome-free-llm-apis (Groq, OpenRouter,
   Mistral, LLM7.io ...) and a "Custom" option for anything else.

   Keys are stored per-provider in AppState.settings.apiKeys and read live
   on each call — never hardcoded, so this file is safe to share/commit.
   The object is still called "GeminiService" so ui.js keeps working.
   ========================================================================== */

/* All base URLs / default models below come from the awesome-free-llm-apis
   data file (lastUpdated 2026-08-21). Free-tier model names rotate often —
   if one 404s, change the model name in Settings (no code change needed). */
const AI_PROVIDERS = {
  gemini: {
    label: "Google Gemini (free tier)", kind: "gemini",
    defaultModel: "gemini-flash-latest",
    keyUrl: "https://aistudio.google.com/apikey", keyPlaceholder: "AIza...",
    keyHint: 'Gemini keys start with "AIza".',
    modelHint: 'Try "gemini-2.5-flash" or "gemini-2.5-flash-lite" if the default ever fails.'
  },
  openai: {
    label: "OpenAI (needs paid API credit)", kind: "openai",
    baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini",
    keyUrl: "https://platform.openai.com/api-keys", keyPlaceholder: "sk-...",
    keyHint: 'OpenAI keys start with "sk-". Note: a ChatGPT subscription does NOT include API credit — the API is billed separately.',
    modelHint: 'e.g. "gpt-4o-mini" or "gpt-5-mini".'
  },
  groq: {
    label: "Groq (free)", kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1", defaultModel: "openai/gpt-oss-120b",
    keyUrl: "https://console.groq.com/keys", keyPlaceholder: "gsk_...",
    keyHint: "Free, no credit card. Very fast.",
    modelHint: 'Others listed as free: "openai/gpt-oss-20b", "qwen/qwen3.6-27b". Free limit ≈ 30 requests/min.'
  },
  openrouter: {
    label: "OpenRouter (free models)", kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1", defaultModel: "openai/gpt-oss-20b:free",
    keyUrl: "https://openrouter.ai/keys", keyPlaceholder: "sk-or-...",
    keyHint: 'Free models end in ":free". Limit ≈ 20 requests/min, 50/day without credits.',
    modelHint: 'Others: "nvidia/nemotron-3-super-120b-a12b:free", "google/gemma-4-31b-it:free".'
  },
  mistral: {
    label: "Mistral AI (free tier)", kind: "openai",
    baseUrl: "https://api.mistral.ai/v1", defaultModel: "mistral-small-2603",
    keyUrl: "https://console.mistral.ai/api-keys", keyPlaceholder: "Paste Mistral key",
    keyHint: "Free mode, no credit card. Free-mode prompts may be used to train Mistral models unless you opt out.",
    modelHint: 'Others: "mistral-medium-3-5", "ministral-14b-2512".'
  },
  llm7: {
    label: "LLM7.io (free, no key needed)", kind: "openai", keyOptional: true,
    baseUrl: "https://api.llm7.io/v1", defaultModel: "gpt-oss:20b",
    keyUrl: "https://token.llm7.io", keyPlaceholder: "(optional) free token",
    keyHint: "Works with no key at all (≈10 requests/min). A free token raises the limits.",
    modelHint: 'Others: "mistral-Nemo-Instruct-2407".'
  },
  custom: {
    label: "Custom (any OpenAI-compatible API)", kind: "openai", needsBaseUrl: true,
    defaultModel: "", keyUrl: "https://github.com/mnfst/awesome-free-llm-apis", keyPlaceholder: "API key",
    keyHint: "Pick any provider from the awesome-free-llm-apis list, then enter its Base URL, key and a model name.",
    modelHint: "Model name exactly as the provider lists it."
  }
};

const GeminiService = {
  providers: AI_PROVIDERS,

  getProvider() {
    const p = AppState.settings.aiProvider || "gemini";
    return AI_PROVIDERS[p] ? p : "gemini";
  },
  info() { return AI_PROVIDERS[this.getProvider()]; },
  providerLabel() { return this.info().label.replace(/\s*\(.*\)\s*$/, ""); },

  getApiKey() {
    const keys = AppState.settings.apiKeys || {};
    return (keys[this.getProvider()] || "").trim();
  },
  getBaseUrl() {
    const p = this.info();
    return ((p.needsBaseUrl ? AppState.settings.customBaseUrl : p.baseUrl) || "").trim().replace(/\/+$/, "");
  },
  getModel() {
    const models = AppState.settings.models || {};
    return (models[this.getProvider()] || "").trim() || this.info().defaultModel;
  },
  defaultModelFor(provider) { return (AI_PROVIDERS[provider] || {}).defaultModel || ""; },

  /* "Ready to call" — a key is required unless the provider is keyless. */
  hasApiKey() {
    const p = this.info();
    if (p.needsBaseUrl && !(this.getBaseUrl() && this.getModel())) return false;
    return p.keyOptional || p.needsBaseUrl ? true : this.getApiKey().length > 0;
  },

  /* ---------- JSON helpers ---------- */
  stripFences(text) {
    return String(text || "")
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  },
  parseJSON(text) {
    const cleaned = this.stripFences(text);
    try { return JSON.parse(cleaned); } catch (e) { /* fall through */ }
    const firstObj = cleaned.indexOf("{"), lastObj = cleaned.lastIndexOf("}");
    const firstArr = cleaned.indexOf("["), lastArr = cleaned.lastIndexOf("]");
    const tries = [];
    if (firstObj !== -1 && lastObj > firstObj) tries.push(cleaned.slice(firstObj, lastObj + 1));
    if (firstArr !== -1 && lastArr > firstArr) tries.push(cleaned.slice(firstArr, lastArr + 1));
    for (const t of tries) { try { return JSON.parse(t); } catch (e) { /* keep trying */ } }
    throw new Error("MALFORMED_RESPONSE: the model didn't return valid JSON.");
  },

  /* ---------- Unified entry points ---------- */
  async callAI(promptText, images, opts) {
    opts = opts || {}; images = images || [];
    if (!this.hasApiKey()) throw new Error("NO_API_KEY");
    return this.info().kind === "gemini"
      ? this._callGemini(promptText, images, opts)
      : this._callOpenAICompat(promptText, images, opts);
  },
  async callJSON(promptText, images, opts) {
    return this.parseJSON(await this.callAI(promptText, images, opts));
  },

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  /* fetch() that transparently retries temporary failures (429 / 5xx) with
     growing pauses. Returns the final Response either way. */
  async _fetchWithRetry(url, init, delays) {
    delays = delays || [3000, 7000];
    let res;
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        res = await fetch(url, init);
      } catch (e) {
        throw new Error(`NETWORK_ERROR: could not reach ${this.providerLabel()} (offline, or the provider blocks browser requests).`);
      }
      const transient = res.status === 429 || res.status >= 500;
      if (!transient || attempt === delays.length) return res;
      await this._sleep(delays[attempt]);
    }
    return res;
  },

  _classifyHttpError(status, bodyText, model) {
    const t = (bodyText || "").slice(0, 220);
    const label = this.providerLabel();
    if (status === 401 || status === 403) return new Error(`BAD_API_KEY: ${label} rejected the key. ${t}`);
    if (status === 404) return new Error(`MODEL_NOT_FOUND: "${model}" isn't available on ${label}. Change the model name in Settings. ${t}`);
    if (status === 500 || status === 502 || status === 503 || status === 504) return new Error(`OVERLOADED: ${label} is temporarily overloaded (free tiers get busy at peak times). It was retried automatically and is still busy — wait a minute and try again, or switch model/provider in Settings.`);
    if (status === 429) return new Error(`RATE_LIMIT: ${label} says you've hit its free-tier limit. Wait a minute (or until tomorrow) and retry. ${t}`);
    return new Error(`API_ERROR (${status}): ${t}`);
  },

  async _callGemini(promptText, images, opts) {
    const key = this.getApiKey();
    const chosen = this.getModel();
    // If the chosen model stays overloaded, quietly try lighter/other Gemini models.
    const chain = [chosen].concat(["gemini-2.5-flash", "gemini-2.5-flash-lite"].filter(m => m !== chosen));
    const parts = images.map(b64 => ({ inline_data: { mime_type: "image/jpeg", data: b64 } }));
    parts.push({ text: promptText });
    const body = {
      contents: [{ parts }],
      generationConfig: { temperature: opts.temperature != null ? opts.temperature : 0.6, responseMimeType: "application/json" }
    };
    let lastErr = null;
    for (let m = 0; m < chain.length; m++) {
      const model = chain[m];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await this._fetchWithRetry(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, m === 0 ? [3000, 7000] : [3000]);
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        if (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(t)) {
          throw new Error("BAD_API_KEY: Gemini rejected this key. " + t.slice(0, 150));
        }
        lastErr = this._classifyHttpError(res.status, t, model);
        // Busy / rate-limited / model missing -> try the next model in the chain
        if ([404, 429, 500, 502, 503, 504].includes(res.status) && m < chain.length - 1) continue;
        throw lastErr;
      }
      const data = await res.json();
      const text = ((data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [])
        .map(p => p.text || "").join("");
      if (!text) { lastErr = new Error("EMPTY_RESPONSE: Gemini returned no usable content (it may have been blocked by a safety filter)."); if (m < chain.length - 1) continue; throw lastErr; }
      return this.stripFences(text);
    }
    throw lastErr || new Error("API_ERROR: request failed.");
  },

  /* Works for OpenAI, Groq, OpenRouter, Mistral, LLM7, and Custom. */
  async _callOpenAICompat(promptText, images, opts) {
    const key = this.getApiKey(), model = this.getModel();
    const base = this.getBaseUrl();
    if (!base) throw new Error("NO_BASE_URL: enter the provider's Base URL in Settings.");
    const url = base + "/chat/completions";
    const temp = opts.temperature != null ? opts.temperature : 0.6;
    // OpenAI's gpt-5 / o-series reject any non-default temperature.
    const noTemp = this.getProvider() === "openai" && /^(gpt-5|o\d)/i.test(model);

    const content = images.length
      ? [{ type: "text", text: promptText }].concat(images.map(b64 => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } })))
      : promptText;
    const headers = { "Content-Type": "application/json" };
    if (key) headers["Authorization"] = `Bearer ${key}`;
    if (this.getProvider() === "openrouter") headers["X-Title"] = "IBA MBA Prep";

    // Attempt 1: full-featured request. Attempt 2 (only after a 400/422): strip optional params.
    const variants = [{ useTemp: !noTemp, jsonMode: true }, { useTemp: false, jsonMode: false }];
    let lastErr = null;
    for (let v = 0; v < variants.length; v++) {
      const body = {
        model,
        messages: [
          { role: "system", content: "You are a careful IBA MBA admission-test tutor. Reply with a single valid JSON value only — no prose, no markdown fences." },
          { role: "user", content }
        ]
      };
      if (variants[v].useTemp) body.temperature = temp;
      if (variants[v].jsonMode) body.response_format = { type: "json_object" };

      const res = await this._fetchWithRetry(url, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        lastErr = this._classifyHttpError(res.status, t, model);
        if ((res.status === 400 || res.status === 422) && v < variants.length - 1) continue;
        throw lastErr;
      }
      const data = await res.json();
      const msg = data.choices && data.choices[0] && data.choices[0].message;
      const text = (msg && (typeof msg.content === "string" ? msg.content : "")) || "";
      if (!text.trim()) throw new Error(`EMPTY_RESPONSE: ${this.providerLabel()} returned no usable content. Try again or pick another model.`);
      return this.stripFences(text);
    }
    throw lastErr || new Error("API_ERROR: request failed.");
  },

  /* Quick health check used by Settings → "Test connection". */
  async testConnection() {
    const out = await this.callJSON('Return exactly this JSON and nothing else: {"ok": true}', [], { temperature: 0 });
    if (!out || out.ok !== true) throw new Error("MALFORMED_RESPONSE: connected, but the reply wasn't what we asked for.");
    return true;
  },

  /* ---------- Shared question helpers ---------- */
  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /* Turn whatever shape a model returned into {id,subject,prompt,options[4-5],correctOptionId,explanation}
     or null if it's unusable. Correct-answer position is then re-randomised
     (models love putting the answer at "b"). */
  _normaliseQuestion(raw, subject) {
    if (!raw || typeof raw.prompt !== "string" || !Array.isArray(raw.options)) return null;
    const letters = ["a", "b", "c", "d", "e"];
    let opts = raw.options.map(o => (typeof o === "string" ? { id: "", text: o } : { id: String(o && o.id || "").toLowerCase(), text: String(o && o.text != null ? o.text : "") }))
      .filter(o => o.text.trim());
    if (opts.length < 4) return null;
    opts = opts.slice(0, 5);
    if (opts.every(o => /^\(?[a-e][\).:]\s+/i.test(o.text))) opts.forEach(o => { o.text = o.text.replace(/^\(?[a-e][\).:]\s+/i, ""); });

    const cid = String(raw.correctOptionId != null ? raw.correctOptionId : (raw.answer != null ? raw.answer : "")).trim().toLowerCase();
    let ci = opts.findIndex(o => o.id && o.id === cid);
    if (ci === -1 && /^[a-e]$/.test(cid)) ci = cid.charCodeAt(0) - 97;
    if (ci === -1 && /^\d+$/.test(cid)) ci = Number(cid) - 1;
    if (ci === -1) ci = opts.findIndex(o => o.text.trim().toLowerCase() === cid);
    if (ci < 0 || ci >= opts.length) return null;

    let list = opts.map((o, i) => ({ text: o.text, isCorrect: i === ci }));
    // "All of the above" / "Both A and B" style options break if reordered.
    const positional = list.some(o => /\b(all|none|both|neither)\b.*\b(above|these|a\b|b\b|c\b)/i.test(o.text));
    if (!positional) this._shuffle(list);
    return {
      subject,
      prompt: raw.prompt.trim(),
      options: list.map((o, i) => ({ id: letters[i], text: o.text })),
      correctOptionId: letters[list.findIndex(o => o.isCorrect)],
      explanation: typeof raw.explanation === "string" ? raw.explanation.trim() : "",
      answerSource: "generated"
    };
  },

  _subjectBrief(subject) {
    if (subject === "math") return `Mathematics section: arithmetic and quantitative aptitude — percentage, profit & loss, time-speed-distance, work, mixture, average, age, ratio & proportion, interest, number theory (divisibility, LCM/HCF, primes), fractions, exponents, inequalities, and geometry (angles, triangles, circles, polygons, solids). Each question must be solvable by hand in 1-2 minutes and have exactly one correct answer. Work the solution out step by step BEFORE choosing the answer, and double-check the arithmetic.`;
    if (subject === "english") return `English section: a mix of grammar (error detection, sentence correction, fill-in-the-blanks, prepositions, articles, tenses, subject-verb agreement, conditionals), vocabulary (synonyms, antonyms, one-word substitution, idioms, analogies, word usage) and short self-contained reading/inference items (put a 2-3 sentence passage inside the question itself).`;
    return `Analytical/logical reasoning section: syllogisms, logical deduction, ordering/seating puzzles (max 5 entities), number and letter series, coding-decoding, blood relations, data sufficiency, and critical-reasoning arguments (assumption / strengthen / weaken). Every item must be fully self-contained, unambiguous, and have exactly one correct answer.`;
  },

  /* Generates multiple-choice questions from scratch (no images needed).
     Requests are made in batches of ≤10 so small free models stay accurate.
     opts: {subject: math|english|analytical|mixed, topic, count, difficulty, onProgress(done,total)} */
  async generateMockQuestions(opts) {
    const total = Math.max(1, Math.min(60, Number(opts.count) || 20));
    let plan;
    if (opts.subject === "mixed") {
      const m = Math.round(total * 0.4), e = Math.round(total * 0.35);
      plan = [{ subject: "math", n: m }, { subject: "english", n: e }, { subject: "analytical", n: Math.max(0, total - m - e) }].filter(p => p.n > 0);
    } else {
      plan = [{ subject: opts.subject, n: total }];
    }
    const all = [];
    const seen = new Set();
    let lastError = null;
    for (const part of plan) {
      let got = 0, tries = 0;
      while (got < part.n && tries < Math.ceil(part.n / 10) + 2) {
        tries++;
        const need = Math.min(10, part.n - got);
        const topicLine = opts.topic && opts.subject !== "mixed" ? `Focus specifically on this topic: ${opts.topic}.` : "";
        const prompt = `Write ${need} ORIGINAL multiple-choice questions for the IBA (University of Dhaka) MBA admission test.
${this._subjectBrief(part.subject)}
Difficulty: ${opts.difficulty || "IBA-level (moderately hard)"}. ${topicLine}
Rules:
- Exactly 4 options per question; exactly one is correct; distractors must be plausible (typical mistakes), never silly.
- Do NOT use options like "All of the above", "None of the above" or "Both A and B".
- Vary the topic across questions. Do not repeat earlier questions.
Return ONLY this JSON (keep the key order — explanation comes BEFORE correctOptionId so you work it out first):
{"questions":[{"prompt":"...","options":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."}],"explanation":"2-4 sentence worked solution / reasoning","correctOptionId":"a"}]}`;
        try {
          const parsed = await this.callJSON(prompt, [], { temperature: 0.7 });
          const list = Array.isArray(parsed) ? parsed : (parsed.questions || []);
          list.forEach(raw => {
            const q = this._normaliseQuestion(raw, part.subject);
            if (!q || got >= part.n) return;
            const key = q.prompt.toLowerCase().replace(/\s+/g, " ");
            if (seen.has(key)) return;
            seen.add(key); all.push(q); got++;
          });
        } catch (err) {
          lastError = err;
          if (/NO_API_KEY|BAD_API_KEY|MODEL_NOT_FOUND|NETWORK_ERROR|RATE_LIMIT|OVERLOADED|NO_BASE_URL/.test(err.message)) throw err;
        }
        if (typeof opts.onProgress === "function") opts.onProgress(all.length, total);
      }
    }
    if (all.length === 0) throw lastError || new Error("MALFORMED_RESPONSE: no usable questions came back.");
    all.forEach((q, i) => { q.id = "q" + (i + 1); });
    return all;
  },

  /* ---------- Import a real paper (PDF text or page images) ---------- */
  _cleanSubject(x) {
    const t = String(x || "").toLowerCase();
    if (/math|quant|arith|algebra|geom/.test(t)) return "math";
    if (/eng|verbal|grammar|vocab|compre/.test(t)) return "english";
    if (/analy|logic|reason|puzzle/.test(t)) return "analytical";
    return "mixed";
  },
  _letterFrom(x) {
    const t = String(x == null ? "" : x).trim().toLowerCase().replace(/[().\s]/g, "");
    if (/^[a-e]$/.test(t)) return t;
    if (/^[1-5]$/.test(t)) return String.fromCharCode(96 + Number(t));
    return "";
  },

  /* Faithful version of a transcribed question: NO shuffling, 2-5 options,
     answer may be unknown (null) until a key or the solver fills it in. */
  _normaliseImported(raw, forcedSubject) {
    if (!raw || typeof raw.prompt !== "string" || !raw.prompt.trim() || !Array.isArray(raw.options)) return null;
    const letters = ["a", "b", "c", "d", "e"];
    let opts = raw.options.map(o => (typeof o === "string" ? o : (o && o.text != null ? String(o.text) : ""))).map(t => t.trim()).filter(Boolean).slice(0, 5);
    if (opts.length < 2) return null;
    if (opts.every(t => /^\(?[A-Ea-e][\).:]\s+/.test(t))) opts = opts.map(t => t.replace(/^\(?[A-Ea-e][\).:]\s+/, ""));
    let ci = this._letterFrom(raw.correctOptionId != null ? raw.correctOptionId : raw.answer);
    ci = ci ? ci.charCodeAt(0) - 97 : -1;
    if (ci >= opts.length) ci = -1;
    const n = raw.number != null ? parseInt(raw.number, 10) : NaN;
    return {
      number: isFinite(n) ? n : null,
      subject: forcedSubject && forcedSubject !== "auto" ? forcedSubject : this._cleanSubject(raw.subject),
      prompt: raw.prompt.trim(),
      passage: typeof raw.passage === "string" && raw.passage.trim().length > 20 ? raw.passage.trim() : null,
      options: opts.map((t, i) => ({ id: letters[i], text: t })),
      correctOptionId: ci >= 0 ? letters[ci] : null,
      explanation: typeof raw.explanation === "string" ? raw.explanation.trim() : "",
      answerSource: ci >= 0 ? "answer_key" : null
    };
  },

  _importPrompt(batch) {
    const source = batch.images && batch.images.length
      ? `The attached image(s) are ${batch.label} of a multiple-choice admission-test paper (IBA MBA style). Read them carefully (they may be scans or photos).`
      : `The text below was extracted from ${batch.label} of a multiple-choice admission-test paper (IBA MBA style). Text extraction can scramble the layout, so use judgement to put each question back together.
===== START OF EXTRACTED TEXT =====
${batch.text}
===== END OF EXTRACTED TEXT =====`;
    return `${source}

Task: transcribe EVERY complete multiple-choice question that appears, in full and word-for-word.
Rules:
- Copy the question text and every option exactly as printed. Do not summarise, fix, or rewrite anything. Write maths in plain text (x^2, sqrt(x), 3/4, %, etc.).
- If several questions share a reading passage, table or set of conditions, copy that shared text in FULL into the "passage" field of EVERY question that depends on it (word-for-word, not summarised), and keep "prompt" as just the question itself. A question with no passage gets "passage": "".
- Skip a question if its options are cut off at the edge of the pages given (it will be captured in the next batch). Never invent options or questions.
- If a question needs a figure or diagram you cannot read, still transcribe the words and append " [figure not readable]".
- Use option ids a, b, c, d (e if there are five) in printed order, whatever labels the paper uses (A/B/C, 1/2/3, (i)/(ii)).
- "number" is the question number printed on the paper. "subject" is math, english or analytical (use the section heading if there is one).
- If, and only if, this content shows the correct answer for a question (an answer key table, "Ans: B", or a worked solution), put its letter in "correctOptionId". Otherwise leave "correctOptionId" as "". NEVER guess.
- If this content contains an answer-key table/list, also list its entries in "answerKey".

Return ONLY this JSON:
{"questions":[{"number":1,"subject":"math","passage":"","prompt":"...","options":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."}],"correctOptionId":"","explanation":""}],
 "answerKey":[{"subject":"math","number":1,"answer":"b"}]}
If there are no complete questions in this content, return {"questions":[],"answerKey":[]}.`;
  },

  /* batches: [{label, text?} | {label, images:[b64,...]}]
     opts: {subject: auto|math|english|analytical, max, solveMissing, onProgress(msg)}
     returns {questions, stats:{extracted, fromKey, solved, dropped, skippedBatches}} */
  async importQuestions(batches, opts) {
    opts = opts || {};
    const say = (m) => { if (typeof opts.onProgress === "function") opts.onProgress(m); };
    const FATAL = /NO_API_KEY|BAD_API_KEY|MODEL_NOT_FOUND|NETWORK_ERROR|RATE_LIMIT|OVERLOADED|NO_BASE_URL/;
    const norm = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const map = new Map();
    const keyList = [];
    let skippedBatches = 0;

    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      say(`Reading ${b.label} (${i + 1} of ${batches.length})… ${map.size} question${map.size === 1 ? "" : "s"} found so far`);
      let parsed = null, lastErr = null;
      for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
        try { parsed = await this.callJSON(this._importPrompt(b), b.images || [], { temperature: 0.1 }); }
        catch (err) { lastErr = err; if (FATAL.test(err.message)) throw err; }
      }
      if (!parsed) { skippedBatches++; continue; }
      const raws = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      raws.forEach(r => {
        const q = this._normaliseImported(r, opts.subject);
        if (!q) return;
        const pn = norm(q.prompt);
        const k = pn.slice(0, 50) + "|" + pn.slice(-50) + "|" + norm(q.options[0].text).slice(0, 30);
        const old = map.get(k);
        if (!old) map.set(k, q);
        else {
          if (q.options.length > old.options.length) { q.correctOptionId = q.correctOptionId || old.correctOptionId; q.answerSource = q.correctOptionId ? "answer_key" : null; map.set(k, q); }
          else if (!old.correctOptionId && q.correctOptionId) { old.correctOptionId = q.correctOptionId; old.answerSource = "answer_key"; }
          if (old.number == null && q.number != null) old.number = q.number;
          if (!old.passage && q.passage) old.passage = q.passage;
        }
      });
      (Array.isArray(parsed.answerKey) ? parsed.answerKey : []).forEach(k => keyList.push(k));
    }

    let list = Array.from(map.values());
    if (list.length === 0) throw new Error("NO_QUESTIONS: no complete multiple-choice questions were found in that file." + (skippedBatches ? " (Some pages could not be read — try again or use a different model.)" : ""));

    // Apply the paper's own answer key (authoritative over anything guessed).
    const bySN = {};
    keyList.forEach(k => {
      const l = this._letterFrom(k && k.answer), n = parseInt(k && k.number, 10);
      if (!l || !isFinite(n)) return;
      bySN[this._cleanSubject(k.subject) + "|" + n] = l;
    });
    list.forEach(q => {
      if (q.number == null) return;
      // Match on (section, number). Never on number alone: Math Q1 and English Q1 are different questions.
      const l = bySN[q.subject + "|" + q.number] || bySN["mixed|" + q.number] || "";
      if (l && l.charCodeAt(0) - 97 < q.options.length) { q.correctOptionId = l; q.answerSource = "answer_key"; }
    });

    if (opts.max && opts.max > 0) list = list.slice(0, opts.max);

    // Anything still without a key: ask the AI to solve it (clearly flagged).
    let solved = 0, dropped = 0;
    const missing = list.filter(q => !q.correctOptionId);
    if (missing.length && opts.solveMissing !== false) {
      for (let i = 0; i < missing.length; i += 6) {
        const chunk = missing.slice(i, i + 6);
        say(`No answer key for ${missing.length} question${missing.length === 1 ? "" : "s"} — asking the AI to solve them (${Math.min(i + 6, missing.length)}/${missing.length})…`);
        const payload = chunk.map((q, j) => ({ i: j, prompt: q.prompt, options: q.options }));
        const prompt = `Solve these IBA MBA admission-test multiple-choice questions. For each one, work out the answer step by step in "explanation" FIRST (brief), then give the correct option id. Double-check arithmetic and logic.
Questions: ${JSON.stringify(payload)}
Return ONLY: {"answers":[{"i":0,"explanation":"...","correctOptionId":"a"}]}`;
        try {
          const r = await this.callJSON(prompt, [], { temperature: 0.1 });
          (Array.isArray(r) ? r : (r.answers || [])).forEach(a => {
            const q = chunk[a && a.i];
            const l = this._letterFrom(a && a.correctOptionId);
            if (q && l && l.charCodeAt(0) - 97 < q.options.length) {
              q.correctOptionId = l; q.answerSource = "inferred";
              if (a.explanation && !q.explanation) q.explanation = String(a.explanation);
              solved++;
            }
          });
        } catch (err) { if (FATAL.test(err.message)) throw err; }
      }
    }
    const keyless = list.filter(q => !q.correctOptionId);
    dropped = 0;
    keyless.forEach(q => { q.answerSource = "unknown"; });   // kept: set the answer yourself in the preview

    list.forEach((q, i) => { q.id = "q" + (i + 1); });
    return {
      questions: list,
      stats: { extracted: list.length, unknown: keyless.length, withPassage: list.filter(q => q.passage).length, fromKey: list.filter(q => q.answerSource === "answer_key").length, solved: list.filter(q => q.answerSource === "inferred").length, dropped, skippedBatches }
    };
  },

  /* ---------- VIVA ---------- */
  _vivaFocusBrief(focus) {
    switch (focus) {
      case "personal": return "Personal & motivation questions: introduce yourself, academic/work background, strengths & weaknesses, why an MBA, why IBA/University of Dhaka, short- and long-term goals, a failure or conflict you handled.";
      case "business": return "Business & economy awareness: basic finance/marketing/management concepts, how a business you admire makes money, Bangladesh's economy (RMG, remittance, inflation, exchange rate, budget), startups and entrepreneurship.";
      case "situational": return "Situational / leadership / ethics questions: dilemmas, teamwork, handling a difficult boss, priorities under pressure, a business decision with trade-offs.";
      case "current": return "Current affairs: recent national and global developments that an MBA candidate should be able to discuss with an opinion.";
      default: return "A realistic mix: personal & motivation, business & economy awareness, one situational/ethics question, and one current-affairs question.";
    }
  },

  async generateVivaQuestions(opts) {
    const count = Math.max(3, Math.min(12, Number(opts.count) || 6));
    const profileLine = opts.profile ? `Candidate background (tailor personal questions to it, but stay realistic): ${opts.profile}` : "No candidate background was given — keep personal questions general.";
    const prompt = `You are a senior panelist at the IBA (University of Dhaka) MBA admission viva (interview).
Write ${count} distinct interview questions in the order a panel would realistically ask them (start easy, e.g. "tell us about yourself").
Focus: ${this._vivaFocusBrief(opts.focus)}
${profileLine}
For each question also list 3-4 "idealPoints": the key ideas a strong answer would cover (for personal questions, these are qualities of a good answer, not facts).
Return ONLY this JSON:
{"questions":[{"question":"...","category":"Personal | Business | Situational | Current Affairs","idealPoints":["...","...","..."]}]}`;
    const parsed = await this.callJSON(prompt, [], { temperature: 0.8 });
    const list = (Array.isArray(parsed) ? parsed : (parsed.questions || []))
      .filter(q => q && typeof q.question === "string" && q.question.trim())
      .map((q, i) => ({
        id: "v" + (i + 1),
        question: q.question.trim(),
        category: String(q.category || "General"),
        idealPoints: Array.isArray(q.idealPoints) ? q.idealPoints.map(String).slice(0, 5) : []
      }));
    if (list.length === 0) throw new Error("MALFORMED_RESPONSE: no viva questions came back.");
    return list;
  },

  /* Scores one spoken/typed answer like a strict-but-fair panelist. */
  async evaluateVivaAnswer(item, answer, profile) {
    const prompt = `You are a strict but fair panelist at the IBA (University of Dhaka) MBA admission viva.
Question asked: "${item.question}"
Points a strong answer would cover: ${JSON.stringify(item.idealPoints || [])}
${profile ? `Candidate background: ${profile}` : ""}
The candidate's answer:
"""
${answer}
"""
Grade it out of 10 on relevance, depth/specific examples, structure and clarity, and concision (a good viva answer is roughly 30-90 seconds spoken). Be honest: vague, generic or off-topic answers score under 5; do not inflate. For personal questions don't penalise for facts you can't verify.
Return ONLY this JSON:
{"score": 0-10 (number, one decimal allowed), "verdict": "one sentence overall impression", "strengths": ["..."], "improvements": ["specific, actionable"], "modelAnswer": "a concise strong sample answer (3-6 sentences) in first person that they could adapt"}`;
    const r = await this.callJSON(prompt, [], { temperature: 0.4 });
    let score = Number(r.score);
    if (!isFinite(score)) throw new Error("MALFORMED_RESPONSE: viva feedback had no score.");
    score = Math.max(0, Math.min(10, score));
    return {
      score,
      verdict: String(r.verdict || ""),
      strengths: Array.isArray(r.strengths) ? r.strengths.map(String) : [],
      improvements: Array.isArray(r.improvements) ? r.improvements.map(String) : [],
      modelAnswer: String(r.modelAnswer || "")
    };
  },

  /* ---------- Vocabulary ---------- */
  /* One real vocabulary item: definition, synonyms, example, and a 4-option
     MCQ whose correct option is re-shuffled client-side. */
  async generateVocabItem(word) {
    const prompt = `You are helping a student prepare vocabulary for the IBA (University of Dhaka) MBA admission test.
Word: "${word}"

Return ONLY valid JSON, no markdown fences, in exactly this shape:
{
  "word": "${word}",
  "pronunciation": "a simple respelling like /wurd/",
  "definition": "one clear, specific dictionary-style definition (not generic filler)",
  "synonyms": ["syn1", "syn2", "syn3"],
  "example": "one natural, original example sentence using the word correctly",
  "quiz": {
    "question": "Which word or phrase is closest in meaning to \\"${word}\\"?",
    "options": [
      {"id": "a", "text": "..."},
      {"id": "b", "text": "..."},
      {"id": "c", "text": "..."},
      {"id": "d", "text": "..."}
    ],
    "correctOptionId": "a"
  }
}

Rules:
- Exactly one option is correct; the other three are plausible but wrong (near-synonyms of unrelated words, opposite meanings, or common mix-ups) — never silly.
- The definition and example must be specific to this exact word, not a reusable template.`;
    const parsed = await this.callJSON(prompt, [], { temperature: 0.7 });
    const q = parsed && parsed.quiz;
    if (!q || !Array.isArray(q.options) || q.options.length < 4) throw new Error("MALFORMED_RESPONSE: quiz options missing.");
    const norm = this._normaliseQuestion({ prompt: q.question || "", options: q.options, correctOptionId: q.correctOptionId }, "english");
    if (!norm) throw new Error("MALFORMED_RESPONSE: quiz answer key was unusable.");
    parsed.quiz = { question: q.question || `Which word or phrase is closest in meaning to "${word}"?`, options: norm.options, correctOptionId: norm.correctOptionId };
    if (!parsed.word) parsed.word = word;
    return parsed;
  },

  /* Reads uploaded images (photos/scans of a question paper) and returns
     structured MCQs, transcribing real questions faithfully. Needs a
     vision-capable model (Gemini, gpt-4o-mini, etc.). */
  async generateQuestionsFromImages(imageBase64List, subjectHint, count) {
    const prompt = `The attached image(s) show pages of an admission-test-style question paper (subject focus: ${subjectHint || "mixed Math/English/Analytical"}).
If the images contain real multiple-choice questions (with visible options and, if present, an answer key), transcribe up to ${count} of them faithfully, exactly as written, and use the visible answer key for correctOptionId.
If no clear answer key is visible for a question, work out the correct answer yourself and set "answerSource":"inferred" on that question (otherwise "answerSource":"answer_key").
If the images are unreadable or contain no such questions, invent ${count} new original IBA-admission-style questions on the same subject instead, and mark "answerSource":"generated" on each.

Return ONLY valid JSON, no markdown fences:
{
  "questions": [
    {
      "id": "q1",
      "subject": "math" | "english" | "analytical",
      "prompt": "the question text",
      "options": [{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."},{"id":"e","text":"..."}],
      "correctOptionId": "a",
      "explanation": "one or two sentences on why that's correct",
      "answerSource": "answer_key" | "inferred" | "generated"
    }
  ]
}
Include as many options as the original question had (4 or 5); do not pad with fake options.`;
    const parsed = await this.callJSON(prompt, imageBase64List, { temperature: 0.3 });
    const list = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(list) || list.length === 0) throw new Error("MALFORMED_RESPONSE: no questions returned.");
    return list.map((q, i) => Object.assign({ id: "q" + (i + 1), subject: "mixed" }, q, { id: "q" + (i + 1) }));
  }
};

/* Text-to-speech for pronunciation and VIVA questions. Uses the browser's
   built-in speechSynthesis — no API key or network call needed. */
const Speech = {
  speak(text) {
    if (!("speechSynthesis" in window)) return false;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.92;
      window.speechSynthesis.speak(utter);
      return true;
    } catch (e) { return false; }
  },
  stop() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
};
