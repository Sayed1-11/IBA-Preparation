# IBA MBA 100-Day Preparation Dashboard

A fully local, offline study-management app for the IBA (University of Dhaka)
MBA admission test — built with plain HTML5, CSS3 and vanilla JavaScript.
No build step, no backend, no framework.

## Running it

Open `index.html` in any modern browser. Everything runs client-side and
saves to your browser's `localStorage`.

> Progress is stored per-browser. If you switch browsers/devices or clear
> site data, saved progress won't follow you. There's no account and
> nothing is uploaded anywhere.

## Where this plan actually comes from

Unlike an earlier draft of this app, the curriculum and 100-day schedule in
`js/data.js` were built from the **real files in the user's Drive folder**,
not from book titles alone:

- **Word Smart 1** — confirmed 832-word main list (pp.39-254), plus SAT Hit
  Parade / GRE Hit Parade / Word Roots (pp.287-331) used once the main list
  is finished.
- **GRE Math Bible** — confirmed 24-topic table of contents, pp.13-502.
- **GRE 200 Puzzles** — confirmed structure: Ordering/Grouping/Networking
  game theory (pp.4-29), then exactly **25 timed tests** (pp.30-134).
- **GMAT Sentence Correction (Manhattan Prep, 6th Ed.)** — confirmed 12
  chapters across 315 pages.
- **Cliff's TOEFL** — confirmed Mini Test + full practice test structure.
- **IBA Admission Preparation Tracker** — this is the *authoritative*
  source for the topic taxonomy: it's the user's own checklist that splits
  Math into "most important" (9 topics) vs. "other" (12 topics), and lists
  Grammar and Analytical topics explicitly. `CURRICULUM` in `js/data.js` is
  built directly from it.
- **GMAT Official Guide, Mentors MBA Admission Guide, IBA Question Paper
  (19-20 Session)** — these are scanned/CamScanner PDFs with no
  extractable text. Their existence and rough size are known; exact page
  or question numbers inside them are marked **"To be configured"**
  wherever they appear in the plan, rather than invented.
- **"The Big Book" and standalone "Mock Test materials"** referenced in the
  original brief were **not found** in the Drive folder as separate files,
  so they are not referenced in the generated plan.

## The rebalanced 100-day structure

An initial draft stacked Math + English + Analytical + Vocab + IBA-practice
+ Review into every single day, which — once real page/question counts
replaced guesses — would have run 4+ hours on heavy days. The schedule in
this build was rebalanced so Math/English/Analytical rotate concept-day vs.
practice-day instead of all three getting full treatment daily:

- **Days 1-20 (Foundation)** — the 9 "most important" Math topics; the 6
  Grammar-theory topics (Cliff's TOEFL / GMAT SC); Analytical game-type
  theory then GRE 200 Puzzles tests. 120-135 min/day.
- **Days 21-45 (Core Preparation)** — the 12 "other" Math topics; Sentence
  Correction practice (GMAT OG); Puzzle-test review + Critical Reasoning.
  125-135 min/day.
- **Days 46-65 (Intensive Practice)** — all 21 Math topics cycle as mixed
  practice; RC/SC/Error-Detection drills; Data Sufficiency + timed
  puzzles. 145 min/day.
- **Days 66-80 (IBA-Focused)** — IBA-style mixed sets from the Mentors
  Guide and the IBA Question Paper. 145 min/day.
- **Days 81-90 (Final Completion)** — Days 81-86: three timed 20/20/15-Q
  sets; Days 87-90: full-length mock tests (190 min, matching real exam
  duration).
- **Days 91-100 (Revision Only)** — fixed structure from the brief: Math →
  English/Vocab → Analytical → Vocab/Grammar → Weak Topics → Mock → Error
  Log → Mock → Formulas/Vocab → Final Light Review + Strategy. Weak-topic
  and error-log tasks on these days are populated **live** from whatever
  you've actually marked weak or logged as mistakes — not static.

Result: **120-145 min/day** across most of Days 1-90 (only the 4 full-mock
days run to ~190 min), which is achievable alongside a full course load.

## Your books, linked from Google Drive

Every book's **Open Book** button now points straight to your actual Drive
files, not a local `assets/books/` copy — since GitHub blocks files over
50MB and several of these PDFs (GMAT Official Guide, Mentors MBA Admission
Guide, DU IBA QBank, Saifur's Analogy) are well past that. Nothing needs to
be copied into the project at all.

A couple of things worth knowing:
- These links open fine for **you**, since you're signed into the Google
  account that owns them. If you ever share this site with someone else,
  they'd need the files shared with them too (or "Anyone with the link").
- **Mentors MBA Admission Guide** exists twice in your Drive folder (an
  older ~40MB scan and a newer, more complete ~110MB one) — the book card
  links to the newer, larger file.
- The `assets/books/` folder from the previous version is no longer needed
  for these 15 books, but it's left in place in case you'd rather keep a
  self-contained local copy of any of them later — a book's `file` field in
  `js/data.js` can point to either a Drive link or a local path.

## Project structure

```
iba-mba-prep/
├── index.html          App shell: sidebar, topbar, page containers, modal
├── css/style.css         Design system (light + dark) and responsive layout
├── js/
│   ├── data.js             Sourced curriculum, books, and the 100-day generator
│   ├── storage.js          localStorage load/save
│   ├── planner.js          Progress, streaks, catch-up, search logic
│   ├── ui.js                 Rendering for every page + forms + modal
│   └── app.js                 Navigation, init, global event wiring
└── assets/                 images/ icons/ logos/
```

## Core features

- **Dashboard** — Day X/100, overall + per-subject progress, streak, weak
  topics, latest mock score, quick actions.
- **Today** — today's goal, study blocks with checkboxes, time/question/
  vocabulary targets, "Complete Today's Plan" to advance.
- **100-Day Plan** — a clickable calendar (completed / today / upcoming /
  missed / revision); each day opens a modal with its full task list.
- **Catch Up** — finds unfinished tasks from past days and proposes moving
  them into upcoming slots (max 2 extra/day), never overloading Days 91-100.
- **Books** — CORE/IMPORTANT/SUPPLEMENTARY badges (see priority rationale
  above), per-book progress slider, confirmed structural facts in each
  card's chapter/page fields.
- **Subjects** — the full sourced master curriculum with a Strong/Average/
  Weak rating per topic.
- **Revision** — Days 91-100 with live weak-topic and error-log counts.
- **Mock Tests** — log full test results (section-wise); best/average/
  latest are computed from what you enter, never fabricated.
- **Weak Topics / Error Log / Notes** — as before, all persisted locally.
- **Progress** — overall + per-subject completion, mock test history.
- **Settings** — optional exam date / plan start date (Day X computed from
  today's real date if set), daily targets, dark mode, full local reset.

## Data safety

All state lives in one `localStorage` key. Refreshing or closing the
browser does not lose progress. **Reset All Progress** in Settings is the
only way to clear it, and it asks for confirmation first.
