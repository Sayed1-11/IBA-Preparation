/* ==========================================================================
   planner.js
   Pure(ish) logic that sits between the raw data (data.js), the saved
   state (storage.js) and the UI (ui.js): current-day calculation,
   progress percentages, streaks, catch-up redistribution, weak topics.
   ========================================================================== */

const Planner = {

  ALL_DAYS: null, // populated once at startup

  init(days) {
    this.ALL_DAYS = days;
  },

  getDay(dayNumber) {
    return this.ALL_DAYS.find(d => d.day === dayNumber) || null;
  },

  /* Effective task list for a day, accounting for tasks that were moved
     into or out of it by the catch-up system, plus any AI-adaptive
     weak-topic tasks injected by adaptTodayTasks(). */
  tasksForDay(dayNumber, state) {
    const day = this.getDay(dayNumber);
    if (!day) return [];
    let tasks = day.tasks.filter(t => {
      const moved = state.movedTasks[t.id];
      return !(moved && moved.toDay !== dayNumber); // hide if moved away
    });
    // Bring in tasks moved INTO this day from elsewhere
    Object.keys(state.movedTasks).forEach(taskId => {
      const move = state.movedTasks[taskId];
      if (move.toDay === dayNumber && move.fromDay !== dayNumber) {
        const originDay = this.getDay(move.fromDay);
        const t = originDay && originDay.tasks.find(x => x.id === taskId);
        if (t && !tasks.find(x => x.id === taskId)) tasks.push(Object.assign({}, t, { movedFrom: move.fromDay }));
      }
    });
    // Bring in adaptive tasks injected for this day
    const injected = (state.injectedTasks && state.injectedTasks[dayNumber]) || [];
    injected.forEach(t => { if (!tasks.find(x => x.id === t.id)) tasks.push(t); });
    return tasks;
  },

  isTaskCompleted(taskId, state) {
    return !!state.completedTaskIds[taskId];
  },

  dayCompletionPct(dayNumber, state) {
    const tasks = this.tasksForDay(dayNumber, state);
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => this.isTaskCompleted(t.id, state)).length;
    return Math.round((done / tasks.length) * 100);
  },

  isDayFullyComplete(dayNumber, state) {
    return this.dayCompletionPct(dayNumber, state) === 100;
  },

  /* Current day: derived from settings.startDate if set, else the
     manual pointer the user advances themselves. Always clamped 1-100. */
  currentDay(state) {
    if (state.settings.startDate) {
      const start = new Date(state.settings.startDate + "T00:00:00");
      const today = new Date();
      const diffDays = Math.floor((today - start) / 86400000) + 1;
      return Math.min(100, Math.max(1, diffDays));
    }
    return Math.min(100, Math.max(1, state.currentDayPointer));
  },

  dateForDay(dayNumber, state) {
    if (!state.settings.startDate) return "Date placeholder";
    const start = new Date(state.settings.startDate + "T00:00:00");
    const d = new Date(start.getTime() + (dayNumber - 1) * 86400000);
    return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  },

  overallProgress(state) {
    let totalTasks = 0, doneTasks = 0;
    this.ALL_DAYS.forEach(day => {
      const tasks = this.tasksForDay(day.day, state);
      totalTasks += tasks.length;
      doneTasks += tasks.filter(t => this.isTaskCompleted(t.id, state)).length;
    });
    return totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  },

  subjectProgress(subjectKey, state) {
    let total = 0, done = 0;
    this.ALL_DAYS.forEach(day => {
      this.tasksForDay(day.day, state).forEach(t => {
        if (t.subject === subjectKey) {
          total++;
          if (this.isTaskCompleted(t.id, state)) done++;
        }
      });
    });
    return total === 0 ? 0 : Math.round((done / total) * 100);
  },

  daysCompletedCount(state) {
    return this.ALL_DAYS.filter(d => this.isDayFullyComplete(d.day, state)).length;
  },

  /* Call after any task toggle to keep the streak accurate. A day only
     counts toward the streak once ALL of its tasks are complete. */
  recalcStreak(state) {
    let current = 0;
    let best = state.streak.best || 0;
    // Walk from day 1 upward counting consecutive fully-completed days
    // starting from the most recent fully completed day backward.
    let streakRun = 0;
    for (let d = 1; d <= 100; d++) {
      if (this.isDayFullyComplete(d, state)) {
        streakRun++;
        best = Math.max(best, streakRun);
      } else {
        streakRun = 0;
      }
    }
    // Current streak = trailing run ending at the latest completed day
    let d = this.currentDay(state);
    while (d >= 1 && this.isDayFullyComplete(d, state)) {
      current++;
      d--;
    }
    state.streak.current = current;
    state.streak.best = best;
    return state.streak;
  },

  /* Weak topics pulled from stored topicStatus, grouped by which
     curriculum subject they belong to. */
  weakTopics(state) {
    const bySubject = { math: [], english: [], analytical: [] };
    Object.keys(state.topicStatus).forEach(topic => {
      if (state.topicStatus[topic] !== "weak") return;
      Object.keys(CURRICULUM).forEach(subjectKey => {
        if (CURRICULUM[subjectKey].topics.some(t => t.name === topic)) {
          bySubject[subjectKey].push(topic);
        }
      });
    });
    return bySubject;
  },

  allTopicsWithStatus(state) {
    const list = [];
    Object.keys(CURRICULUM).forEach(subjectKey => {
      CURRICULUM[subjectKey].topics.forEach(t => {
        list.push({
          subject: subjectKey,
          name: t.name,
          books: t.books,
          status: state.topicStatus[t.name] || "average"
        });
      });
    });
    return list;
  },

  /* CATCH-UP: find incomplete tasks in days strictly before `fromDay`
     (default: current day) that are not already moved, and propose
     moving them into the next available slots in Days 1-90 (never into
     the protected Days 91-100 revision block), spreading no more than
     `maxPerDay` extra tasks onto any single future day. */
  buildCatchUpPlan(state, maxPerDay) {
    maxPerDay = maxPerDay || 2;
    const today = this.currentDay(state);
    const overdue = [];
    for (let d = 1; d < today; d++) {
      this.tasksForDay(d, state).forEach(t => {
        if (!this.isTaskCompleted(t.id, state)) overdue.push({ task: t, fromDay: d });
      });
    }
    if (overdue.length === 0) return { overdueCount: 0, moves: [] };

    // Count how many tasks are already scheduled on each future day
    const loadByDay = {};
    for (let d = today; d <= 90; d++) {
      loadByDay[d] = this.tasksForDay(d, state).length;
    }
    const baselineLoad = {};
    Object.keys(loadByDay).forEach(d => { baselineLoad[d] = loadByDay[d]; });

    const moves = [];
    let cursor = today;
    overdue.forEach(item => {
      // find next day with room (fewer than baseline + maxPerDay tasks added so far)
      let attempts = 0;
      while (attempts < 200) {
        const added = loadByDay[cursor] - baselineLoad[cursor];
        if (cursor <= 90 && added < maxPerDay) {
          moves.push({ taskId: item.task.id, fromDay: item.fromDay, toDay: cursor });
          loadByDay[cursor] = (loadByDay[cursor] || 0) + 1;
          break;
        }
        cursor++;
        if (cursor > 90) cursor = today;
        attempts++;
      }
    });
    return { overdueCount: overdue.length, moves };
  },

  applyCatchUpPlan(state, moves) {
    moves.forEach(m => {
      state.movedTasks[m.taskId] = { fromDay: m.fromDay, toDay: m.toDay };
    });
  },

  /* Search across books, topics, tasks, subjects, notes, error log */
  search(query, state) {
    const q = query.trim().toLowerCase();
    if (!q) return { books: [], topics: [], days: [], notes: [], errors: [] };
    const books = BOOKS.filter(b => b.name.toLowerCase().includes(q) || b.purpose.toLowerCase().includes(q));
    const topics = this.allTopicsWithStatus(state).filter(t => t.name.toLowerCase().includes(q));
    const days = this.ALL_DAYS.filter(d =>
      d.goal.toLowerCase().includes(q) ||
      d.tasks.some(t => (t.topic || "").toLowerCase().includes(q))
    ).slice(0, 20);
    const notes = state.notes.filter(n => (n.title + " " + n.body).toLowerCase().includes(q));
    const errors = state.errorLog.filter(e => (e.question + " " + e.topic + " " + e.subject).toLowerCase().includes(q));
    return { books, topics, days, notes, errors };
  },

  /* Grades a completed AI-generated/uploaded mock test. answers is
     { questionId: selectedOptionId }. Returns overall score plus a
     per-subject breakdown, and flags any subject scoring below 60%. */
  gradeMockAnswers(questions, answers) {
    const bySubject = {}; // subject -> {correct, total}
    let correct = 0;
    const results = questions.map(q => {
      const chosen = answers[q.id] || null;
      const isCorrect = chosen === q.correctOptionId;
      if (isCorrect) correct++;
      const subj = q.subject || "mixed";
      bySubject[subj] = bySubject[subj] || { correct: 0, total: 0 };
      bySubject[subj].total++;
      if (isCorrect) bySubject[subj].correct++;
      return { question: q, chosen, isCorrect };
    });
    const weakSubjects = Object.keys(bySubject).filter(s => {
      const b = bySubject[s];
      return b.total > 0 && (b.correct / b.total) < 0.6;
    });
    return {
      total: questions.length, correct, percent: questions.length ? Math.round(correct / questions.length * 100) : 0,
      bySubject, weakSubjects, results
    };
  },

  /* Dynamic Task Adaptation: after a mock test, any subject scoring
     below 60% gets its topics marked Weak (feeding the existing Weak
     Topics system) and a focused review task injected into TODAY's
     plan — so the schedule pivots immediately rather than waiting for
     the next scheduled review day. Returns the list of injected tasks. */
  adaptTodayTasks(state, gradeResult) {
    const today = this.currentDay(state);
    state.injectedTasks[today] = state.injectedTasks[today] || [];
    const added = [];
    gradeResult.weakSubjects.forEach(subjectKey => {
      const subj = CURRICULUM[subjectKey];
      if (subj) {
        // Mark a couple of this subject's topics Weak so they surface on the Weak Topics page too
        subj.topics.slice(0, 2).forEach(t => { state.topicStatus[t.name] = "weak"; });
      }
      const already = state.injectedTasks[today].some(t => t.__adaptiveSubject === subjectKey);
      if (already) return;
      const task = {
        id: "adapt" + Date.now() + "_" + subjectKey,
        subject: subjectKey, topic: "Adaptive review (mock test result)",
        book: "GMAT Official Guide", type: "weak", duration: 30, questionTarget: 15,
        note: `Injected automatically: your last mock scored under 60% in ${subjectKey}. Extra focused practice added to today's plan.`,
        __adaptiveSubject: subjectKey
      };
      state.injectedTasks[today].push(task);
      added.push(task);
    });
    return added;
  }
};
