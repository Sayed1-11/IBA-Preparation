/* ==========================================================================
   ui.js
   Renders every page from AppState + Planner, and wires up the
   interactive bits (checkboxes, forms, modal, search) that mutate
   AppState and persist it via Storage.
   ========================================================================== */

const UI = {

  esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },

  toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  },

  persist() {
    Storage.save(AppState);
  },

  refreshChrome() {
    const day = Planner.currentDay(AppState);
    document.getElementById("topbarDay").textContent = `Day ${day} / 100`;
  },

  /* ---------------- shared: task rows ---------------- */
  taskRowHtml(task, dayNumber) {
    const done = Planner.isTaskCompleted(task.id, AppState);
    const typeLabel = TASK_TYPE_LABELS[task.type] || task.type;
    const movedTag = task.movedFrom ? `<span class="task-type-chip" title="Moved from Day ${task.movedFrom}">Moved from Day ${task.movedFrom}</span>` : "";
    const matchedBooks = booksForDisplayString(task.book).filter(b => b.file);
    const bookLinksHtml = matchedBooks.length
      ? `<div class="task-book-links">${matchedBooks.map(b =>
          `<a class="task-book-link" href="${this.esc(b.file)}" target="_blank" rel="noopener" data-book-open="${b.id}">📖 Open ${this.esc(b.name)}</a>`
        ).join("")}</div>`
      : "";
    return `
    <div class="task-row ${done ? "done" : ""}" data-task-id="${task.id}" data-day="${dayNumber}">
      <button class="task-checkbox ${done ? "checked" : ""}" data-toggle-task="${task.id}" data-toggle-day="${dayNumber}" aria-label="Toggle task complete">${done ? "✓" : ""}</button>
      <div class="task-main">
        <div class="task-title">${this.esc(task.topic || (SUBJECTS[task.subject.toUpperCase()] || {}).name || "Task")}</div>
        <div class="task-meta">${this.esc(task.book || "")}${task.book ? " · " : ""}${task.duration} min${task.questionTarget ? " · " + task.questionTarget + " questions" : ""} ${movedTag}</div>
        ${task.note ? `<div class="task-note">${this.esc(task.note)}</div>` : ""}
        ${bookLinksHtml}
      </div>
      <span class="task-type-chip">${this.esc(typeLabel)}</span>
    </div>`;
  },

  bindTaskToggles(container) {
    container.querySelectorAll("[data-toggle-task]").forEach(btn => {
      btn.addEventListener("click", () => {
        const taskId = btn.getAttribute("data-toggle-task");
        const day = Number(btn.getAttribute("data-toggle-day"));
        this.toggleTask(taskId, day);
      });
    });
    container.querySelectorAll("[data-book-open]").forEach(link => {
      link.addEventListener("click", (e) => {
        e.stopPropagation();
        this.checkBookLink(link);
      });
    });
  },

  checkBookLink(link) {
    const href = link.getAttribute("href");
    if (/^https?:\/\//i.test(href)) return; // external (e.g. Drive) — browser navigation handles it, no CORS-safe check possible
    try {
      fetch(href, { method: "HEAD" }).then(r => {
        if (!r.ok) this.toast("PDF not found in assets/books/ yet — check the filename.");
      }).catch(() => {});
    } catch (err) { /* fetch unavailable — let the browser's own navigation handle it */ }
  },

  toggleTask(taskId, dayNumber) {
    const wasDone = !!AppState.completedTaskIds[taskId];
    if (wasDone) {
      delete AppState.completedTaskIds[taskId];
    } else {
      AppState.completedTaskIds[taskId] = true;
      AppState.questionsSolved += 0; // question counts are entered via mock/error/practice logs, not auto-guessed
    }
    const nowFull = Planner.isDayFullyComplete(dayNumber, AppState);
    AppState.dayFullyCompleted[dayNumber] = nowFull;
    Planner.recalcStreak(AppState);
    this.persist();
    this.renderCurrentPage();
    this.refreshChrome();
  },

  /* ==================== DASHBOARD ==================== */
  renderDashboard() {
    const el = document.getElementById("page-dashboard");
    const day = Planner.currentDay(AppState);
    const overall = Planner.overallProgress(AppState);
    const todayPct = Planner.dayCompletionPct(day, AppState);
    const streak = Planner.recalcStreak(AppState);
    const weak = Planner.weakTopics(AppState);
    const weakFlat = [].concat(weak.math, weak.english, weak.analytical);
    const todayDay = Planner.getDay(day);
    const latestMock = AppState.mockTests[AppState.mockTests.length - 1];
    const quote = MOTIVATION_MESSAGES[day % MOTIVATION_MESSAGES.length];
    const booksCompleted = Object.values(AppState.books).filter(b => b.progressPct >= 100).length;

    el.innerHTML = `
      <div class="hero">
        <div class="hero-left">
          <h1>Your IBA/MBA Preparation</h1>
          <div class="hero-day">Day ${day} <span style="font-size:16px;color:#B9C6E6;">/ 100</span></div>
          <div class="hero-remaining">${100 - day} days remaining · ${todayDay ? todayDay.phase : ""}</div>
        </div>
        <div class="hero-progress">
          <div class="pct">${overall}%</div>
          <div class="progress-track"><div class="progress-fill" style="width:${overall}%"></div></div>
          <div class="hero-remaining">Overall plan progress</div>
        </div>
      </div>

      <div class="grid grid-3">
        <div class="card"><h3>Mathematics</h3><div class="big-number">${Planner.subjectProgress("math", AppState)}%</div>
          <div class="progress-track"><div class="progress-fill" style="width:${Planner.subjectProgress("math", AppState)}%"></div></div></div>
        <div class="card"><h3>English</h3><div class="big-number">${Planner.subjectProgress("english", AppState)}%</div>
          <div class="progress-track"><div class="progress-fill green" style="width:${Planner.subjectProgress("english", AppState)}%"></div></div></div>
        <div class="card"><h3>Analytical</h3><div class="big-number">${Planner.subjectProgress("analytical", AppState)}%</div>
          <div class="progress-track"><div class="progress-fill purple" style="width:${Planner.subjectProgress("analytical", AppState)}%"></div></div></div>
      </div>

      <div class="grid grid-4" style="margin-top:16px;">
        <div class="card"><h3>Current Streak</h3><div class="big-number">${streak.current}</div><div class="label-sm">days · best ${streak.best}</div></div>
        <div class="card"><h3>Days Completed</h3><div class="big-number">${Planner.daysCompletedCount(AppState)}</div><div class="label-sm">of 100</div></div>
        <div class="card"><h3>Books Tracked</h3><div class="big-number">${booksCompleted}/${BOOKS.length}</div><div class="label-sm">marked complete</div></div>
        <div class="card"><h3>Mock Tests</h3><div class="big-number">${AppState.mockTests.length}</div><div class="label-sm">recorded</div></div>
      </div>

      <div class="grid grid-2" style="margin-top:16px;">
        <div class="card">
          <h3>Today — Day ${day}</h3>
          <div class="stat-row" style="margin-top:8px;">
            <div class="big-number" style="font-size:24px;">${todayPct}%</div>
            <span class="label-sm">of today's tasks complete</span>
          </div>
          <div class="progress-track"><div class="progress-fill green" style="width:${todayPct}%"></div></div>
          <p style="margin-top:12px;font-size:13px;color:var(--text-2);">${todayDay ? this.esc(todayDay.goal) : ""}</p>
          <div style="margin-top:14px;"><button class="btn btn-primary" data-goto="today">Open Today's Plan</button></div>
        </div>
        <div class="card">
          <h3>Weak Topics</h3>
          ${weakFlat.length === 0
            ? `<p style="font-size:13px;color:var(--text-3);margin-top:8px;">None marked yet — visit Subjects to rate topics as you study.</p>`
            : `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">${weakFlat.slice(0, 10).map(t => `<span class="badge weak">${this.esc(t)}</span>`).join("")}</div>`}
          <div style="margin-top:14px;"><button class="btn" data-goto="weak">View Weak Topics</button></div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:16px;">
        <div class="card">
          <h3>Recent Mock Test</h3>
          ${latestMock
            ? `<div class="big-number" style="font-size:22px;margin-top:6px;">${latestMock.score}/${latestMock.total} (${Math.round(latestMock.score / latestMock.total * 100)}%)</div>
               <div class="label-sm">${this.esc(latestMock.name)} · ${this.esc(latestMock.date)}</div>`
            : `<p style="font-size:13px;color:var(--text-3);margin-top:8px;">No mock tests recorded yet.</p>`}
          <div style="margin-top:14px;"><button class="btn" data-goto="mocks">Mock Test Center</button></div>
        </div>
        <div class="card">
          <h3>Quick Actions</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
            <button class="btn btn-sm" data-goto="errors">+ Error Log</button>
            <button class="btn btn-sm" data-goto="notes">+ Note</button>
            <button class="btn btn-sm" data-goto="roadmap">Open Roadmap</button>
            <button class="btn btn-sm" data-action="catchup">Catch Up</button>
          </div>
        </div>
      </div>

      <p class="motivation-line">${this.esc(quote)}</p>
    `;
    this.bindGoto(el);
    el.querySelector('[data-action="catchup"]').addEventListener("click", () => this.openCatchUpModal());
  },

  bindGoto(container) {
    container.querySelectorAll("[data-goto]").forEach(btn => {
      btn.addEventListener("click", () => App.navigate(btn.getAttribute("data-goto")));
    });
  },

  /* ==================== TODAY ==================== */
  renderToday() {
    const el = document.getElementById("page-today");
    const day = Planner.currentDay(AppState);
    const dayObj = Planner.getDay(day);
    const tasks = Planner.tasksForDay(day, AppState);
    const pct = Planner.dayCompletionPct(day, AppState);
    const totalMinutes = tasks.reduce((s, t) => s + t.duration, 0);
    const qTarget = tasks.reduce((s, t) => s + (t.questionTarget || 0), 0);
    const vocabTask = tasks.find(t => t.subject === "vocab");
    const canAdvance = pct === 100 && day < 100;

    el.innerHTML = `
      <div class="page-head">
        <h1>Today — Day ${day} / 100</h1>
        <div class="sub">${this.esc(Planner.dateForDay(day, AppState))} · ${this.esc(dayObj ? dayObj.phase : "")} ${dayObj && dayObj.isRevision ? '<span class="badge revision">Revision Mode</span>' : ""}</div>
      </div>

      <div class="card" style="margin-bottom:18px;">
        <h3>Today's Goal</h3>
        <p style="font-family:var(--font-serif);font-size:17px;margin-top:8px;">${dayObj ? this.esc(dayObj.goal) : ""}</p>
        <div class="grid grid-3" style="margin-top:16px;">
          <div><div class="label-sm">Estimated time</div><div class="big-number" style="font-size:20px;">${totalMinutes} min</div></div>
          <div><div class="label-sm">Question target</div><div class="big-number" style="font-size:20px;">${qTarget}</div></div>
          <div><div class="label-sm">Vocabulary target</div><div class="big-number" style="font-size:20px;">${vocabTask ? vocabTask.questionTarget : 0} words</div></div>
        </div>
      </div>

      <h2 class="section-title">Study Blocks</h2>
      <div id="todayTasks"></div>

      <div class="card" style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <div class="label-sm">Progress</div>
          <div class="big-number" style="font-size:22px;">${tasks.filter(t => Planner.isTaskCompleted(t.id, AppState)).length} / ${tasks.length} completed</div>
          <div class="progress-track" style="width:220px;"><div class="progress-fill green" style="width:${pct}%"></div></div>
        </div>
        <button class="btn btn-primary" id="completeTodayBtn" ${day >= 100 ? "disabled" : ""}>${canAdvance ? "Complete Today's Plan →" : "Mark all tasks to complete"}</button>
      </div>
    `;
    const tasksContainer = document.getElementById("todayTasks");
    tasksContainer.innerHTML = tasks.map(t => this.taskRowHtml(t, day)).join("") || `<div class="empty-state"><h3>Nothing scheduled</h3><p>No tasks found for this day.</p></div>`;
    this.bindTaskToggles(tasksContainer);

    const completeBtn = document.getElementById("completeTodayBtn");
    completeBtn.addEventListener("click", () => {
      if (pct < 100) { this.toast("Complete all of today's tasks first."); return; }
      if (!AppState.settings.startDate && day < 100) {
        AppState.currentDayPointer = day + 1;
        this.persist();
        this.toast(`Day ${day} complete. Advanced to Day ${day + 1}.`);
        this.renderCurrentPage();
        this.refreshChrome();
      } else {
        this.toast("Day complete. Progress saved.");
      }
    });
  },

  /* ==================== ROADMAP ==================== */
  renderRoadmap() {
    const el = document.getElementById("page-roadmap");
    const today = Planner.currentDay(AppState);
    el.innerHTML = `
      <div class="page-head">
        <h1>100-Day Plan</h1>
        <div class="sub">Click any day to see its full task list. Days 91–100 are protected revision days.</div>
      </div>
      <div class="filter-bar">
        <button class="btn btn-sm" data-action="catchup">Catch Up / Adjust Schedule</button>
      </div>
      <div class="roadmap-grid" id="roadmapGrid"></div>
      <div class="legend">
        <span><span class="dot" style="background:var(--green-600);"></span>Completed</span>
        <span><span class="dot" style="background:var(--navy-900);"></span>Today</span>
        <span><span class="dot" style="background:var(--text-3);"></span>Upcoming</span>
        <span><span class="dot" style="background:var(--red-600);"></span>Missed</span>
        <span><span class="dot" style="background:var(--purple-600);"></span>Revision</span>
      </div>
    `;
    const grid = document.getElementById("roadmapGrid");
    let html = "";
    for (let d = 1; d <= 100; d++) {
      const dayObj = Planner.getDay(d);
      const complete = Planner.isDayFullyComplete(d, AppState);
      let cls = "upcoming";
      if (dayObj && dayObj.isRevision) cls = "revision";
      if (complete) cls = "completed";
      else if (d === today) cls = "today";
      else if (d < today) cls = "missed";
      html += `<button class="roadmap-cell ${cls}" data-day="${d}" title="Day ${d}${dayObj && dayObj.isRevision ? " — Revision" : ""}">${d}</button>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll("[data-day]").forEach(cell => {
      cell.addEventListener("click", () => this.openDayModal(Number(cell.getAttribute("data-day"))));
    });
    el.querySelector('[data-action="catchup"]').addEventListener("click", () => this.openCatchUpModal());
  },

  openDayModal(dayNumber) {
    const dayObj = Planner.getDay(dayNumber);
    if (!dayObj) return;
    const tasks = Planner.tasksForDay(dayNumber, AppState);
    const pct = Planner.dayCompletionPct(dayNumber, AppState);
    document.getElementById("modalTitle").textContent = `Day ${dayNumber} — ${dayObj.phase}`;
    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <p style="color:var(--text-2);font-size:13.5px;margin-bottom:4px;">${this.esc(Planner.dateForDay(dayNumber, AppState))}</p>
      <p style="font-family:var(--font-serif);font-size:16px;margin-bottom:14px;">${this.esc(dayObj.goal)}</p>
      <div class="progress-track" style="margin-bottom:14px;"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div id="modalTasks">${tasks.map(t => this.taskRowHtml(t, dayNumber)).join("")}</div>
    `;
    this.bindTaskToggles(body);
    this.showModal();
  },

  showModal() { document.getElementById("modalOverlay").hidden = false; },
  hideModal() { document.getElementById("modalOverlay").hidden = true; },

  /* ---------------- Catch-up ---------------- */
  openCatchUpModal() {
    const plan = Planner.buildCatchUpPlan(AppState, 2);
    document.getElementById("modalTitle").textContent = "Catch Up / Adjust Schedule";
    const body = document.getElementById("modalBody");
    if (plan.overdueCount === 0) {
      body.innerHTML = `<div class="empty-state"><h3>You're on track</h3><p>No overdue tasks were found before Day ${Planner.currentDay(AppState)}.</p></div>`;
    } else {
      body.innerHTML = `
        <p style="font-size:13.5px;color:var(--text-2);margin-bottom:14px;">
          ${plan.overdueCount} unfinished task(s) were found in past days. They can be redistributed into upcoming
          Days 1–90 (max 2 extra tasks per day). Days 91–100 stay protected and will not be overloaded.
        </p>
        <div class="table-wrap"><table>
          <thead><tr><th>Task</th><th>From Day</th><th>To Day</th></tr></thead>
          <tbody>${plan.moves.map(m => {
            const t = Planner.getDay(m.fromDay).tasks.find(x => x.id === m.taskId);
            return `<tr><td>${this.esc(t ? (t.topic || t.type) : m.taskId)}</td><td>${m.fromDay}</td><td>${m.toDay}</td></tr>`;
          }).join("")}</tbody>
        </table></div>
        <div class="form-actions" style="margin-top:16px;">
          <button class="btn" id="cancelCatchup">Cancel</button>
          <button class="btn btn-primary" id="applyCatchup">Apply Catch-Up Plan</button>
        </div>
      `;
      document.getElementById("cancelCatchup").addEventListener("click", () => this.hideModal());
      document.getElementById("applyCatchup").addEventListener("click", () => {
        Planner.applyCatchUpPlan(AppState, plan.moves);
        this.persist();
        this.hideModal();
        this.toast("Schedule adjusted. Overdue tasks moved into upcoming days.");
        this.renderCurrentPage();
      });
    }
    this.showModal();
  },

  /* ==================== BOOKS ==================== */
  renderBooks() {
    const el = document.getElementById("page-books");
    el.innerHTML = `
      <div class="page-head"><h1>Books</h1><div class="sub">Not every book carries equal weight — prioritize CORE material first.</div></div>
      <div class="filter-bar">
        <select id="bookPriorityFilter">
          <option value="">All priorities</option>
          <option value="CORE">Core</option>
          <option value="IMPORTANT">Important</option>
          <option value="SUPPLEMENTARY">Supplementary</option>
          <option value="NOT YET SCHEDULED">Not yet scheduled</option>
        </select>
      </div>
      <div class="grid grid-2" id="booksGrid"></div>
    `;
    const priorityClass = (p) => p.toLowerCase().replace(/\s+/g, "-");
    const renderGrid = (filterVal) => {
      const grid = document.getElementById("booksGrid");
      const books = BOOKS.filter(b => !filterVal || b.priority === filterVal);
      grid.innerHTML = books.map(b => {
        const saved = AppState.books[b.id] || { chaptersCompleted: 0, progressPct: 0, notes: "" };
        return `
        <div class="card book-card">
          <div class="book-card-head">
            <h3>${this.esc(b.name)}</h3>
            <span class="badge ${priorityClass(b.priority)}">${this.esc(b.priority)}</span>
          </div>
          <div class="book-purpose">${this.esc(b.purpose)}</div>
          <div class="label-sm">Chapters: ${this.esc(b.totalChapters)} · Pages: ${this.esc(b.totalPages)}</div>
          <div>
            <div class="stat-row"><span class="label-sm">Progress</span><strong>${saved.progressPct}%</strong></div>
            <div class="progress-track"><div class="progress-fill" style="width:${saved.progressPct}%"></div></div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="range" min="0" max="100" step="5" value="${saved.progressPct}" data-book-slider="${b.id}" style="flex:1;">
            <span class="label-sm" data-book-pct-label="${b.id}">${saved.progressPct}%</span>
          </div>
          ${b.file ? `<a class="btn btn-sm" href="${this.esc(b.file)}" target="_blank" rel="noopener" data-book-open="${b.id}">Open Book</a>` : `<span class="label-sm">No file linked yet</span>`}
        </div>`;
      }).join("") || `<div class="empty-state"><h3>No books</h3></div>`;

      grid.querySelectorAll("[data-book-open]").forEach(link => {
        link.addEventListener("click", () => this.checkBookLink(link));
      });

      grid.querySelectorAll("[data-book-slider]").forEach(slider => {
        slider.addEventListener("input", () => {
          const id = slider.getAttribute("data-book-slider");
          const val = Number(slider.value);
          document.querySelector(`[data-book-pct-label="${id}"]`).textContent = val + "%";
          if (!AppState.books[id]) AppState.books[id] = { chaptersCompleted: 0, progressPct: 0, notes: "" };
          AppState.books[id].progressPct = val;
        });
        slider.addEventListener("change", () => { this.persist(); this.toast("Book progress saved."); });
      });
    };
    renderGrid("");
    document.getElementById("bookPriorityFilter").addEventListener("change", (e) => renderGrid(e.target.value));
  },

  /* ==================== SUBJECTS ==================== */
  renderSubjects() {
    const el = document.getElementById("page-subjects");
    el.innerHTML = `
      <div class="page-head"><h1>Subjects & Master Curriculum</h1><div class="sub">Rate each topic Strong / Average / Weak as you progress — weak topics automatically feed the Revision phase.</div></div>
      <div id="subjectBlocks"></div>
    `;
    const container = document.getElementById("subjectBlocks");
    let html = "";
    Object.keys(CURRICULUM).forEach(key => {
      const subj = CURRICULUM[key];
      html += `<h2 class="section-title">${this.esc(subj.label)}</h2><div class="table-wrap"><table>
        <thead><tr><th>Topic</th><th>Primary Book(s)</th><th>Status</th></tr></thead><tbody>`;
      subj.topics.forEach(t => {
        const status = AppState.topicStatus[t.name] || "average";
        html += `<tr>
          <td>${this.esc(t.name)}</td>
          <td>${this.esc(bookNames(t.books))}</td>
          <td>
            <select data-topic-status="${this.esc(t.name)}">
              <option value="strong" ${status === "strong" ? "selected" : ""}>Strong</option>
              <option value="average" ${status === "average" ? "selected" : ""}>Average</option>
              <option value="weak" ${status === "weak" ? "selected" : ""}>Weak</option>
            </select>
          </td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
    });
    container.innerHTML = html;
    container.querySelectorAll("[data-topic-status]").forEach(sel => {
      sel.addEventListener("change", () => {
        AppState.topicStatus[sel.getAttribute("data-topic-status")] = sel.value;
        this.persist();
        this.toast("Topic status updated.");
      });
    });
  },

  /* ==================== REVISION (Days 91-100) ==================== */
  renderRevision() {
    const el = document.getElementById("page-revision");
    const revisionDays = Planner.ALL_DAYS.filter(d => d.isRevision);
    const weak = Planner.weakTopics(AppState);
    const weakFlat = [].concat(weak.math, weak.english, weak.analytical);
    const unresolvedErrors = AppState.errorLog.filter(e => e.status !== "Mastered").length;
    el.innerHTML = `
      <div class="page-head"><h1>Revision (Days 91–100)</h1><div class="sub">No major new material here — revision priorities adapt to your weak topics and error log automatically.</div></div>
      <div class="grid grid-2" style="margin-bottom:18px;">
        <div class="card"><h3>Weak topics feeding revision</h3><div class="big-number">${weakFlat.length}</div>
          <div class="label-sm">${weakFlat.slice(0, 6).map(this.esc.bind(this)).join(", ") || "None marked"}</div></div>
        <div class="card"><h3>Unresolved error-log entries</h3><div class="big-number">${unresolvedErrors}</div>
          <div class="label-sm">Will be prioritized on Days 95, 97 & 99</div></div>
      </div>
      <div id="revisionDaysList"></div>
    `;
    const list = document.getElementById("revisionDaysList");
    list.innerHTML = revisionDays.map(d => {
      const pct = Planner.dayCompletionPct(d.day, AppState);
      return `<div class="card" style="margin-bottom:12px;cursor:pointer;" data-open-day="${d.day}">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div><strong>Day ${d.day}</strong> — ${this.esc(d.goal.split(" — ")[0])} <span class="badge revision">Revision</span></div>
          <div style="min-width:140px;"><div class="progress-track"><div class="progress-fill green" style="width:${pct}%"></div></div></div>
        </div>
      </div>`;
    }).join("");
    list.querySelectorAll("[data-open-day]").forEach(c => c.addEventListener("click", () => this.openDayModal(Number(c.getAttribute("data-open-day")))));
  },

  /* ==================== WEAK TOPICS ==================== */
  renderWeak() {
    const el = document.getElementById("page-weak");
    const topics = Planner.allTopicsWithStatus(AppState);
    el.innerHTML = `
      <div class="page-head"><h1>Weak Topics</h1><div class="sub">Topics marked Weak automatically become revision priorities in Days 91–100.</div></div>
      <div class="filter-bar">
        <select id="weakSubjectFilter">
          <option value="">All subjects</option>
          <option value="math">Mathematics</option>
          <option value="english">English</option>
          <option value="analytical">Analytical</option>
        </select>
      </div>
      <div class="grid grid-3" id="weakGrid"></div>
    `;
    const render = (subjFilter) => {
      const grid = document.getElementById("weakGrid");
      const filtered = topics.filter(t => t.status === "weak" && (!subjFilter || t.subject === subjFilter));
      grid.innerHTML = filtered.map(t => `
        <div class="card">
          <h3>${this.esc(CURRICULUM[t.subject].label)}</h3>
          <p style="font-family:var(--font-serif);font-size:15px;margin-top:6px;">${this.esc(t.name)}</p>
          <div class="label-sm" style="margin-top:6px;">${this.esc(bookNames(t.books))}</div>
        </div>
      `).join("") || `<div class="empty-state" style="grid-column:1/-1;"><h3>No weak topics</h3><p>Mark topics as Weak from the Subjects page as you study.</p></div>`;
    };
    render("");
    document.getElementById("weakSubjectFilter").addEventListener("change", e => render(e.target.value));
  },

  /* ==================== ERROR LOG ==================== */
  renderErrors() {
    const el = document.getElementById("page-errors");
    el.innerHTML = `
      <div class="page-head"><h1>Error Log</h1><div class="sub">Every mistake recorded here becomes a priority during Days 91–100.</div></div>
      <div class="filter-bar">
        <select id="errSubjectFilter"><option value="">All subjects</option><option value="math">Mathematics</option><option value="english">English</option><option value="analytical">Analytical</option></select>
        <select id="errStatusFilter"><option value="">All statuses</option><option>Need Revision</option><option>Understood</option><option>Mastered</option></select>
        <button class="btn btn-primary btn-sm" id="addErrorBtn">+ Add Entry</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Question</th><th>Subject</th><th>Topic</th><th>Source</th><th>Status</th><th></th></tr></thead>
        <tbody id="errorTableBody"></tbody>
      </table></div>
    `;
    const renderTable = () => {
      const subjF = document.getElementById("errSubjectFilter").value;
      const statF = document.getElementById("errStatusFilter").value;
      const rows = AppState.errorLog.filter(e => (!subjF || e.subject === subjF) && (!statF || e.status === statF));
      const body = document.getElementById("errorTableBody");
      body.innerHTML = rows.map(e => `
        <tr>
          <td>${this.esc(e.question).slice(0, 60)}</td>
          <td>${this.esc(e.subject)}</td>
          <td>${this.esc(e.topic)}</td>
          <td>${this.esc(e.book)}</td>
          <td><select data-err-status="${e.id}">
              <option ${e.status === "Need Revision" ? "selected" : ""}>Need Revision</option>
              <option ${e.status === "Understood" ? "selected" : ""}>Understood</option>
              <option ${e.status === "Mastered" ? "selected" : ""}>Mastered</option>
            </select></td>
          <td><button class="btn btn-sm btn-danger" data-err-delete="${e.id}">Delete</button></td>
        </tr>`).join("") || `<tr><td colspan="6"><div class="empty-state"><h3>No entries yet</h3><p>Log a mistake right after you make it.</p></div></td></tr>`;

      body.querySelectorAll("[data-err-status]").forEach(sel => sel.addEventListener("change", () => {
        const entry = AppState.errorLog.find(x => x.id === sel.getAttribute("data-err-status"));
        if (entry) { entry.status = sel.value; this.persist(); }
      }));
      body.querySelectorAll("[data-err-delete]").forEach(btn => btn.addEventListener("click", () => {
        AppState.errorLog = AppState.errorLog.filter(x => x.id !== btn.getAttribute("data-err-delete"));
        this.persist(); renderTable(); this.toast("Entry deleted.");
      }));
    };
    renderTable();
    document.getElementById("errSubjectFilter").addEventListener("change", renderTable);
    document.getElementById("errStatusFilter").addEventListener("change", renderTable);
    document.getElementById("addErrorBtn").addEventListener("click", () => this.openErrorForm());
  },

  openErrorForm() {
    document.getElementById("modalTitle").textContent = "Add Error Log Entry";
    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <div class="form-grid">
        <div class="form-field full"><label>Question</label><textarea id="ef-question" placeholder="Paste or summarize the question"></textarea></div>
        <div class="form-field"><label>Subject</label><select id="ef-subject"><option value="math">Mathematics</option><option value="english">English</option><option value="analytical">Analytical</option></select></div>
        <div class="form-field"><label>Topic</label><input type="text" id="ef-topic" placeholder="e.g. Ratio & Proportion"></div>
        <div class="form-field"><label>Source / Book</label><input type="text" id="ef-book"></div>
        <div class="form-field"><label>Difficulty</label><select id="ef-difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></div>
        <div class="form-field full"><label>Why I got it wrong</label><textarea id="ef-mistake"></textarea></div>
        <div class="form-field full"><label>Correct method</label><textarea id="ef-correct"></textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn" id="cancelError">Cancel</button>
        <button class="btn btn-primary" id="saveError">Save Entry</button>
      </div>
    `;
    document.getElementById("cancelError").addEventListener("click", () => this.hideModal());
    document.getElementById("saveError").addEventListener("click", () => {
      const q = document.getElementById("ef-question").value.trim();
      if (!q) { this.toast("Please enter the question."); return; }
      AppState.errorLog.push({
        id: "err" + Date.now(),
        question: q,
        subject: document.getElementById("ef-subject").value,
        topic: document.getElementById("ef-topic").value.trim(),
        book: document.getElementById("ef-book").value.trim(),
        difficulty: document.getElementById("ef-difficulty").value,
        mistake: document.getElementById("ef-mistake").value.trim(),
        correctMethod: document.getElementById("ef-correct").value.trim(),
        date: new Date().toISOString().slice(0, 10),
        status: "Need Revision"
      });
      this.persist();
      this.hideModal();
      this.toast("Error logged.");
      this.renderCurrentPage();
    });
    this.showModal();
  },

  /* ==================== MOCK TESTS ==================== */
  renderMocks() {
    const el = document.getElementById("page-mocks");
    const tests = AppState.mockTests;
    const best = tests.length ? Math.max(...tests.map(t => t.score / t.total)) * 100 : 0;
    const avg = tests.length ? tests.reduce((s, t) => s + t.score / t.total, 0) / tests.length * 100 : 0;
    el.innerHTML = `
      <div class="page-head"><h1>Mock Test Center</h1><div class="sub">Scores are never invented — only what you record here is shown.</div></div>
      <div class="grid grid-4" style="margin-bottom:18px;">
        <div class="card"><h3>Tests Taken</h3><div class="big-number">${tests.length}</div></div>
        <div class="card"><h3>Best Score</h3><div class="big-number">${tests.length ? Math.round(best) + "%" : "—"}</div></div>
        <div class="card"><h3>Average Score</h3><div class="big-number">${tests.length ? Math.round(avg) + "%" : "—"}</div></div>
        <div class="card"><h3>Latest Score</h3><div class="big-number">${tests.length ? Math.round(tests[tests.length - 1].score / tests[tests.length - 1].total * 100) + "%" : "—"}</div></div>
      </div>
      <div class="filter-bar">
        <button class="btn btn-primary btn-sm" id="addMockBtn">+ Add Mock Test</button>
        <button class="btn btn-sm" id="aiTopicMockBtn">🎯 Generate Mock by Topic</button>
        <button class="btn btn-sm" id="aiGenerateMockBtn">📄 Import Paper (built-in OCR)</button>
      </div>
      <div id="examRunnerHost"></div>
      <div id="importedPapersHost"></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Test</th><th>Date</th><th>Score</th><th>Math</th><th>English</th><th>Analytical</th><th></th></tr></thead>
        <tbody id="mockTableBody"></tbody>
      </table></div>
    `;
    document.getElementById("aiGenerateMockBtn").addEventListener("click", () => this.openAIGenerateForm());
    document.getElementById("aiTopicMockBtn").addEventListener("click", () => this.openTopicMockForm());
    const renderTable = () => {
      const body = document.getElementById("mockTableBody");
      body.innerHTML = tests.slice().reverse().map(t => `
        <tr>
          <td>${this.esc(t.name)}</td><td>${this.esc(t.date)}</td>
          <td>${t.score}/${t.total} (${Math.round(t.score / t.total * 100)}%)</td>
          <td>${t.math ?? "—"}</td><td>${t.english ?? "—"}</td><td>${t.analytical ?? "—"}</td>
          <td><button class="btn btn-sm btn-danger" data-mock-delete="${t.id}">Delete</button></td>
        </tr>`).join("") || `<tr><td colspan="7"><div class="empty-state"><h3>No mock tests yet</h3><p>Record your first full-length mock to start tracking performance.</p></div></td></tr>`;
      body.querySelectorAll("[data-mock-delete]").forEach(btn => btn.addEventListener("click", () => {
        AppState.mockTests = AppState.mockTests.filter(x => x.id !== btn.getAttribute("data-mock-delete"));
        this.persist(); this.renderCurrentPage(); this.toast("Mock test removed.");
      }));
    };
    renderTable();
    document.getElementById("addMockBtn").addEventListener("click", () => this.openMockForm());
    this.renderImportedPapers();
  },

  renderImportedPapers() {
    const host = document.getElementById("importedPapersHost");
    if (!host) return;
    const papers = AppState.importedPapers || [];
    if (!papers.length) { host.innerHTML = ""; return; }
    host.innerHTML = `<div class="card" style="margin-bottom:16px;"><h3>Imported Papers</h3>
      <div class="table-wrap"><table><thead><tr><th>Paper</th><th>Imported</th><th>Questions</th><th></th></tr></thead><tbody>
      ${papers.slice().reverse().map(x => `<tr><td>${this.esc(x.name)}</td><td>${this.esc(x.date)}</td><td>${x.questions.length}</td>
        <td style="white-space:nowrap;"><button class="btn btn-sm btn-primary" data-imp-start="${x.id}">Start</button>
        <button class="btn btn-sm" data-imp-view="${x.id}">View</button>
        <button class="btn btn-sm btn-danger" data-imp-del="${x.id}">Delete</button></td></tr>`).join("")}
      </tbody></table></div></div>`;
    const find = (id) => papers.find(x => x.id === id);
    host.querySelectorAll("[data-imp-start]").forEach(b => b.addEventListener("click", () => this.startExamRunner(JSON.parse(JSON.stringify(find(b.getAttribute("data-imp-start")).questions)))));
    host.querySelectorAll("[data-imp-view]").forEach(b => b.addEventListener("click", () => this.showImportPreview(find(b.getAttribute("data-imp-view")), true)));
    host.querySelectorAll("[data-imp-del]").forEach(b => b.addEventListener("click", () => {
      if (!confirm("Delete this imported paper?")) return;
      AppState.importedPapers = AppState.importedPapers.filter(x => x.id !== b.getAttribute("data-imp-del"));
      this.persist(); this.renderCurrentPage();
    }));
  },

  /* ==================== AI MOCK TEST: IMPORT FROM PDF / PHOTOS ==================== */
  openAIGenerateForm() {
    document.getElementById("modalTitle").textContent = "Import a Mock Test (PDF, photos or pasted text)";
    document.getElementById("modalBody").innerHTML = `
      <p style="font-size:13px;color:var(--text-2);margin-bottom:12px;">Upload a question-paper <strong>PDF</strong> or page photos, or just paste the text. <strong>Built-in OCR needs no API key and no account</strong> — scanned pages are read on your own machine with Tesseract (downloaded once, then cached for offline use). Questions, options and the answer key are pulled out by a local parser; anything it can't find an answer for, you can set yourself in the preview.</p>
      <div class="form-field full"><label>Reader</label>
        <select id="ai-engine">
          <option value="local">Built-in OCR + local parser — no API key (recommended)</option>
          <option value="ai">AI provider (needs a key; better on messy layouts &amp; diagrams)</option>
        </select></div>
      <div class="form-field full"><label>PDF or images</label><input type="file" id="ai-images" accept="application/pdf,.pdf,image/*" multiple></div>
      <div class="form-field full"><label>…or paste the questions as text (optional)</label><textarea id="ai-paste" rows="3" placeholder="1. If 3x + 5 = 20, x = ?&#10;(a) 3 (b) 5 (c) 7 (d) 15"></textarea></div>
      <div class="form-field full"><label>Answer key, if it is on a separate sheet (optional)</label>
        <input type="text" id="ai-key" placeholder="1c 2a 3d 4b …  or  1-c, 2-a, 3-d" style="margin-bottom:6px;">
        <input type="file" id="ai-keyimg" accept="application/pdf,.pdf,image/*" multiple>
        <span class="label-sm">A photo or scan of the key page works too — it is OCR'd the same way. Section headings ("Section II: Mathematics") are read, so a key whose numbering restarts at 1 in each section is matched section by section.</span></div>
      <div class="form-grid">
        <div class="form-field"><label>How to read a PDF</label>
          <select id="ai-mode"><option value="auto">Auto (text layer if it has one, else OCR)</option><option value="images">Always OCR the pages as images</option></select></div>
        <div class="form-field"><label>Subject</label>
          <select id="ai-subject"><option value="auto">Auto-detect from the paper</option><option value="math">All Mathematics</option><option value="english">All English</option><option value="analytical">All Analytical</option></select></div>
        <div class="form-field"><label>PDF pages from</label><input type="number" id="ai-from" min="1" placeholder="first"></div>
        <div class="form-field"><label>to</label><input type="number" id="ai-to" min="1" placeholder="last"></div>
        <div class="form-field"><label>Max questions (0 = all)</label><input type="number" id="ai-count" value="0" min="0" max="300"></div>
        <div class="form-field"><label>No answer key in the paper?</label>
          <select id="ai-solve"><option value="1">Let the AI work out the answers</option><option value="0">Skip those questions</option></select></div>
      </div>
      <p style="font-size:12px;color:var(--text-2);margin:8px 0 0;">Tip: built-in OCR takes roughly 3–8 seconds per scanned page and costs nothing. A clean text PDF is instant. For a long paper, do one section at a time with the page range.</p>
      <div id="aiGenStatus" style="font-size:13px;color:var(--text-2);margin-top:6px;"></div>
      <div class="form-actions">
        <button class="btn" id="cancelAiGen">Cancel</button>
        <button class="btn btn-primary" id="runAiGen">Read &amp; Import</button>
      </div>
    `;
    document.getElementById("cancelAiGen").addEventListener("click", () => this.hideModal());
    document.getElementById("runAiGen").addEventListener("click", async () => {
      const files = Array.from(document.getElementById("ai-images").files || []);
      const pasted = document.getElementById("ai-paste").value.trim();
      const engine = document.getElementById("ai-engine").value;
      if (files.length === 0 && !pasted) { this.toast("Choose a PDF/image, or paste some questions."); return; }
      if (engine === "ai" && !GeminiService.hasApiKey()) { this.needAiKeyModal(); return; }
      const statusEl = document.getElementById("aiGenStatus"), runBtn = document.getElementById("runAiGen");
      const cfg = {
        engine, pasteText: pasted, answerKeyText: document.getElementById("ai-key").value.trim(),
        keyFiles: Array.from(document.getElementById("ai-keyimg").files || []),
        mode: document.getElementById("ai-mode").value,
        subject: document.getElementById("ai-subject").value,
        from: Number(document.getElementById("ai-from").value) || 0,
        to: Number(document.getElementById("ai-to").value) || 0,
        max: Number(document.getElementById("ai-count").value) || 0,
        solve: document.getElementById("ai-solve").value === "1"
      };
      runBtn.disabled = true;
      const say = (m) => { statusEl.style.color = "var(--text-2)"; statusEl.textContent = m; };
      try {
        const out = cfg.engine === "local"
          ? await this.importLocally(files, cfg, say)
          : await this.importFromFiles(files, cfg, say);
        if (cfg.engine !== "local" && ((cfg.keyFiles && cfg.keyFiles.length) || cfg.answerKeyText)) {
          const kt = ((cfg.answerKeyText || "") + "\n" + await this.readKeySheet(cfg.keyFiles, say)).trim();
          const res = this.applyKeyMap(out.questions, QuestionParser.parseKeyText(kt));
          out.stats.fromKey = (out.stats.fromKey || 0) + res.applied;
          out.stats.unknown = out.questions.filter(q => !q.correctOptionId).length;
        }
        const base = files.length ? files[0].name.replace(/\.[^.]+$/, "") : "Pasted paper";
        this.showImportPreview({ name: base + (files.length > 1 ? " (+" + (files.length - 1) + ")" : ""), questions: out.questions, stats: out.stats }, false);
      } catch (err) {
        runBtn.disabled = false;
        statusEl.style.color = "var(--red-600)";
        statusEl.textContent = this.friendlyGeminiError(err);
      }
    });
    this.showModal();
  },

  /* ===== NO-API-KEY PATH: text layer or built-in OCR -> local parser ===== */
  /* Any mix of PDFs/images -> [{page, text}], using the text layer when there
     is one and built-in OCR when there isn't. Shared by the paper and the
     answer-key sheet. */
  async filesToPages(files, cfg, say, tag) {
    const pages = [];
    let ocrPages = 0;
    for (const f of files) {
      const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
      if (!isPdf) {
        const b64 = await this.fileToBase64(f);
        say("Reading " + (tag || "") + f.name + " with built-in OCR…");
        const got = await OcrEngine.recognize([{ page: pages.length + 1, b64 }], say);
        ocrPages++;
        pages.push({ page: pages.length + 1, text: got[0].text });
        continue;
      }
      say("Opening " + f.name + "…");
      const doc = await PdfReader.open(f);
      const from = Math.max(1, cfg.from || 1), to = Math.min(doc.numPages, cfg.to || doc.numPages);
      if (from > to) throw new Error("PDF_UNREADABLE: the page range is outside this PDF (it has " + doc.numPages + " pages).");
      const nums = []; for (let n = from; n <= to; n++) nums.push(n);
      if (nums.length > 80) throw new Error("PDF_UNREADABLE: that's " + nums.length + " pages — import at most 80 at a time (use the page range).");

      let texts = null, needOcr = cfg.mode === "images";
      if (!needOcr) {
        say("Checking for a text layer in " + nums.length + " page" + (nums.length > 1 ? "s" : "") + "…");
        texts = await PdfReader.extractText(doc, nums);
        const avg = texts.reduce((t, x) => t + x.text.length, 0) / texts.length;
        needOcr = avg < 120;
      }
      if (!needOcr) {
        say("This PDF has selectable text — reading it directly, no OCR needed.");
        texts.forEach(t => pages.push(t));
      } else {
        say("Rendering " + nums.length + " page" + (nums.length > 1 ? "s" : "") + " for OCR…");
        const imgs = await PdfReader.renderPages(doc, nums, (i, n) => say("Rendering page " + i + " of " + n + "…"),
          { maxWidth: 2200, maxScale: 3, png: true, grayscale: true });
        const got = await OcrEngine.recognize(imgs, say);
        ocrPages += got.length;
        got.forEach(g => pages.push(g));
      }
    }
    return { pages, ocrPages };
  },

  /* OCR/read an answer-key sheet (photo, scan or PDF) into raw key text. */
  async readKeySheet(files, say) {
    if (!files || !files.length) return "";
    say("Reading the answer-key sheet…");
    const { pages } = await this.filesToPages(files, { mode: "auto" }, say, "answer key ");
    return pages.map(p => p.text).join("\n");
  },

  /* Fill in missing answers from a parsed key map (section-aware). */
  applyKeyMap(questions, map) {
    let n = 0, amb = 0;
    questions.forEach(q => {
      if (q.correctOptionId) return;
      const r = QuestionParser.keyFor(map, q.number, q.subject);
      if (r.answer && "abcde".indexOf(r.answer) < q.options.length) {
        q.correctOptionId = r.answer; q.answerSource = "key"; n++;
      } else if (r.ambiguous) amb++;
    });
    return { applied: n, ambiguous: amb };
  },

  /* ===== NO-API-KEY PATH: text layer or built-in OCR -> local parser ===== */
  async importLocally(files, cfg, say) {
    const { pages, ocrPages } = await this.filesToPages(files, cfg, say);
    if (cfg.pasteText) pages.push({ page: pages.length + 1, text: cfg.pasteText });
    if (!pages.length) throw new Error("NO_QUESTIONS: nothing to read.");

    let keyText = cfg.answerKeyText || "";
    if (cfg.keyFiles && cfg.keyFiles.length) {
      const fromSheet = await this.readKeySheet(cfg.keyFiles, say);
      keyText = (keyText + "\n" + fromSheet).trim();
    }

    say("Pulling out questions, options and the answer key…");
    const out = QuestionParser.parse(pages, { subject: cfg.subject, max: cfg.max, answerKeyText: keyText });
    if (!out.questions.length) {
      throw new Error("NO_QUESTIONS: the local parser found no numbered questions with (a)/(b)/(c) options" +
        (ocrPages ? " in the OCR text" : " in this file") +
        ". If the scan is faint or two-column, try 'Always OCR the pages as images', crop the photos tighter, or switch the Reader to an AI provider.");
    }
    out.stats.ocrPages = ocrPages;
    out.stats.engine = "local";
    return out;
  },

  /* Reads PDFs/images -> batches -> GeminiService.importQuestions. */
  async importFromFiles(files, cfg, say) {
    const batches = [];
    const visionWarn = ["groq", "openrouter", "llm7"].includes(GeminiService.getProvider());
    const imageBatchesFrom = (items) => PdfReader.makeBatches(items, 3, 2).map(g => ({ label: PdfReader.pageLabel(g), images: g.map(x => x.b64) }));
    for (const f of files) {
      const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
      if (!isPdf) {
        say("Reading image " + f.name + "…");
        const b64 = await this.fileToBase64(f);
        batches.push({ label: f.name, images: [b64], _single: true });
        continue;
      }
      say("Opening " + f.name + "…");
      const doc = await PdfReader.open(f);
      const from = Math.max(1, cfg.from || 1), to = Math.min(doc.numPages, cfg.to || doc.numPages);
      if (from > to) throw new Error("PDF_UNREADABLE: the page range is outside this PDF (it has " + doc.numPages + " pages).");
      const pages = []; for (let n = from; n <= to; n++) pages.push(n);
      if (pages.length > 80) throw new Error("PDF_UNREADABLE: that's " + pages.length + " pages — please import at most 80 pages at a time (use the page range).");
      let mode = cfg.mode === "images" ? "images" : "text";
      let texts = null;
      if (mode === "text") {
        say("Checking for selectable text in " + pages.length + " page" + (pages.length > 1 ? "s" : "") + "…");
        texts = await PdfReader.extractText(doc, pages);
        const avg = texts.reduce((t, x) => t + x.text.length, 0) / texts.length;
        if (avg < 120) mode = "images"; // scanned: no usable text layer
      }
      if (mode === "text") {
        say("Found selectable text — reading it directly (no OCR needed).");
        PdfReader.makeBatches(texts, 3, 2).forEach(g => batches.push({
          label: PdfReader.pageLabel(g),
          text: g.map(x => "--- PAGE " + x.page + " ---\n" + x.text).join("\n\n")
        }));
      } else {
        say((cfg.mode === "images" ? "Rendering" : "This looks like a scanned PDF — rendering") + " " + pages.length + " page" + (pages.length > 1 ? "s" : "") + " as images…" + (visionWarn ? " (Note: your current provider's default model may not read images — if this fails, switch to Gemini.)" : ""));
        const imgs = await PdfReader.renderPages(doc, pages, (i, n) => say("Rendering page " + i + " of " + n + "…"));
        imageBatchesFrom(imgs).forEach(b => batches.push(b));
      }
    }
    // Group loose single images into windows of 3 too
    const singles = batches.filter(b => b._single), others = batches.filter(b => !b._single);
    const merged = others.concat(PdfReader.makeBatches(singles.map((b, i) => ({ page: i + 1, b64: b.images[0] })), 3, 2)
      .map(g => ({ label: g.length === 1 ? "image " + g[0].page : "images " + g[0].page + "–" + g[g.length - 1].page, images: g.map(x => x.b64) })));
    return GeminiService.importQuestions(merged, { subject: cfg.subject, max: cfg.max, solveMissing: cfg.solve, onProgress: say });
  },

  /* Shows every extracted question IN FULL so OCR mistakes can be spotted. */
  showImportPreview(paper, alreadySaved) {
    const st = paper.stats || {};
    const letter = (id) => id.toUpperCase();
    const missing = paper.questions.filter(q => !q.correctOptionId).length;
    const qHtml = paper.questions.map((q, i) => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border, #e3e5ec);">
        ${q.passage && (i === 0 || paper.questions[i - 1].passage !== q.passage) ? `<details style="margin-bottom:6px;"><summary style="cursor:pointer;font-size:12px;color:var(--text-2);">Shared passage / set-up (${q.passage.length} chars) — click to read</summary><div style="white-space:pre-wrap;font-size:12.5px;line-height:1.55;padding:8px 10px;margin-top:6px;border:1px solid var(--border, #e3e5ec);border-radius:6px;">${this.esc(q.passage)}</div></details>` : ""}
        <div style="font-weight:600;font-size:13.5px;white-space:pre-wrap;">${i + 1}. ${this.esc(q.prompt)}</div>
        <div style="font-size:11.5px;color:var(--text-2);margin:2px 0 4px;">${this.esc(q.subject)}${q.number ? " · paper Q" + q.number : ""}${!q.correctOptionId ? ' · <span style="color:var(--red-600);">no answer set</span>' : ""}</div>
        ${q.options.map(o => `<div role="button" tabindex="0" data-set-ans="${i}:${o.id}" title="Click to mark as the correct answer" style="cursor:pointer;font-size:13px;padding:1px 4px 1px 14px;border-radius:4px;${o.id === q.correctOptionId ? "color:var(--green-600);font-weight:600;" : ""}">${letter(o.id)}) ${this.esc(o.text)}${o.id === q.correctOptionId ? " ✓" : ""}</div>`).join("")}
        ${q.answerSource === "inferred" ? `<div class="label-sm" style="margin-top:4px;color:var(--red-600);">⚠ Answer worked out by the AI (no key in the paper) — verify it.</div>` : ""}
        ${q.answerSource === "manual" ? `<div class="label-sm" style="margin-top:4px;">Answer set by you.</div>` : ""}
      </div>`).join("");
    document.getElementById("modalTitle").textContent = "Imported: " + paper.questions.length + " questions";
    document.getElementById("modalBody").innerHTML = `
      <p style="font-size:13px;color:var(--text-2);margin-bottom:8px;">
        ${st.fromKey != null ? `${st.fromKey} answer${st.fromKey === 1 ? "" : "s"} from the paper's key` : ""}${st.solved ? ` · <strong style="color:var(--red-600);">${st.solved} solved by AI (verify)</strong>` : ""}${st.dropped ? ` · ${st.dropped} block(s) skipped (no options found)` : ""}${st.withPassage ? ` · ${st.withPassage} question(s) carry a shared passage` : ""}${st.ambiguous ? ` · ${st.ambiguous} key lookup(s) ambiguous across sections` : ""}${st.ocrPages ? ` · ${st.ocrPages} page(s) read by built-in OCR` : ""}${st.skippedBatches ? ` · ${st.skippedBatches} page group(s) couldn't be read` : ""}.
        ${missing ? `<strong style="color:var(--red-600);">${missing} question(s) have no answer yet — click the correct option below, or paste the key.</strong> ` : ""}
        Check the wording against your paper — OCR can slip on symbols and fractions.</p>
      <div class="form-grid" style="margin-bottom:10px;">
        <div class="form-field full"><label>Set the answer key in bulk (optional)</label>
          <div style="display:flex;gap:8px;"><input type="text" id="imp-key" placeholder="1c 2a 3d 4b …  (section headings allowed)" style="flex:1;"><button class="btn btn-sm" id="impKeyApply">Apply</button></div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px;"><input type="file" id="imp-keyimg" accept="application/pdf,.pdf,image/*" multiple style="flex:1;"><button class="btn btn-sm" id="impKeyImg">Read key image</button></div>
          <span class="label-sm" id="impKeyStatus"></span></div>
      </div>
      <div class="form-field full"><label>Save as</label><input type="text" id="imp-name" value="${this.esc(paper.name)}"></div>
      <div style="max-height:46vh;overflow:auto;border:1px solid var(--border, #e3e5ec);border-radius:8px;padding:0 12px;margin-bottom:10px;">${qHtml}</div>
      <div class="form-actions" style="flex-wrap:wrap;">
        <button class="btn btn-sm" id="impCopy">Copy as text</button>
        <button class="btn btn-sm" id="impDl">Download .txt</button>
        <button class="btn" id="impClose">Close</button>
        ${alreadySaved ? "" : `<button class="btn" id="impSave">Save to my papers</button>`}
        <button class="btn btn-primary" id="impStart">${alreadySaved ? "Start timed exam" : "Save &amp; start timed exam"}</button>
      </div>`;
    const asText = () => paper.questions.map((q, i) => `${q.passage && (i === 0 || paper.questions[i - 1].passage !== q.passage) ? q.passage + "\n\n" : ""}${i + 1}. ${q.prompt}\n${q.options.map(o => `   ${letter(o.id)}) ${o.text}`).join("\n")}\n   Answer: ${letter(q.correctOptionId)}${q.answerSource === "inferred" ? " (AI-solved)" : ""}`).join("\n\n");
    const save = () => {
      if (alreadySaved) return paper;
      const saved = { id: "imp" + Date.now(), name: (document.getElementById("imp-name").value.trim() || paper.name), date: new Date().toISOString().slice(0, 10), stats: st, questions: paper.questions };
      AppState.importedPapers.push(saved); this.persist(); return saved;
    };
    const rerender = () => {
      const nm = document.getElementById("imp-name");
      if (nm) paper.name = nm.value.trim() || paper.name;
      this.showImportPreview(paper, alreadySaved);
    };
    document.getElementById("modalBody").querySelectorAll("[data-set-ans]").forEach(el => {
      el.addEventListener("click", () => {
        const [i, oid] = el.getAttribute("data-set-ans").split(":");
        const q = paper.questions[Number(i)];
        q.correctOptionId = q.correctOptionId === oid ? null : oid;
        q.answerSource = q.correctOptionId ? "manual" : "unknown";
        if (alreadySaved) this.persist();
        rerender();
      });
    });
    const applyKeyText = (raw) => {
      const map = QuestionParser.parseKeyText(raw);
      if (!map.__count) { this.toast("Couldn't read that key — try '1c 2a 3d'."); return; }
      const res = this.applyKeyMap(paper.questions, map);
      if (alreadySaved) this.persist();
      this.toast(res.applied + " answer(s) applied" + (res.ambiguous ? ", " + res.ambiguous + " ambiguous (same number in more than one section)" : "") + ".");
      rerender();
    };
    const keyBtn = document.getElementById("impKeyApply");
    if (keyBtn) keyBtn.addEventListener("click", () => {
      const raw = document.getElementById("imp-key").value;
      if (raw.trim()) applyKeyText(raw);
    });
    const keyImgBtn = document.getElementById("impKeyImg");
    if (keyImgBtn) keyImgBtn.addEventListener("click", async () => {
      const fs2 = Array.from(document.getElementById("imp-keyimg").files || []);
      if (!fs2.length) { this.toast("Choose a photo or PDF of the answer key first."); return; }
      const st2 = document.getElementById("impKeyStatus");
      keyImgBtn.disabled = true;
      try {
        const txt = await this.readKeySheet(fs2, (m) => { if (st2) st2.textContent = m; });
        if (st2) st2.textContent = "";
        applyKeyText(txt);
      } catch (err) {
        if (st2) st2.textContent = "";
        keyImgBtn.disabled = false;
        this.toast(this.friendlyGeminiError(err));
      }
    });
    document.getElementById("impCopy").addEventListener("click", () => {
      (navigator.clipboard ? navigator.clipboard.writeText(asText()) : Promise.reject()).then(() => this.toast("Copied all questions."), () => this.toast("Couldn't copy — use Download .txt instead."));
    });
    document.getElementById("impDl").addEventListener("click", () => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([asText()], { type: "text/plain" }));
      a.download = (document.getElementById("imp-name").value.trim() || "paper") + ".txt"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    document.getElementById("impClose").addEventListener("click", () => { this.hideModal(); });
    const saveBtn = document.getElementById("impSave");
    if (saveBtn) saveBtn.addEventListener("click", () => { save(); this.hideModal(); this.toast("Saved — find it under Imported Papers."); this.renderCurrentPage(); });
    document.getElementById("impStart").addEventListener("click", () => {
      if (missing && !confirm(missing + " question(s) still have no correct answer. They will be shown but left out of your score. Start anyway?")) return;
      const saved = save(); this.hideModal();
      this.startExamRunner(JSON.parse(JSON.stringify(saved.questions)));
    });
    this.showModal();
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  friendlyGeminiError(err) {
    const msg = (err && err.message) || String(err);
    const label = GeminiService.providerLabel();
    if (msg.startsWith("NO_API_KEY")) return `No ${label} API key set — add one in Settings → AI Provider.`;
    if (msg.startsWith("NO_BASE_URL")) return "Enter the provider's Base URL in Settings → AI Provider.";
    if (msg.startsWith("BAD_API_KEY")) return `${label} rejected the API key — check it in Settings (use "Test connection" there). ` + msg.replace(/^BAD_API_KEY:\s*[^.]*\.\s*/, "").slice(0, 140);
    if (msg.startsWith("MODEL_NOT_FOUND")) return msg.replace("MODEL_NOT_FOUND: ", "");
    if (msg.startsWith("RATE_LIMIT")) return msg.replace("RATE_LIMIT: ", "");
    if (msg.startsWith("OVERLOADED")) return msg.replace("OVERLOADED: ", "");
    if (msg.startsWith("PDF_LOCKED") || msg.startsWith("PDF_UNREADABLE")) return msg.replace(/^PDF_\w+:\s*/, "");
    if (msg.startsWith("NO_QUESTIONS")) return msg.replace("NO_QUESTIONS: ", "");
    if (msg.startsWith("NETWORK_ERROR")) return msg.replace("NETWORK_ERROR: ", "Couldn't connect — ");
    if (msg.startsWith("MALFORMED_RESPONSE") || msg.startsWith("EMPTY_RESPONSE")) return `${label}'s response wasn't usable — just try again, or switch to a stronger model in Settings.`;
    return "Something went wrong: " + msg.slice(0, 220);
  },

  needAiKeyModal() {
    document.getElementById("modalTitle").textContent = "Set up an AI provider first";
    document.getElementById("modalBody").innerHTML = `
      <p style="font-size:13.5px;color:var(--text-2);">Pick a provider and paste a key in Settings. Groq, OpenRouter, Mistral and Gemini have free tiers, and LLM7.io needs no key at all. The key is stored only in this browser.</p>
      <div class="form-actions"><button class="btn btn-primary" id="goToSettingsForKey">Open Settings</button></div>`;
    document.getElementById("goToSettingsForKey").addEventListener("click", () => { this.hideModal(); App.navigate("settings"); });
    this.showModal();
  },

  /* ==================== TIMED EXAM RUNNER ==================== */
  startExamRunner(questions) {
    this._exam = {
      questions, answers: {}, flagged: {}, current: 0,
      secondsRemaining: Math.max(600, questions.length * 90), // ~1.5 min/question, floor 10 min
      timerHandle: null
    };
    this.renderExamRunner();
    this._exam.timerHandle = setInterval(() => {
      this._exam.secondsRemaining--;
      if (this._exam.secondsRemaining <= 0) {
        clearInterval(this._exam.timerHandle);
        this.submitExam(true);
        return;
      }
      const t = document.getElementById("examTimer");
      if (t) t.textContent = this.formatSeconds(this._exam.secondsRemaining);
    }, 1000);
  },

  formatSeconds(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  },

  renderExamRunner() {
    const host = document.getElementById("examRunnerHost");
    if (!host) return;
    const ex = this._exam;
    const q = ex.questions[ex.current];
    const paletteHtml = ex.questions.map((qq, i) => {
      let cls = "exam-palette-btn";
      if (ex.answers[qq.id]) cls += " answered";
      if (ex.flagged[qq.id]) cls += " flagged";
      if (i === ex.current) cls += " current";
      return `<button class="${cls}" data-goto-q="${i}">${i + 1}</button>`;
    }).join("");
    host.innerHTML = `
      <div class="exam-runner">
        <div class="exam-header">
          <div><strong>Question ${ex.current + 1} / ${ex.questions.length}</strong> <span class="badge core">${this.esc(q.subject || "mixed")}</span></div>
          <div id="examTimer" class="exam-timer">${this.formatSeconds(ex.secondsRemaining)}</div>
        </div>
        <div class="exam-palette">${paletteHtml}</div>
        <div class="exam-question card">
          ${q.passage ? `<div class="exam-passage" style="max-height:34vh;overflow:auto;white-space:pre-wrap;font-size:13.5px;line-height:1.6;padding:12px 14px;margin-bottom:12px;border:1px solid var(--border, #e3e5ec);border-radius:8px;background:var(--bg-2, rgba(127,127,127,.06));">${this.esc(q.passage)}</div>` : ""}
          <p class="exam-prompt">${this.esc(q.prompt)}</p>
          <div class="exam-options">
            ${q.options.map(o => `
              <button class="exam-option-btn ${ex.answers[q.id] === o.id ? "selected" : ""}" data-select-option="${o.id}">
                <span class="exam-option-letter">${o.id.toUpperCase()}</span> ${this.esc(o.text)}
              </button>`).join("")}
          </div>
          <div class="exam-controls">
            <button class="btn btn-sm" id="examPrev" ${ex.current === 0 ? "disabled" : ""}>← Prev</button>
            <button class="btn btn-sm" id="examFlag">${ex.flagged[q.id] ? "Unflag" : "🚩 Flag for review"}</button>
            <button class="btn btn-sm" id="examNext" ${ex.current === ex.questions.length - 1 ? "disabled" : ""}>Next →</button>
            <button class="btn btn-primary btn-sm" id="examSubmit" style="margin-left:auto;">Submit Test</button>
          </div>
        </div>
      </div>
    `;
    host.querySelectorAll("[data-goto-q]").forEach(btn => btn.addEventListener("click", () => {
      ex.current = Number(btn.getAttribute("data-goto-q")); this.renderExamRunner();
    }));
    host.querySelectorAll("[data-select-option]").forEach(btn => btn.addEventListener("click", () => {
      ex.answers[q.id] = btn.getAttribute("data-select-option"); this.renderExamRunner();
    }));
    document.getElementById("examPrev").addEventListener("click", () => { ex.current--; this.renderExamRunner(); });
    document.getElementById("examNext").addEventListener("click", () => { ex.current++; this.renderExamRunner(); });
    document.getElementById("examFlag").addEventListener("click", () => {
      ex.flagged[q.id] = !ex.flagged[q.id]; this.renderExamRunner();
    });
    document.getElementById("examSubmit").addEventListener("click", () => {
      const unanswered = ex.questions.length - Object.keys(ex.answers).length;
      if (unanswered > 0 && !confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
      this.submitExam(false);
    });
  },

  submitExam(autoSubmitted) {
    const ex = this._exam;
    if (ex.timerHandle) clearInterval(ex.timerHandle);
    const grade = Planner.gradeMockAnswers(ex.questions, ex.answers);
    const bySubjPct = {};
    Object.keys(grade.bySubject).forEach(s => {
      const b = grade.bySubject[s];
      bySubjPct[s] = b.total ? Math.round(b.correct / b.total * 100) : null;
    });
    AppState.mockTests.push({
      id: "mock" + Date.now(), name: "AI-Generated Mock", date: new Date().toISOString().slice(0, 10),
      score: grade.correct, total: grade.total,
      math: bySubjPct.math ?? null, english: bySubjPct.english ?? null, analytical: bySubjPct.analytical ?? null,
      di: null, weakAreas: grade.weakSubjects.join(", "), notes: autoSubmitted ? "Auto-submitted when time ran out." : ""
    });
    const adaptive = Planner.adaptTodayTasks(AppState, grade);
    this.persist();
    this.renderExamResults(grade, adaptive, autoSubmitted);
  },

  renderExamResults(grade, adaptiveTasks, autoSubmitted) {
    const host = document.getElementById("examRunnerHost");
    if (!host) return;
    host.innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <h3>${autoSubmitted ? "Time's up — auto-submitted" : "Test Submitted"}</h3>
        <div class="big-number" style="font-size:32px;margin-top:8px;">${grade.correct} / ${grade.total} (${grade.percent}%)</div>
        ${grade.ungraded ? `<div class="label-sm" style="color:var(--red-600);">${grade.ungraded} question(s) had no answer key and were left out of the score.</div>` : ""}
        <div class="grid grid-3" style="margin-top:14px;">
          ${Object.keys(grade.bySubject).map(s => {
            const b = grade.bySubject[s];
            const pct = b.total ? Math.round(b.correct / b.total * 100) : 0;
            return `<div><div class="label-sm">${this.esc(s)}</div><div class="big-number" style="font-size:20px;">${pct}%</div>
              <div class="progress-track"><div class="progress-fill ${pct < 60 ? "red" : "green"}" style="width:${pct}%"></div></div></div>`;
          }).join("")}
        </div>
        ${adaptiveTasks.length ? `<p style="margin-top:14px;font-size:13px;color:var(--text-2);">Scored under 60% in <strong>${grade.weakSubjects.join(", ")}</strong> — extra focused review was added to <strong>Today's Plan</strong> and those topics are now marked Weak.</p>` : ""}
        <div class="form-actions" style="justify-content:flex-start;margin-top:14px;">
          <button class="btn" id="reviewAnswersBtn">Review Answers</button>
          <button class="btn btn-primary" id="closeExamResults">Back to Mock Test Center</button>
        </div>
      </div>
      <div id="examReview"></div>
    `;
    document.getElementById("closeExamResults").addEventListener("click", () => { this._exam = null; this.renderCurrentPage(); });
    document.getElementById("reviewAnswersBtn").addEventListener("click", () => {
      const rev = document.getElementById("examReview");
      rev.innerHTML = grade.results.map((r, i) => `
        <div class="card" style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;"><strong>Q${i + 1}</strong><span class="badge ${!r.question.correctOptionId ? "" : (r.isCorrect ? "strong" : "weak")}">${!r.question.correctOptionId ? "Not scored" : (r.isCorrect ? "Correct" : "Incorrect")}</span></div>
          <p style="font-size:13.5px;margin-top:6px;">${this.esc(r.question.prompt)}</p>
          <p class="label-sm">Your answer: ${r.chosen ? r.chosen.toUpperCase() : "—"} · Correct: ${r.question.correctOptionId ? r.question.correctOptionId.toUpperCase() : "not set"}</p>
          ${r.question.answerSource === "inferred" ? `<p class="task-note" style="color:var(--red-600);">⚠ This paper had no answer key — the AI worked out this answer, so double-check it.</p>` : ""}
          ${r.question.explanation ? `<p class="task-note">${this.esc(r.question.explanation)}</p>` : ""}
        </div>`).join("");
    });
  },

  openMockForm() {
    document.getElementById("modalTitle").textContent = "Add Mock Test";
    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <div class="form-grid">
        <div class="form-field"><label>Test name</label><input type="text" id="mf-name" placeholder="e.g. Mock Test 3"></div>
        <div class="form-field"><label>Date</label><input type="date" id="mf-date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-field"><label>Score obtained</label><input type="number" id="mf-score" min="0"></div>
        <div class="form-field"><label>Total marks</label><input type="number" id="mf-total" min="1" value="100"></div>
        <div class="form-field"><label>Time taken (min)</label><input type="number" id="mf-time" min="0"></div>
        <div class="form-field"><label>Mathematics score</label><input type="number" id="mf-math"></div>
        <div class="form-field"><label>English score</label><input type="number" id="mf-english"></div>
        <div class="form-field"><label>Analytical score</label><input type="number" id="mf-analytical"></div>
        <div class="form-field"><label>Data Interpretation score</label><input type="number" id="mf-di"></div>
        <div class="form-field full"><label>Mistakes / weak areas</label><textarea id="mf-weak"></textarea></div>
        <div class="form-field full"><label>Notes</label><textarea id="mf-notes"></textarea></div>
      </div>
      <div class="form-actions">
        <button class="btn" id="cancelMock">Cancel</button>
        <button class="btn btn-primary" id="saveMock">Save Test</button>
      </div>
    `;
    document.getElementById("cancelMock").addEventListener("click", () => this.hideModal());
    document.getElementById("saveMock").addEventListener("click", () => {
      const name = document.getElementById("mf-name").value.trim();
      const score = Number(document.getElementById("mf-score").value);
      const total = Number(document.getElementById("mf-total").value);
      if (!name || !total) { this.toast("Please enter a test name and total marks."); return; }
      AppState.mockTests.push({
        id: "mock" + Date.now(), name, date: document.getElementById("mf-date").value,
        score, total, timeTaken: Number(document.getElementById("mf-time").value) || 0,
        math: document.getElementById("mf-math").value || null,
        english: document.getElementById("mf-english").value || null,
        analytical: document.getElementById("mf-analytical").value || null,
        di: document.getElementById("mf-di").value || null,
        weakAreas: document.getElementById("mf-weak").value.trim(),
        notes: document.getElementById("mf-notes").value.trim()
      });
      this.persist(); this.hideModal(); this.toast("Mock test saved."); this.renderCurrentPage();
    });
    this.showModal();
  },

  /* ==================== NOTES ==================== */
  renderNotes() {
    const el = document.getElementById("page-notes");
    el.innerHTML = `
      <div class="page-head"><h1>Notes</h1><div class="sub">Formulas, vocabulary, strategies, and anything worth remembering.</div></div>
      <div class="filter-bar">
        <select id="noteCategoryFilter">
          <option value="">All categories</option>
          <option>Subject</option><option>Book</option><option>Formula</option><option>Vocabulary</option><option>Strategy</option><option>Mistake</option>
        </select>
        <button class="btn btn-primary btn-sm" id="addNoteBtn">+ Add Note</button>
      </div>
      <div class="grid grid-3" id="notesGrid"></div>
    `;
    const renderGrid = () => {
      const filt = document.getElementById("noteCategoryFilter").value;
      const grid = document.getElementById("notesGrid");
      const notes = AppState.notes.filter(n => !filt || n.category === filt).slice().reverse();
      grid.innerHTML = notes.map(n => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;"><span class="badge core">${this.esc(n.category)}</span>
          <button class="btn btn-sm btn-ghost" data-note-delete="${n.id}" aria-label="Delete note">✕</button></div>
          <h3 style="font-family:var(--font-serif);font-size:15px;margin-top:8px;color:var(--text-1);">${this.esc(n.title)}</h3>
          <p style="font-size:13px;color:var(--text-2);margin-top:6px;white-space:pre-wrap;">${this.esc(n.body)}</p>
          <div class="label-sm" style="margin-top:8px;">${this.esc(n.date)}</div>
        </div>
      `).join("") || `<div class="empty-state" style="grid-column:1/-1;"><h3>No notes yet</h3><p>Capture a formula, strategy, or tricky word.</p></div>`;
      grid.querySelectorAll("[data-note-delete]").forEach(btn => btn.addEventListener("click", () => {
        AppState.notes = AppState.notes.filter(n => n.id !== btn.getAttribute("data-note-delete"));
        this.persist(); renderGrid(); this.toast("Note deleted.");
      }));
    };
    renderGrid();
    document.getElementById("noteCategoryFilter").addEventListener("change", renderGrid);
    document.getElementById("addNoteBtn").addEventListener("click", () => this.openNoteForm(renderGrid));
  },

  openNoteForm(after) {
    document.getElementById("modalTitle").textContent = "Add Note";
    const body = document.getElementById("modalBody");
    body.innerHTML = `
      <div class="form-field"><label>Category</label>
        <select id="nf-category"><option>Subject</option><option>Book</option><option>Formula</option><option>Vocabulary</option><option>Strategy</option><option>Mistake</option></select>
      </div>
      <div class="form-field"><label>Title</label><input type="text" id="nf-title"></div>
      <div class="form-field"><label>Content</label><textarea id="nf-body" style="min-height:120px;"></textarea></div>
      <div class="form-actions">
        <button class="btn" id="cancelNote">Cancel</button>
        <button class="btn btn-primary" id="saveNote">Save Note</button>
      </div>
    `;
    document.getElementById("cancelNote").addEventListener("click", () => this.hideModal());
    document.getElementById("saveNote").addEventListener("click", () => {
      const title = document.getElementById("nf-title").value.trim();
      if (!title) { this.toast("Please enter a title."); return; }
      AppState.notes.push({
        id: "note" + Date.now(), category: document.getElementById("nf-category").value,
        title, body: document.getElementById("nf-body").value.trim(),
        date: new Date().toISOString().slice(0, 10)
      });
      this.persist(); this.hideModal(); this.toast("Note saved.");
      if (after) after(); else this.renderCurrentPage();
    });
    this.showModal();
  },

  /* ==================== PROGRESS ==================== */
  renderProgress() {
    const el = document.getElementById("page-progress");
    const overall = Planner.overallProgress(AppState);
    const streak = Planner.recalcStreak(AppState);
    const tests = AppState.mockTests;
    const accuracy = (() => {
      const totalQ = AppState.errorLog.length + tests.reduce((s,t)=>s+t.total,0);
      return null; // Not fabricated — see note below
    })();
    el.innerHTML = `
      <div class="page-head"><h1>Progress Analytics</h1><div class="sub">Everything here is computed from your own recorded activity.</div></div>
      <div class="grid grid-3" style="margin-bottom:16px;">
        <div class="card"><h3>Overall Progress</h3><div class="big-number">${overall}%</div>
          <div class="progress-track"><div class="progress-fill" style="width:${overall}%"></div></div></div>
        <div class="card"><h3>Mathematics</h3><div class="big-number">${Planner.subjectProgress("math", AppState)}%</div>
          <div class="progress-track"><div class="progress-fill" style="width:${Planner.subjectProgress("math", AppState)}%"></div></div></div>
        <div class="card"><h3>English</h3><div class="big-number">${Planner.subjectProgress("english", AppState)}%</div>
          <div class="progress-track"><div class="progress-fill green" style="width:${Planner.subjectProgress("english", AppState)}%"></div></div></div>
      </div>
      <div class="grid grid-4" style="margin-bottom:16px;">
        <div class="card"><h3>Analytical</h3><div class="big-number">${Planner.subjectProgress("analytical", AppState)}%</div></div>
        <div class="card"><h3>Days Completed</h3><div class="big-number">${Planner.daysCompletedCount(AppState)}/100</div></div>
        <div class="card"><h3>Current Streak</h3><div class="big-number">${streak.current}</div></div>
        <div class="card"><h3>Mock Tests</h3><div class="big-number">${tests.length}</div></div>
      </div>
      <h2 class="section-title">Mock Test Trend</h2>
      ${tests.length === 0
        ? `<div class="empty-state"><h3>No mock tests recorded yet</h3><p>Scores will chart here once you log a test in the Mock Test Center.</p></div>`
        : `<div class="table-wrap"><table><thead><tr><th>Test</th><th>Date</th><th>Score %</th></tr></thead><tbody>
            ${tests.map(t => `<tr><td>${this.esc(t.name)}</td><td>${this.esc(t.date)}</td><td>${Math.round(t.score/t.total*100)}%</td></tr>`).join("")}
          </tbody></table></div>`}
      <h2 class="section-title">Weak Topics Summary</h2>
      ${(() => {
        const w = Planner.weakTopics(AppState);
        const flat = [].concat(w.math, w.english, w.analytical);
        return flat.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">${flat.map(t => `<span class="badge weak">${this.esc(t)}</span>`).join("")}</div>`
          : `<div class="empty-state"><h3>No weak topics marked</h3></div>`;
      })()}
    `;
  },

  /* ==================== VOCAB PRACTICE (AI-generated) ==================== */
  renderVocab() {
    const el = document.getElementById("page-vocab");
    if (this._vocab && this._vocab.mode !== "intro") {
      this.renderVocabState();
      return;
    }
    const masteredCount = Object.values(AppState.vocabMastery).filter(v => v.mastered).length;
    el.innerHTML = `
      <div class="page-head"><h1>Vocab Practice</h1><div class="sub">AI-generated definitions, synonyms, examples and quizzes for real Word Smart 1 words — each word is genuinely fetched, not a canned template.</div></div>
      <div class="grid grid-3" style="margin-bottom:18px;">
        <div class="card"><h3>Words Mastered</h3><div class="big-number">${masteredCount}</div><div class="label-sm">of ${VOCAB_SEED_WORDS.length} in the starter list</div></div>
        <div class="card"><h3>AI Provider</h3><div class="big-number" style="font-size:18px;">${GeminiService.hasApiKey() ? this.esc(GeminiService.providerLabel()) : "Not set"}</div>
          ${!GeminiService.hasApiKey() ? `<button class="btn btn-sm" id="vocabGoSettings" style="margin-top:8px;">Add key in Settings</button>` : ""}</div>
        <div class="card"><h3>How it works</h3><p style="font-size:12.5px;color:var(--text-2);">Pick a batch size. Missed words are retested in the next round until you hit 100% for that batch.</p></div>
      </div>
      <div class="card" style="max-width:420px;">
        <h3>Start a batch</h3>
        <div class="form-actions" style="justify-content:flex-start;margin-top:12px;">
          <button class="btn btn-primary" data-start-batch="25">25 words</button>
          <button class="btn btn-primary" data-start-batch="30">30 words</button>
        </div>
      </div>
    `;
    const goBtn = document.getElementById("vocabGoSettings");
    if (goBtn) goBtn.addEventListener("click", () => App.navigate("settings"));
    el.querySelectorAll("[data-start-batch]").forEach(btn => btn.addEventListener("click", () => {
      if (!GeminiService.hasApiKey()) { this.needAiKeyModal(); return; }
      this.startVocabBatch(Number(btn.getAttribute("data-start-batch")));
    }));
  },

  startVocabBatch(size) {
    const unmastered = VOCAB_SEED_WORDS.filter(w => !(AppState.vocabMastery[w] && AppState.vocabMastery[w].mastered));
    const batch = (unmastered.length ? unmastered : VOCAB_SEED_WORDS).slice(0, size);
    if (batch.length === 0) { this.toast("All starter words are already mastered!"); return; }
    this._vocab = { batch, queue: batch.slice(), missed: [], round: 1, mode: "loading", item: null, quizPicked: null };
    this.renderVocabState();
    this.loadVocabWord();
  },

  async loadVocabWord() {
    const v = this._vocab;
    const el = document.getElementById("page-vocab");
    if (v.queue.length === 0) {
      if (v.missed.length > 0) {
        v.round++; v.queue = v.missed.slice(); v.missed = [];
      } else {
        v.mode = "done"; this.renderVocabState(); return;
      }
    }
    const word = v.queue[0];
    v.mode = "loading";
    this.renderVocabState();
    try {
      let item;
      if (AppState.vocabMastery[word] && AppState.vocabMastery[word].data) {
        item = AppState.vocabMastery[word].data;
      } else {
        item = await GeminiService.generateVocabItem(word);
        AppState.vocabMastery[word] = AppState.vocabMastery[word] || { mastered: false, misses: 0 };
        AppState.vocabMastery[word].data = item;
        this.persist();
      }
      v.item = item; v.mode = "card"; v.quizPicked = null;
      this.renderVocabState();
    } catch (err) {
      v.mode = "error"; v.error = this.friendlyGeminiError(err);
      this.renderVocabState();
    }
  },

  renderVocabState() {
    const el = document.getElementById("page-vocab");
    if (!el) return;
    const v = this._vocab;
    if (!v) { this.renderVocab(); return; }

    if (v.mode === "loading") {
      el.innerHTML = `<div class="page-head"><h1>Vocab Practice</h1></div><div class="empty-state"><h3>Generating…</h3><p>Asking the AI for "${this.esc(v.queue[0] || "")}" — definition, synonyms, example and quiz.</p></div>`;
      return;
    }
    if (v.mode === "error") {
      el.innerHTML = `<div class="page-head"><h1>Vocab Practice</h1></div><div class="empty-state"><h3>Couldn't generate this word</h3><p>${this.esc(v.error)}</p></div>
        <div class="form-actions" style="justify-content:center;margin-top:14px;"><button class="btn" id="vocabRetry">Retry</button><button class="btn" id="vocabExit">Exit</button></div>`;
      document.getElementById("vocabRetry").addEventListener("click", () => this.loadVocabWord());
      document.getElementById("vocabExit").addEventListener("click", () => { this._vocab = null; this.renderVocab(); });
      return;
    }
    if (v.mode === "done") {
      el.innerHTML = `<div class="page-head"><h1>Vocab Practice</h1></div>
        <div class="card" style="text-align:center;padding:36px 20px;">
          <h3 style="font-family:var(--font-serif);font-size:20px;">Batch mastered — ${v.batch.length}/${v.batch.length} 🎉</h3>
          <p class="label-sm" style="margin-top:8px;">Took ${v.round} round${v.round > 1 ? "s" : ""} to get every word right.</p>
          <div class="form-actions" style="justify-content:center;margin-top:16px;"><button class="btn btn-primary" id="vocabDoneExit">Back to Vocab Practice</button></div>
        </div>`;
      document.getElementById("vocabDoneExit").addEventListener("click", () => { this._vocab = null; this.renderVocab(); });
      return;
    }

    const item = v.item;
    const progress = `${v.batch.length - v.queue.length - (v.mode === "card" || v.mode === "quiz" ? 0 : 0)}/${v.batch.length} this round · Round ${v.round}`;
    if (v.mode === "card") {
      el.innerHTML = `
        <div class="page-head"><h1>Vocab Practice</h1><div class="sub">${this.esc(progress)} · ${v.queue.length} left this round</div></div>
        <div class="card" style="max-width:520px;">
          <h3 style="font-family:var(--font-serif);font-size:24px;color:var(--text-1);">${this.esc(item.word)}</h3>
          <p class="label-sm">${this.esc(item.pronunciation || "")}</p>
          <div class="form-actions" style="justify-content:flex-start;margin:10px 0;">
            <button class="btn btn-sm" id="vocabListen">🔊 Listen</button>
          </div>
          <p style="font-size:14px;margin-top:8px;"><strong>Definition:</strong> ${this.esc(item.definition)}</p>
          <p style="font-size:13.5px;margin-top:8px;color:var(--text-2);"><strong>Synonyms:</strong> ${(item.synonyms || []).map(s => this.esc(s)).join(", ")}</p>
          <p style="font-size:13.5px;margin-top:8px;color:var(--text-2);font-style:italic;">"${this.esc(item.example)}"</p>
          <div class="form-actions" style="margin-top:16px;">
            <button class="btn" id="vocabExitMid">Exit</button>
            <button class="btn btn-primary" id="vocabToQuiz">Continue to Quiz →</button>
          </div>
        </div>`;
      document.getElementById("vocabListen").addEventListener("click", () => Speech.speak(item.word));
      document.getElementById("vocabExitMid").addEventListener("click", () => { this._vocab = null; this.renderVocab(); });
      document.getElementById("vocabToQuiz").addEventListener("click", () => { v.mode = "quiz"; this.renderVocabState(); });
      return;
    }
    if (v.mode === "quiz") {
      const picked = v.quizPicked;
      el.innerHTML = `
        <div class="page-head"><h1>Vocab Practice</h1><div class="sub">${this.esc(progress)}</div></div>
        <div class="card" style="max-width:520px;">
          <p style="font-size:15px;">${this.esc(item.quiz.question)}</p>
          <div class="exam-options" style="margin-top:12px;">
            ${item.quiz.options.map(o => {
              let cls = "exam-option-btn";
              if (picked) {
                if (o.id === item.quiz.correctOptionId) cls += " selected";
                else if (o.id === picked) cls += " wrong";
              }
              return `<button class="${cls}" data-quiz-pick="${o.id}" ${picked ? "disabled" : ""}>
                <span class="exam-option-letter">${o.id.toUpperCase()}</span> ${this.esc(o.text)}</button>`;
            }).join("")}
          </div>
          ${picked ? `<p style="margin-top:12px;font-size:13.5px;font-weight:600;color:${picked === item.quiz.correctOptionId ? "var(--green-600)" : "var(--red-600)"};">
              ${picked === item.quiz.correctOptionId ? "Correct!" : "Not quite — correct answer highlighted above."}</p>` : ""}
          <div class="form-actions" style="margin-top:14px;">
            <button class="btn" id="vocabExitMid2">Exit</button>
            ${picked ? `<button class="btn btn-primary" id="vocabNextWord">Next word →</button>` : ""}
          </div>
        </div>`;
      document.getElementById("vocabExitMid2").addEventListener("click", () => { this._vocab = null; this.renderVocab(); });
      if (!picked) {
        el.querySelectorAll("[data-quiz-pick]").forEach(btn => btn.addEventListener("click", () => {
          v.quizPicked = btn.getAttribute("data-quiz-pick");
          const correct = v.quizPicked === item.quiz.correctOptionId;
          const word = v.queue[0];
          if (correct) {
            AppState.vocabMastery[word].mastered = true;
          } else {
            AppState.vocabMastery[word].misses = (AppState.vocabMastery[word].misses || 0) + 1;
            if (!v.missed.includes(word)) v.missed.push(word);
          }
          this.persist();
          this.renderVocabState();
        }));
      } else {
        document.getElementById("vocabNextWord").addEventListener("click", () => {
          v.queue.shift();
          this.loadVocabWord();
        });
      }
      return;
    }
  },

  /* ==================== SETTINGS ==================== */
  renderSettings() {
    const el = document.getElementById("page-settings");
    const s = AppState.settings;
    el.innerHTML = `
      <div class="page-head"><h1>Settings</h1><div class="sub">No account required — everything is stored locally in this browser.</div></div>
      <div class="card" style="max-width:560px;">
        <div class="form-field"><label>Exam date (optional)</label><input type="date" id="st-examdate" value="${s.examDate}"></div>
        <div class="form-field"><label>Plan start date (optional — if set, Day X is calculated automatically)</label><input type="date" id="st-startdate" value="${s.startDate}"></div>
        <div class="form-field"><label>Daily study hours</label><input type="number" id="st-hours" min="1" max="10" value="${s.dailyHours}"></div>
        <div class="form-field"><label>Preferred study time</label>
          <select id="st-time">
            <option value="morning" ${s.preferredTime === "morning" ? "selected" : ""}>Morning</option>
            <option value="afternoon" ${s.preferredTime === "afternoon" ? "selected" : ""}>Afternoon</option>
            <option value="evening" ${s.preferredTime === "evening" ? "selected" : ""}>Evening</option>
            <option value="night" ${s.preferredTime === "night" ? "selected" : ""}>Night</option>
          </select>
        </div>
        <div class="form-field"><label>Default daily question target</label><input type="number" id="st-qtarget" min="5" value="${s.questionTarget}"></div>
        <div class="form-field"><label>Default daily vocabulary target</label><input type="number" id="st-vtarget" min="5" value="${s.vocabTarget}"></div>
        <div class="form-actions">
          <button class="btn btn-primary" id="saveSettings">Save Settings</button>
        </div>
      </div>
      ${this.aiSettingsCardHtml(s)}
      <div class="card" style="max-width:560px;margin-top:16px;">
        <h3>Manual Day Pointer</h3>
        <p class="label-sm" style="margin-top:4px;">Used only when no start date is set above.</p>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
          <button class="btn btn-sm" id="dayBack">−1 Day</button>
          <strong>Day ${AppState.currentDayPointer}</strong>
          <button class="btn btn-sm" id="dayForward">+1 Day</button>
        </div>
      </div>
      <div class="card" style="max-width:560px;margin-top:16px;">
        <h3>Reset</h3>
        <p class="label-sm" style="margin-top:4px;">Clears all saved progress from this browser. This cannot be undone.</p>
        <div class="form-actions" style="justify-content:flex-start;margin-top:10px;">
          <button class="btn btn-danger" id="resetAll">Reset All Progress</button>
        </div>
      </div>
    `;
    document.getElementById("saveSettings").addEventListener("click", () => {
      s.examDate = document.getElementById("st-examdate").value;
      s.startDate = document.getElementById("st-startdate").value;
      s.dailyHours = Number(document.getElementById("st-hours").value) || 3;
      s.preferredTime = document.getElementById("st-time").value;
      s.questionTarget = Number(document.getElementById("st-qtarget").value) || 20;
      s.vocabTarget = Number(document.getElementById("st-vtarget").value) || 25;
      this.persist();
      this.toast("Settings saved.");
      this.refreshChrome();
      this.renderCurrentPage();
    });
    this.bindAiSettings(s);
    document.getElementById("dayBack").addEventListener("click", () => {
      AppState.currentDayPointer = Math.max(1, AppState.currentDayPointer - 1);
      this.persist(); this.refreshChrome(); this.renderCurrentPage();
    });
    document.getElementById("dayForward").addEventListener("click", () => {
      AppState.currentDayPointer = Math.min(100, AppState.currentDayPointer + 1);
      this.persist(); this.refreshChrome(); this.renderCurrentPage();
    });
    document.getElementById("resetAll").addEventListener("click", () => {
      if (confirm("This will permanently erase all saved progress. Continue?")) {
        Storage.reset();
        AppState = Storage.load();
        this.toast("All progress reset.");
        this.refreshChrome();
        this.renderCurrentPage();
      }
    });
  },

  /* ==================== SEARCH ==================== */
  runSearch(query) {
    const resultsEl = document.getElementById("searchResults");
    if (!query.trim()) { resultsEl.hidden = true; resultsEl.innerHTML = ""; return; }
    const r = Planner.search(query, AppState);
    const totalCount = r.books.length + r.topics.length + r.days.length + r.notes.length + r.errors.length;
    let html = "";
    if (totalCount === 0) {
      html = `<div class="search-empty">No matches for "${this.esc(query)}"</div>`;
    } else {
      if (r.books.length) html += `<div class="search-group">Books</div>` + r.books.map(b => `<div class="search-result-item" data-goto-page="books">${this.esc(b.name)}<div class="meta">${this.esc(b.priority)}</div></div>`).join("");
      if (r.topics.length) html += `<div class="search-group">Topics</div>` + r.topics.slice(0,6).map(t => `<div class="search-result-item" data-goto-page="subjects">${this.esc(t.name)}<div class="meta">${this.esc(CURRICULUM[t.subject].label)}</div></div>`).join("");
      if (r.days.length) html += `<div class="search-group">Days</div>` + r.days.slice(0,6).map(d => `<div class="search-result-item" data-open-day-search="${d.day}">Day ${d.day}<div class="meta">${this.esc(d.goal.slice(0,70))}</div></div>`).join("");
      if (r.notes.length) html += `<div class="search-group">Notes</div>` + r.notes.slice(0,6).map(n => `<div class="search-result-item" data-goto-page="notes">${this.esc(n.title)}</div>`).join("");
      if (r.errors.length) html += `<div class="search-group">Error Log</div>` + r.errors.slice(0,6).map(e => `<div class="search-result-item" data-goto-page="errors">${this.esc(e.question.slice(0,60))}</div>`).join("");
    }
    resultsEl.innerHTML = html;
    resultsEl.hidden = false;
    resultsEl.querySelectorAll("[data-goto-page]").forEach(item => item.addEventListener("click", () => {
      App.navigate(item.getAttribute("data-goto-page"));
      resultsEl.hidden = true;
      document.getElementById("globalSearch").value = "";
    }));
    resultsEl.querySelectorAll("[data-open-day-search]").forEach(item => item.addEventListener("click", () => {
      this.openDayModal(Number(item.getAttribute("data-open-day-search")));
      resultsEl.hidden = true;
      document.getElementById("globalSearch").value = "";
    }));
  },

  /* ==================== PAGE ROUTER ==================== */

  /* ==================== AI MOCK TEST: GENERATE BY TOPIC (no photos) ==================== */
  openTopicMockForm() {
    if (!GeminiService.hasApiKey()) { this.needAiKeyModal(); return; }
    document.getElementById("modalTitle").textContent = "Generate Mock Test";
    document.getElementById("modalBody").innerHTML = `
      <p style="font-size:13px;color:var(--text-2);margin-bottom:12px;">Builds brand-new IBA-style MCQs with <strong>${this.esc(GeminiService.providerLabel())}</strong>, then runs them in the timed exam. AI answer keys can occasionally be wrong — if an answer looks off, check the worked explanation in Review.</p>
      <div class="form-grid">
        <div class="form-field"><label>Subject</label>
          <select id="tm-subject"><option value="mixed">Mixed (Math + English + Analytical)</option><option value="math">Mathematics</option><option value="english">English</option><option value="analytical">Analytical</option></select></div>
        <div class="form-field"><label>Topic (optional)</label>
          <input type="text" id="tm-topic" list="tm-topic-list" placeholder="Pick a subject first" disabled><datalist id="tm-topic-list"></datalist></div>
        <div class="form-field"><label>Number of questions</label><input type="number" id="tm-count" value="20" min="5" max="60"></div>
        <div class="form-field"><label>Difficulty</label>
          <select id="tm-diff"><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="IBA-level (moderately hard)" selected>IBA-level</option><option value="Hard">Hard</option></select></div>
      </div>
      <div id="tmStatus" style="font-size:13px;color:var(--text-2);"></div>
      <div class="form-actions">
        <button class="btn" id="tmCancel">Cancel</button>
        <button class="btn btn-primary" id="tmRun">Generate &amp; Start</button>
      </div>`;
    const subj = document.getElementById("tm-subject"), topic = document.getElementById("tm-topic"), list = document.getElementById("tm-topic-list");
    subj.addEventListener("change", () => {
      const key = subj.value;
      if (key === "mixed" || !CURRICULUM[key]) { topic.value = ""; topic.disabled = true; topic.placeholder = "Pick a subject first"; list.innerHTML = ""; return; }
      topic.disabled = false; topic.placeholder = "e.g. " + CURRICULUM[key].topics[0].name;
      list.innerHTML = CURRICULUM[key].topics.map(t => `<option value="${this.esc(t.name)}">`).join("");
    });
    document.getElementById("tmCancel").addEventListener("click", () => this.hideModal());
    document.getElementById("tmRun").addEventListener("click", async () => {
      const runBtn = document.getElementById("tmRun"), status = document.getElementById("tmStatus");
      const count = Math.max(5, Math.min(60, Number(document.getElementById("tm-count").value) || 20));
      runBtn.disabled = true;
      status.textContent = "Generating questions… (about " + Math.ceil(count / 10) + " AI request" + (count > 10 ? "s" : "") + ")";
      try {
        const questions = await GeminiService.generateMockQuestions({
          subject: subj.value, topic: topic.value.trim(), count,
          difficulty: document.getElementById("tm-diff").value,
          onProgress: (done, total) => { status.textContent = `Generated ${done} of ${total} questions…`; }
        });
        this.hideModal();
        this.toast(`Generated ${questions.length} questions.`);
        this.startExamRunner(questions);
      } catch (err) {
        runBtn.disabled = false;
        status.textContent = this.friendlyGeminiError(err);
      }
    });
    this.showModal();
  },

  /* ==================== VIVA PRACTICE ==================== */
  renderViva() {
    const el = document.getElementById("page-viva");
    if (this._viva && this._viva.mode !== "intro") { this.renderVivaState(); return; }
    const sessions = AppState.vivaSessions || [];
    const avg = sessions.length ? (sessions.reduce((t, x) => t + x.avgScore, 0) / sessions.length).toFixed(1) : "—";
    const last = sessions.length ? sessions[sessions.length - 1].avgScore.toFixed(1) : "—";
    el.innerHTML = `
      <div class="page-head"><h1>VIVA Practice</h1><div class="sub">A mock IBA MBA interview: the AI panel asks, you answer (typed or by voice), and every answer is scored with feedback and a model answer.</div></div>
      <div class="grid grid-3" style="margin-bottom:18px;">
        <div class="card"><h3>Sessions Done</h3><div class="big-number">${sessions.length}</div></div>
        <div class="card"><h3>Average Score</h3><div class="big-number">${avg}${sessions.length ? " / 10" : ""}</div></div>
        <div class="card"><h3>Latest Session</h3><div class="big-number">${last}${sessions.length ? " / 10" : ""}</div></div>
      </div>
      <div class="card" style="max-width:600px;">
        <h3>Start a VIVA</h3>
        <div class="form-grid" style="margin-top:10px;">
          <div class="form-field"><label>Focus</label>
            <select id="vv-focus">
              <option value="mixed">Realistic mix</option>
              <option value="personal">About me &amp; motivation</option>
              <option value="business">Business &amp; economy</option>
              <option value="situational">Situational / leadership</option>
              <option value="current">Current affairs</option>
            </select></div>
          <div class="form-field"><label>Questions</label>
            <select id="vv-count"><option value="5">5 (quick)</option><option value="8" selected>8</option><option value="10">10 (full)</option></select></div>
          <div class="form-field full"><label>Panel</label>
            <select id="vv-engine">
              <option value="local">Built-in panel — no API key, works offline</option>
              <option value="ai" ${GeminiService.hasApiKey() ? "" : "disabled"}>AI panel${GeminiService.hasApiKey() ? " (" + this.esc(GeminiService.providerLabel()) + ")" : " — set up a provider in Settings first"}</option>
            </select></div>
          <div class="form-field full"><label>About you (optional — tailors the personal questions)</label>
            <textarea id="vv-profile" placeholder="e.g. BBA from NSU, 2 years in sales at a FMCG company, want to move into marketing management">${this.esc(AppState.vivaProfile || "")}</textarea></div>
        </div>
        <div class="form-actions" style="justify-content:flex-start;"><button class="btn btn-primary" id="vvStart">Start VIVA</button></div>
        <p class="label-sm" style="margin-top:8px;">The <strong>built-in panel</strong> needs no key and no internet: it asks from a bank of real IBA-style viva questions and scores each answer on coverage, specificity, structure, length and filler, then shows a model answer. The <strong>AI panel</strong> writes questions tailored to your background and gives free-form feedback, but needs a provider key in Settings. Either way the scoring is practice feedback, not a prediction of the real panel.</p>
      </div>
      ${sessions.length ? `<div class="card" style="max-width:600px;margin-top:16px;"><h3>Past sessions</h3>
        <div class="table-wrap"><table><thead><tr><th>Date</th><th>Focus</th><th>Qs</th><th>Avg</th></tr></thead><tbody>
        ${sessions.slice().reverse().slice(0, 10).map(x => `<tr><td>${this.esc(x.date)}</td><td>${this.esc(x.focus)}</td><td>${x.count}</td><td>${x.avgScore.toFixed(1)}/10</td></tr>`).join("")}
        </tbody></table></div></div>` : ""}
    `;
    document.getElementById("vvStart").addEventListener("click", () => {
      const engine = document.getElementById("vv-engine").value;
      if (engine === "ai" && !GeminiService.hasApiKey()) { this.needAiKeyModal(); return; }
      AppState.vivaProfile = document.getElementById("vv-profile").value.trim();
      this.persist();
      this.startViva(document.getElementById("vv-focus").value, Number(document.getElementById("vv-count").value), engine);
    });
  },

  async startViva(focus, count, engine) {
    engine = engine || "local";
    this._viva = { mode: "loading", msg: "Your panel is preparing questions…", focus, count, engine, questions: [], idx: 0, results: [], draft: "", saved: false };
    this.renderVivaState();
    try {
      this._viva.questions = engine === "local"
        ? LocalViva.pick(focus, count, AppState.vivaProfile)
        : await GeminiService.generateVivaQuestions({ focus, count, profile: AppState.vivaProfile });
      this._viva.mode = "question";
    } catch (err) {
      this._viva.mode = "error";
      this._viva.error = this.friendlyGeminiError(err) + " You can run the built-in panel instead — it needs no key.";
      this._viva.retry = () => this.startViva(focus, count, "local");
    }
    this.renderVivaState();
  },

  stopVivaMic() {
    if (this._vivaRec) { try { this._vivaRec.stop(); } catch (e) { /* ignore */ } this._vivaRec = null; }
  },

  exitViva() { this.stopVivaMic(); Speech.stop(); this._viva = null; this.renderViva(); },

  renderVivaState() {
    const el = document.getElementById("page-viva");
    if (!el) return;
    const v = this._viva;
    if (!v) { this.renderViva(); return; }
    const head = (sub) => `<div class="page-head"><h1>VIVA Practice</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div>`;

    if (v.mode === "loading") {
      el.innerHTML = head("") + `<div class="empty-state"><h3>Please wait…</h3><p>${this.esc(v.msg)}</p></div>`;
      return;
    }
    if (v.mode === "error") {
      el.innerHTML = head("") + `<div class="empty-state"><h3>That didn't work</h3><p>${this.esc(v.error)}</p></div>
        <div class="form-actions" style="justify-content:center;margin-top:14px;"><button class="btn btn-primary" id="vvRetry">Try again</button><button class="btn" id="vvExit">Exit</button></div>`;
      document.getElementById("vvRetry").addEventListener("click", () => { if (v.retry) v.retry(); });
      document.getElementById("vvExit").addEventListener("click", () => this.exitViva());
      return;
    }

    const total = v.questions.length;
    if (v.mode === "question") {
      const q = v.questions[v.idx];
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      el.innerHTML = head(`Question ${v.idx + 1} of ${total}`) + `
        <div class="card" style="max-width:680px;">
          <span class="badge core">${this.esc(q.category)}</span>
          <p style="font-family:var(--font-serif);font-size:19px;line-height:1.45;margin:12px 0;">${this.esc(q.question)}</p>
          <div class="form-actions" style="justify-content:flex-start;margin:0 0 10px;">
            <button class="btn btn-sm" id="vvHear">🔊 Hear the question</button>
            ${SR ? `<button class="btn btn-sm" id="vvMic">🎤 Dictate answer</button>` : ""}
          </div>
          <div class="form-field"><label>Your answer</label>
            <textarea id="vv-answer" style="min-height:160px;" placeholder="Answer as you would in the room — aim for 30–90 seconds when spoken (roughly 80–200 words).">${this.esc(v.draft)}</textarea></div>
          <p class="label-sm" id="vvCount"></p>
          <div class="form-actions">
            <button class="btn" id="vvExit">End session</button>
            <button class="btn" id="vvSkip">Skip</button>
            <button class="btn btn-primary" id="vvSubmit">Submit answer</button>
          </div>
        </div>`;
      const ta = document.getElementById("vv-answer");
      const updateCount = () => { const w = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; document.getElementById("vvCount").textContent = w + " words"; v.draft = ta.value; };
      ta.addEventListener("input", updateCount); updateCount();
      document.getElementById("vvHear").addEventListener("click", () => { if (!Speech.speak(q.question)) this.toast("Your browser can't read aloud."); });
      document.getElementById("vvExit").addEventListener("click", () => { if (confirm("End this session? Your answers so far won't be saved.")) this.exitViva(); });
      document.getElementById("vvSkip").addEventListener("click", () => { this.stopVivaMic(); this.recordVivaResult({ skipped: true, score: 0, answer: "" }); });
      document.getElementById("vvSubmit").addEventListener("click", () => this.submitVivaAnswer());
      const mic = document.getElementById("vvMic");
      if (mic) mic.addEventListener("click", () => {
        if (this._vivaRec) { this.stopVivaMic(); mic.textContent = "🎤 Dictate answer"; return; }
        try {
          const rec = new SR(); rec.lang = "en-US"; rec.continuous = true; rec.interimResults = false;
          rec.onresult = (e) => {
            let add = ""; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) add += e.results[i][0].transcript + " ";
            if (add) { ta.value = (ta.value ? ta.value.replace(/\s*$/, " ") : "") + add; updateCount(); }
          };
          rec.onerror = () => { this._vivaRec = null; mic.textContent = "🎤 Dictate answer"; this.toast("Microphone unavailable — type your answer instead."); };
          rec.onend = () => { this._vivaRec = null; mic.textContent = "🎤 Dictate answer"; };
          rec.start(); this._vivaRec = rec; mic.textContent = "⏹ Stop dictation";
        } catch (e) { this.toast("Couldn't start the microphone."); }
      });
      return;
    }

    if (v.mode === "evaluating") {
      el.innerHTML = head(`Question ${v.idx + 1} of ${total}`) + `<div class="empty-state"><h3>The panel is scoring your answer…</h3><p>${this.esc(GeminiService.providerLabel())} is reviewing it.</p></div>`;
      return;
    }

    if (v.mode === "feedback") {
      const r = v.results[v.idx], q = v.questions[v.idx];
      const pct = r.score * 10, isLast = v.idx === total - 1;
      const list = (arr) => arr.length ? `<ul style="margin:6px 0 0 18px;font-size:13.5px;line-height:1.55;">${arr.map(x => `<li>${this.esc(x)}</li>`).join("")}</ul>` : `<p class="label-sm">—</p>`;
      el.innerHTML = head(`Question ${v.idx + 1} of ${total}`) + `
        <div class="card" style="max-width:680px;">
          <p class="label-sm">${this.esc(q.question)}</p>
          <div class="big-number" style="font-size:34px;margin-top:6px;">${r.score.toFixed(1)} <span style="font-size:16px;color:var(--text-2);">/ 10</span></div>
          <div class="progress-track" style="margin:8px 0;"><div class="progress-fill ${pct < 50 ? "red" : "green"}" style="width:${pct}%"></div></div>
          <p style="font-size:14px;margin-top:6px;">${this.esc(r.verdict)}</p>
          ${r.breakdown ? `<p class="label-sm">${r.breakdown.words} words · ${r.breakdown.covered}/${r.breakdown.totalPoints} expected points covered · specificity ${r.breakdown.specificity}/4 · structure ${r.breakdown.structure}/4${r.breakdown.filler ? ` · ${r.breakdown.filler} filler phrase(s)` : ""}</p>` : ""}
          <h3 style="margin-top:14px;">What worked</h3>${list(r.strengths)}
          <h3 style="margin-top:14px;">To improve</h3>${list(r.improvements)}
          <details style="margin-top:14px;"><summary style="cursor:pointer;font-weight:600;font-size:13.5px;">See a model answer</summary>
            <p style="font-size:13.5px;line-height:1.6;margin-top:8px;color:var(--text-2);">${this.esc(r.modelAnswer)}</p></details>
          <div class="form-actions"><button class="btn" id="vvExit">End session</button><button class="btn btn-primary" id="vvNext">${isLast ? "See results" : "Next question →"}</button></div>
        </div>`;
      document.getElementById("vvExit").addEventListener("click", () => { if (confirm("End this session? It won't be saved.")) this.exitViva(); });
      document.getElementById("vvNext").addEventListener("click", () => {
        v.draft = "";
        if (isLast) { v.mode = "summary"; } else { v.idx++; v.mode = "question"; }
        this.renderVivaState();
      });
      return;
    }

    if (v.mode === "summary") {
      const scored = v.results.filter(r => !r.skipped);
      const avg = v.results.length ? v.results.reduce((t, r) => t + r.score, 0) / v.results.length : 0;
      if (!v.saved) {
        AppState.vivaSessions.push({
          id: "viva" + Date.now(), date: new Date().toISOString().slice(0, 10), focus: v.focus, count: v.results.length, avgScore: avg,
          items: v.results.map((r, i) => ({ question: v.questions[i].question, category: v.questions[i].category, answer: (r.answer || "").slice(0, 2000), score: r.score, skipped: !!r.skipped }))
        });
        v.saved = true; this.persist();
      }
      const weakest = scored.length ? scored.map((r, i) => ({ r, q: v.questions[v.results.indexOf(r)] })).sort((a, b) => a.r.score - b.r.score)[0] : null;
      el.innerHTML = head("Session complete") + `
        <div class="card" style="max-width:680px;">
          <div class="big-number" style="font-size:36px;">${avg.toFixed(1)} <span style="font-size:16px;color:var(--text-2);">/ 10 average</span></div>
          <p class="label-sm">${scored.length} answered · ${v.results.length - scored.length} skipped (skips count as 0)</p>
          <div class="table-wrap" style="margin-top:12px;"><table><thead><tr><th>#</th><th>Question</th><th>Score</th></tr></thead><tbody>
            ${v.results.map((r, i) => `<tr><td>${i + 1}</td><td>${this.esc(v.questions[i].question)}</td><td>${r.skipped ? "skipped" : r.score.toFixed(1)}</td></tr>`).join("")}
          </tbody></table></div>
          ${weakest ? `<p style="font-size:13.5px;margin-top:12px;color:var(--text-2);">Lowest-scoring answer: <strong>“${this.esc(weakest.q.question)}”</strong> — re-read its model answer and try again.</p>` : ""}
          <div class="form-actions"><button class="btn btn-primary" id="vvDone">Back to VIVA Practice</button></div>
        </div>`;
      document.getElementById("vvDone").addEventListener("click", () => this.exitViva());
    }
  },

  async submitVivaAnswer() {
    const v = this._viva, ta = document.getElementById("vv-answer");
    const answer = (ta ? ta.value : v.draft).trim();
    if (answer.split(/\s+/).filter(Boolean).length < 5) { this.toast("Write a few sentences first (or press Skip)."); return; }
    this.stopVivaMic(); Speech.stop();
    v.draft = answer;
    if (v.engine === "local") {
      const fb = LocalViva.evaluate(v.questions[v.idx], answer);
      this.recordVivaResult(Object.assign({ answer }, fb));
      return;
    }
    v.mode = "evaluating"; this.renderVivaState();
    try {
      const fb = await GeminiService.evaluateVivaAnswer(v.questions[v.idx], answer, AppState.vivaProfile);
      this.recordVivaResult(Object.assign({ answer }, fb));
    } catch (err) {
      v.mode = "error"; v.error = this.friendlyGeminiError(err) + " Your answer is still in the box — you can also restart with the built-in panel.";
      v.retry = () => { v.mode = "question"; this.renderVivaState(); };
      this.renderVivaState();
    }
  },

  recordVivaResult(result) {
    const v = this._viva;
    v.results[v.idx] = result;
    if (result.skipped) {
      v.draft = "";
      if (v.idx === v.questions.length - 1) v.mode = "summary"; else { v.idx++; v.mode = "question"; }
    } else {
      v.mode = "feedback";
    }
    this.renderVivaState();
  },

  /* ==================== AI SETTINGS CARD ==================== */
  aiSettingsCardHtml(s) {
    const cur = GeminiService.getProvider();
    const opts = Object.keys(AI_PROVIDERS).map(id => `<option value="${id}" ${id === cur ? "selected" : ""}>${this.esc(AI_PROVIDERS[id].label)}</option>`).join("");
    return `
      <div class="card" style="max-width:560px;margin-top:16px;">
        <h3>AI Provider</h3>
        <p class="label-sm" style="margin-top:4px;">Powers Vocab, Mock-Test generation and VIVA. Each provider keeps its own key, saved only in this browser's localStorage — never in the project files. Free options come from the <a href="https://github.com/mnfst/awesome-free-llm-apis" target="_blank" rel="noopener">awesome-free-llm-apis</a> list.</p>
        <div class="form-field" style="margin-top:10px;"><label>Provider</label><select id="st-provider">${opts}</select></div>
        <div class="form-field" id="st-baseurl-wrap"><label>Base URL</label><input type="text" id="st-baseurl" placeholder="https://api.example.com/v1"></div>
        <div class="form-field"><label>API key</label>
          <div style="display:flex;gap:8px;"><input type="password" id="st-apikey" style="flex:1;"><button class="btn btn-sm" id="toggleKeyVisible" type="button">Show</button></div>
          <p class="label-sm" id="apiKeyHint"></p></div>
        <div class="form-field"><label>Model</label><input type="text" id="st-model"><p class="label-sm" id="modelHint"></p></div>
        <div class="form-actions" style="flex-wrap:wrap;">
          <button class="btn btn-primary" id="saveApiKey">Save</button>
          <button class="btn" id="testAi">Test connection</button>
          <button class="btn btn-danger" id="clearApiKey">Remove key</button>
        </div>
        <div id="aiTestResult" style="font-size:13px;margin-top:8px;"></div>
      </div>`;
  },

  bindAiSettings(s) {
    s.apiKeys = s.apiKeys || {}; s.models = s.models || {};
    const $ = (id) => document.getElementById(id);
    const fill = (provider) => {
      const p = AI_PROVIDERS[provider];
      $("st-baseurl-wrap").style.display = p.needsBaseUrl ? "" : "none";
      $("st-baseurl").value = p.needsBaseUrl ? (s.customBaseUrl || "") : "";
      $("st-apikey").value = s.apiKeys[provider] || "";
      $("st-apikey").placeholder = p.keyPlaceholder || "";
      $("st-model").value = s.models[provider] || p.defaultModel || "";
      $("st-model").placeholder = p.defaultModel || "model name";
      $("apiKeyHint").innerHTML = `${p.keyHint || ""} <a href="${p.keyUrl}" target="_blank" rel="noopener">Get a key ↗</a>`;
      $("modelHint").textContent = p.modelHint || "";
      $("clearApiKey").style.display = s.apiKeys[provider] ? "" : "none";
      $("aiTestResult").textContent = "";
    };
    const readAndSave = () => {
      const provider = $("st-provider").value, p = AI_PROVIDERS[provider];
      s.aiProvider = provider;
      s.apiKeys[provider] = $("st-apikey").value.trim();
      s.models[provider] = $("st-model").value.trim() || p.defaultModel || "";
      if (p.needsBaseUrl) s.customBaseUrl = $("st-baseurl").value.trim();
      this.persist();
    };
    fill($("st-provider").value);
    $("st-provider").addEventListener("change", () => fill($("st-provider").value));
    $("toggleKeyVisible").addEventListener("click", (e) => {
      const input = $("st-apikey"); const show = input.type === "password";
      input.type = show ? "text" : "password"; e.target.textContent = show ? "Hide" : "Show";
    });
    $("saveApiKey").addEventListener("click", () => { readAndSave(); this.toast("AI settings saved to this browser."); this.renderCurrentPage(); });
    $("clearApiKey").addEventListener("click", () => {
      const provider = $("st-provider").value; delete s.apiKeys[provider]; this.persist(); this.toast("API key removed."); this.renderCurrentPage();
    });
    $("testAi").addEventListener("click", async () => {
      readAndSave();
      const out = $("aiTestResult"); const btn = $("testAi");
      if (!GeminiService.hasApiKey()) { out.style.color = "var(--red-600)"; out.textContent = "Enter an API key first" + (AI_PROVIDERS[s.aiProvider].needsBaseUrl ? " (and the Base URL and model)." : "."); return; }
      btn.disabled = true; out.style.color = "var(--text-2)"; out.textContent = "Testing " + GeminiService.providerLabel() + " (" + GeminiService.getModel() + ")…";
      try {
        await GeminiService.testConnection();
        out.style.color = "var(--green-600)"; out.textContent = "✓ Connected — " + GeminiService.providerLabel() + " answered correctly.";
      } catch (err) {
        out.style.color = "var(--red-600)"; out.textContent = "✗ " + this.friendlyGeminiError(err);
      }
      btn.disabled = false;
    });
  },

  renderCurrentPage() {
    const page = App.currentPage;
    const map = {
      dashboard: () => this.renderDashboard(),
      today: () => this.renderToday(),
      roadmap: () => this.renderRoadmap(),
      books: () => this.renderBooks(),
      subjects: () => this.renderSubjects(),
      revision: () => this.renderRevision(),
      mocks: () => this.renderMocks(),
      weak: () => this.renderWeak(),
      errors: () => this.renderErrors(),
      notes: () => this.renderNotes(),
      progress: () => this.renderProgress(),
      settings: () => this.renderSettings(),
      vocab: () => this.renderVocab(),
      viva: () => this.renderViva()
    };
    (map[page] || map.dashboard)();
  }
};
