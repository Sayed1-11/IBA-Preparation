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
│   ├── viva.js             Built-in VIVA question bank + local rubric scorer
│   ├── ocr.js              Built-in Tesseract OCR + local question/answer-key parser
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


## Built-in OCR — import papers with no API key

**Mock Tests → Import Paper (built-in OCR)** now has a *Reader* choice:

| Reader | Key needed? | Best for |
|---|---|---|
| **Built-in OCR + local parser** (default) | **No** | Any normal question paper: text PDFs, scans, phone photos, or pasted text |
| AI provider | Yes | Messy multi-column layouts, diagram-heavy maths, papers where you also want worked explanations |

How the offline path works:

1. **Text-layer PDF** → read directly by pdf.js. Instant, perfectly accurate.
2. **Scanned PDF / photo** → each page is rendered at ~2200px, lightly
   contrast-lifted, and read by **Tesseract.js** (open-source OCR compiled to
   WebAssembly). It runs inside your browser — the image never leaves your
   machine, and there is no account, key, quota or cost.
3. The text then goes through a **local parser** (`js/ocr.js`) that finds
   numbered questions (`1.`, `1)`, `Q.1`, `Q3.`), option markers
   (`(a)`, `a)`, `A.`, and Bangla `ক/খ/গ/ঘ`), section headings
   (Mathematics / English / Analytical) and the **answer key** — whether it is
   an "Answer Key" page at the back, an `Ans: C` line under each question, or
   a key you paste into the box yourself (`1c 2a 3d …`).

**First run needs internet once.** Tesseract (~1 MB) and the English model
(~12 MB) are fetched from a CDN and cached in IndexedDB; after that, imports
work with the Wi-Fi off. To be offline from the very first run, drop
`tesseract.min.js`, `worker.min.js`, `core/` and `lang/eng.traineddata` into
`vendor/tesseract/` — those files are used automatically when present. (If you
open the app from `file://` rather than a local server, local vendor files
can't be fetched; run `python -m http.server` in the project folder instead.)

**Passages and shared set-ups are kept.** Reading-comprehension passages,
analytical game set-ups ("Six friends sit around a circular table…"),
"Directions: Questions 5-8 refer to…" blocks and data tables are detected as
*shared stimulus*, attached to every question that depends on them, and shown
in a scrollable panel above the question during the exam — so a passage-based
question is actually answerable. Explicit ranges ("Questions 5-8") are honoured;
an unheaded passage carries forward to the questions that follow it until the
next passage or section starts. In the import preview each passage appears once
per group, collapsed, so you can check it against the paper. The AI reader now
captures passages the same way, in a separate `passage` field.

**The answer key can be a photo.** The key is usually printed on a separate
sheet, so the import form and the preview both take an **image or PDF of the
key page** (as well as typed text like `1c 2a 3d`). It is OCR'd with the same
built-in engine and parsed **section by section**: a key laid out as

```
Section I: Language & Communication   1.E  2.C  3.D  …  25.C
Section II: Mathematics               1.B  2.E  3.D  …  25.D
Section III: Analytical Ability       1.E  2.E  3.C  …  20.C
```

restarts its numbering at 1 in every section, so answers are matched on
*(section, number)*, never on the number alone — Maths Q5 and English Q5 are
different questions. Section headings in the paper itself reset the question
numbering the same way. If a number appears in several sections with different
answers and the section of the question can't be determined, it is reported as
ambiguous and left for you to set rather than guessed. A/B/C/D/E keys (five
options) are supported.

**Answers you can fix yourself.** In the import preview every option is
clickable — click one to mark it correct. Questions with no answer are labelled
*no answer set*, can still be attempted, and are simply left out of the score
instead of being counted wrong. There is also a bulk **Set the answer key** box.
Expect ~5 seconds per scanned page and occasional OCR slips on fractions,
superscripts and √ — the preview exists so you can catch them.

## VIVA Practice — built-in panel (no API key)

The VIVA page now has a **Panel** selector:

- **Built-in panel (default, no key, works offline).** A bank of real IBA-style
  viva questions across Personal/Motivation, Business & Economy, Situational &
  Ethics and Current Affairs. A mixed session opens with "tell us about
  yourself" and closes with "anything you'd like to ask us", the way a real
  panel runs. Each answer is scored out of 10 on a fixed rubric — coverage of
  the points the question actually asks for, specificity (numbers, names, a
  dated example), structure, length for 45-90 seconds of speech, and filler
  phrases — then you get strengths, specific improvements, a score breakdown,
  and a written model answer for that question.
- **AI panel.** Questions tailored to the background you type in, free-form
  feedback. Needs a provider key in Settings; the option is greyed out until
  one is set, which is why the page appeared to do nothing before.

If an AI session fails mid-way, the retry now falls back to the built-in panel
instead of dead-ending. Dictation (Chrome/Edge) and read-aloud work in both.

The rubric is deliberately blunt: it rewards a concrete, structured, correctly
sized answer and punishes vagueness. Treat it as reps on the *form* of your
answers — no scorer, AI or otherwise, predicts the real panel.

## AI features (Vocab, Mock Tests, VIVA)

Open **Settings → AI Provider**, choose a provider, paste its key, press
**Test connection**. Keys are saved per-provider in this browser only.

| Provider | Cost | Notes |
|---|---|---|
| Groq | Free | Fast; ~30 req/min. Key: console.groq.com/keys |
| Google Gemini | Free tier | Key: aistudio.google.com/apikey |
| OpenRouter | Free `:free` models | ~20 req/min, 50/day without credit |
| Mistral | Free tier | Free-mode prompts may be used for training |
| LLM7.io | Free, **no key** | ~10 req/min |
| OpenAI | Paid API credit | A ChatGPT subscription does *not* include API credit |
| Custom | — | Any OpenAI-compatible Base URL + key + model |

The free list is from https://github.com/mnfst/awesome-free-llm-apis — free
model names change often; if one returns "model not found", change the model
name in Settings (no code edit needed).

- **Mock Tests → Generate Mock by Topic**: new IBA-style MCQs (Math / English /
  Analytical / mixed), any topic from your curriculum, timed exam runner,
  auto-grading, and the existing weak-topic adaptation. AI answer keys can be
  wrong occasionally — check the worked explanation in *Review Answers*.
- **Mock Tests → Import PDF / Photos**: upload a question-paper PDF (or page
  photos). PDFs are read in the browser with pdf.js (downloaded from a CDN the
  first time, so it needs internet once). If the PDF has selectable text it is
  read directly and works with ANY provider; if it is a scan, pages are rendered
  to images and sent to a vision-capable model (Gemini, gpt-4o-mini). The AI
  transcribes each question in full, uses the paper's own answer key when there
  is one, and otherwise solves the answers itself (flagged "AI-solved — verify").
  You get a preview of every question to check, and can save the paper under
  **Imported Papers** to re-take it any time. Limits: 80 pages per import (use
  the page range for more); diagrams/graphs only work in image mode.
- **VIVA Practice**: AI panel asks 5–10 questions (optionally tailored to your
  background), you answer by typing or dictating (Chrome/Edge), each answer is
  scored /10 with strengths, improvements and a model answer. Sessions are saved.
- **Vocab Practice**: unchanged, but now works with any provider above.
