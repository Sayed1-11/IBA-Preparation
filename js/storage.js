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
      darkMode: false
    },
    currentDayPointer: 1,       // used only when startDate is not set
    completedTaskIds: {},       // { "t123": true }
    dayFullyCompleted: {},      // { "5": true } — day number -> bool
    movedTasks: {},             // { taskId: { fromDay, toDay } } — catch-up relocations
    streak: { current: 0, best: 0, lastCompletedDay: null },
    books: {},                  // { bookId: { chaptersCompleted, totalChapters, progressPct, notes } }
    topicStatus: {},            // { "Ratio & Proportion": "weak" | "average" | "strong" }
    errorLog: [],               // [{id, question, subject, topic, book, date, mistake, correctMethod, difficulty, status}]
    mockTests: [],               // [{id, name, date, score, total, timeTaken, english, math, analytical, di, mistakes, weakAreas, notes}]
    notes: [],                   // [{id, category, title, body, date}]
    questionsSolved: 0,
    vocabWordsLearned: 0
  };
}

const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // Merge with defaults so new fields added later don't break old saves
      return Object.assign(defaultState(), parsed, {
        settings: Object.assign(defaultState().settings, parsed.settings || {})
      });
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
