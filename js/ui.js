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
      <div class="filter-bar"><button class="btn btn-primary btn-sm" id="addMockBtn">+ Add Mock Test</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Test</th><th>Date</th><th>Score</th><th>Math</th><th>English</th><th>Analytical</th><th></th></tr></thead>
        <tbody id="mockTableBody"></tbody>
      </table></div>
    `;
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
      settings: () => this.renderSettings()
    };
    (map[page] || map.dashboard)();
  }
};
