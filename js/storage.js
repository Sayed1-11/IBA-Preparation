/* ==========================================================================
   storage.js
   All localStorage read/write happens here. Everything else in the app
   reads/writes through the AppState object and calls Storage.save().
   ========================================================================== */

const STORAGE_KEY = "iba_mba_prep_v1";

function defaultState() {
  return {
    version: 1,
    settings: {
      examDate: "",            // optional ISO date string
      startDate: "",           // optional ISO date string; if set, Day X is derived from it
      dailyHours: 3,
      preferredTime: "evening",
      questionTarget: 20,
      vocabTarget: 25,
      darkMode: false,
      geminiApiKey: "",        // LEGACY single-key field — migrated into apiKeys on load, kept only for old saves
      geminiModel: "",         // LEGACY — migrated into models on load
      aiProvider: "gemini",    // gemini | openai | groq | openrouter | mistral | llm7 | custom
      apiKeys: {},             // { providerId: "key" } — one key per provider, so switching never overwrites another
      models: {},              // { providerId: "model-name" }
      customBaseUrl: ""        // only used when aiProvider === "custom"
    },
    currentDayPointer: 1,       // used only when startDate is not set
    completedTaskIds: {},       // { "t123": true }
    dayFullyCompleted: {},      // { "5": true } — day number -> bool
    movedTasks: {},             // { taskId: { fromDay, toDay } } — catch-up relocations
    injectedTasks: {},          // { "5": [task, ...] } — adaptive weak-topic tasks merged into a day by adaptTodayTasks()
    streak: { current: 0, best: 0, lastCompletedDay: null },
    books: {},                  // { bookId: { chaptersCompleted, totalChapters, progressPct, notes } }
    topicStatus: {},            // { "Ratio & Proportion": "weak" | "average" | "strong" }
    errorLog: [],               // [{id, question, subject, topic, book, date, mistake, correctMethod, difficulty, status}]
    mockTests: [],               // [{id, name, date, score, total, timeTaken, english, math, analytical, di, mistakes, weakAreas, notes}]
    notes: [],                   // [{id, category, title, body, date}]
    questionsSolved: 0,
    vocabWordsLearned: 0,
    vocabMastery: {},           // { "Abate": { data: <cached Gemini item>, mastered: bool, misses: 0 } } — caches AI output so words aren't re-fetched every time
    vivaSessions: [],           // [{id, date, focus, count, avgScore, items:[{question, category, answer, score, skipped}]}]
    vivaProfile: "",            // optional "about me" text used to tailor VIVA questions
    importedPapers: []          // [{id,name,date,stats,questions:[...]}] — papers imported from PDF/photos, re-takeable any time
  };
}

const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // Merge with defaults so new fields added later don't break old saves
      const merged = Object.assign(defaultState(), parsed, {
        settings: Object.assign(defaultState().settings, parsed.settings || {})
      });
      // Migrate the old single key/model into the per-provider maps (once).
      const st = merged.settings;
      st.apiKeys = st.apiKeys || {}; st.models = st.models || {};
      const prov = st.aiProvider || "gemini";
      if (st.geminiApiKey && !st.apiKeys[prov]) st.apiKeys[prov] = st.geminiApiKey;
      if (st.geminiModel && !st.models[prov] && prov !== "gemini") st.models[prov] = st.geminiModel;
      if (st.geminiModel && !st.models[prov] && prov === "gemini") st.models[prov] = st.geminiModel;
      st.geminiApiKey = "";
      return merged;
    } catch (e) {
      console.error("Failed to load saved progress, starting fresh.", e);
      return defaultState();
    }
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error("Failed to save progress.", e);
      return false;
    }
  },
  reset() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
