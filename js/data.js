/* ==========================================================================
   data.js
   Curriculum, books and the 100-day generator — sourced directly from the
   user's actual Drive folder (Word Smart 1, GRE Math Bible, GRE 200 Puzzles,
   GMAT Sentence Correction, Cliff's TOEFL, GMAT Official Guide, Mentors MBA
   Admission Guide, IBA Question Paper 19-20, IBA Admission Preparation
   Tracker). Topic taxonomy and Math priority split come from the user's own
   IBA Admission Preparation Tracker.pdf. Where a book is a scanned/image PDF
   with no extractable text (GMAT OG, Mentors Guide, IBA Question Paper),
   exact page/question numbers are marked "To be configured" rather than
   invented — only counts confirmed by reading the file are used as fact.
   ========================================================================== */

const SUBJECTS = {
  MATH: { id: "math", name: "Mathematics", short: "Math", color: "#2F5FA8" },
  ENGLISH: { id: "english", name: "English", short: "English", color: "#2F7A4F" },
  ANALYTICAL: { id: "analytical", name: "Analytical Ability", short: "Analytical", color: "#8A4B7A" },
  VOCAB: { id: "vocab", name: "Vocabulary", short: "Vocab", color: "#B07D1F" },
  MOCK: { id: "mock", name: "Mock Test", short: "Mock", color: "#B23A3A" },
  REVISION: { id: "revision", name: "Revision", short: "Revision", color: "#5A5F73" }
};

/* --------------------------------------------------------------------
   BOOKS — the actual files found in the shared Drive folder. Priority
   (CORE/IMPORTANT/SUPPLEMENTARY) and structural facts (chapter counts,
   word counts, test counts) are only stated where they were confirmed
   by reading the file's own table of contents; everything else reads
   "To be configured". "The Big Book" and standalone "Mock Test
   materials" referenced in the original brief were NOT found in the
   folder as separate files.
   -------------------------------------------------------------------- */
const BOOKS = [
  {
    id: "iba-tracker", name: "IBA Admission Preparation Tracker", subject: "mixed",
    purpose: "Topic checklist — the authoritative source for this app's Math/Grammar/Analytical topic taxonomy and Math priority split",
    priority: "CORE", totalChapters: "N/A (topic checklist)", totalPages: "Confirmed: single-page topic list",
    file: "https://drive.google.com/file/d/1JMy_yKeuNLDj7pSwmORedeogEfyp78Vo/view?usp=sharing"
  },
  {
    id: "iba-qp-1920", name: "IBA Question Paper (19-20 Session)", subject: "mixed",
    purpose: "Actual past IBA admission paper",
    priority: "CORE", totalChapters: "To be configured (scanned PDF, no extractable text)", totalPages: "To be configured",
    file: "https://drive.google.com/file/d/1-0enH6zQAU7yu326qRIhQxtPzxHI1Yny/view?usp=sharing"
  },
  {
    id: "mentors-guide", name: "Mentors MBA Admission Guide", subject: "mixed",
    purpose: "MBA admission preparation and IBA-focused practice",
    priority: "CORE", totalChapters: "To be configured (scanned PDF, no extractable text)", totalPages: "120+ pages seen, exact count to be configured",
    file: "https://drive.google.com/file/d/1ClRcIlrmaqhtau-YEvm1BFrzFm7y0H8R/view?usp=sharing"
  },
  {
    id: "gmat-og", name: "GMAT Official Guide", subject: "mixed",
    purpose: "Official-style Sentence Correction, Reading Comprehension, Quantitative, Critical Reasoning and Data Sufficiency practice",
    priority: "CORE", totalChapters: "To be configured (scanned PDF, no extractable text)", totalPages: "To be configured",
    file: "https://drive.google.com/file/d/1jXBCeLK8K9QHpYk4omSC0LbEPXvshN3R/view?usp=sharing"
  },
  {
    id: "word-smart", name: "Word Smart 1", subject: "english",
    purpose: "Core vocabulary building",
    priority: "CORE", totalChapters: "14 (confirmed via table of contents)",
    totalPages: "Confirmed: 832 words in the main A-Z list (pp.39-254); SAT Hit Parade (287-297), GRE Hit Parade (297-305), Word Roots (305-331)",
    file: "https://drive.google.com/file/d/175spof0r-_rY1hfdODJ0twyBDFakUM6s/view?usp=sharing"
  },
  {
    id: "gre-math-bible", name: "GRE Math Bible", subject: "math",
    purpose: "Mathematics concepts and fundamentals",
    priority: "CORE", totalChapters: "24 topic sections (confirmed via table of contents)",
    totalPages: "Confirmed: pp.13-502 across 24 topics, e.g. Geometry pp.78-204, Perm&Comb pp.426-466",
    file: "https://drive.google.com/file/d/1jXRhjkhOccTbEl1_rygAlMUYrc6xrFvL/view?usp=sharing"
  },
  {
    id: "gmat-sc", name: "GMAT Sentence Correction (Manhattan Prep, 6th Ed.)", subject: "english",
    purpose: "Focused sentence correction and grammar practice",
    priority: "IMPORTANT", totalChapters: "12 chapters + 2 appendices (confirmed via table of contents)",
    totalPages: "Confirmed: 315 pages — Ch1 SC Process, Ch2 Grammar&Meaning, Ch3 Sentence Structure, Ch4 Modifiers, Ch5 Parallelism, Ch6 Comparisons, Ch7 Pronouns, Ch8 Verbs, Ch9 Idioms, Ch10-12 Extra Problem Sets",
    file: "https://drive.google.com/file/d/1UdYFeVRE_6AHDDCbqQ8Tnq_EGGr5-JuV/view?usp=sharing"
  },
  {
    id: "gre-puzzles", name: "GRE 200 Puzzles", subject: "analytical",
    purpose: "Puzzle and analytical reasoning practice",
    priority: "IMPORTANT", totalChapters: "3 game types + 25 tests (confirmed via table of contents)",
    totalPages: "Confirmed: Intro/theory pp.4-29 (Ordering, Grouping, Networking games), 25 timed Tests pp.30-134, Solutions p.136+",
    file: "https://drive.google.com/file/d/1A6scWg--Ys_6aPFQTRUVHTiNszuadwSM/view?usp=sharing"
  },
  {
    id: "cliffs-toefl", name: "Cliff's TOEFL", subject: "english",
    purpose: "Grammar fundamentals and mini-tests (background reference)",
    priority: "SUPPLEMENTARY", totalChapters: "4 Mini Tests + 6 full practice tests (confirmed structure)",
    totalPages: "To be configured (exact page count not confirmed)",
    file: "https://drive.google.com/file/d/1a6nHu4RKSB-c_KFVRrU7on9IbYiO8W8O/view?usp=sharing"
  },

  /* ---- Newly found on your computer, not yet built into the 100-day
     schedule. They'll show on the Books page with an Open Book button
     once the PDF is in assets/books/, but no day currently assigns
     tasks from them — ask to fold any of these into the plan. ---- */
  {
    id: "gre-big-book", name: "GRE Big Book (\"The Big Book\")", subject: "mixed",
    purpose: "Sentence completion, analogy, verbal, quantitative and analytical mixed practice — this is the book referenced as \"The Big Book\" in the original brief",
    priority: "NOT YET SCHEDULED", totalChapters: "To be configured", totalPages: "To be configured",
    file: "https://drive.google.com/file/d/1PhMBRmer9hRjEkl7Nmx9yMxelU2JSYuM/view?usp=sharing"
  },
  {
    id: "du-iba-qbank", name: "DU IBA QBank (BBA+MBA)", subject: "mixed",
    purpose: "Question bank covering both BBA and MBA admission tracks",
    priority: "NOT YET SCHEDULED", totalChapters: "To be configured", totalPages: "To be configured",
    file: "https://drive.google.com/file/d/1EIpOgV8DNo7DIQlqzMyiuEOkdEJXDzUj/view?usp=sharing"
  },
  {
    id: "mcgraw-sat", name: "McGraw-Hill's SAT (2009)", subject: "english",
    purpose: "SAT-style verbal and grammar practice",
    priority: "NOT YET SCHEDULED", totalChapters: "To be configured", totalPages: "To be configured",
    file: "https://drive.google.com/file/d/1FigCQ4eJ_VThKQqhyYgtHjQfSZX4jo_b/view?usp=sharing"
  },
  {
    id: "kaplan-math", name: "Kaplan Math", subject: "math",
    purpose: "Additional quantitative concept/practice material",
    priority: "NOT YET SCHEDULED", totalChapters: "To be configured", totalPages: "To be configured",
    file: "https://drive.google.com/file/d/1fXzQTn41MT8ZpWOgC6Iu2wS6OvgIelMT/view?usp=sharing"
  },
  {
    id: "saifurs-analogy", name: "Saifur's Analogy", subject: "english",
    purpose: "Analogy-focused vocabulary/verbal practice",
    priority: "NOT YET SCHEDULED", totalChapters: "To be configured", totalPages: "To be configured",
    file: "https://drive.google.com/file/d/1OPPgTe3ASX1uVApY4x67wfCeovv-wg0C/view?usp=sharing"
  },
  {
    id: "word-smart-2", name: "Word Smart Part 1 & 2 (combined)", subject: "english",
    purpose: "A combined Part 1 & 2 vocabulary compilation, distinct from the standalone Word Smart 1 file",
    priority: "NOT YET SCHEDULED", totalChapters: "To be configured", totalPages: "To be configured",
    file: "https://drive.google.com/file/d/1EjR6QLX8TBpr5ydogcJW2Z4GkFai5Vt8/view?usp=sharing"
  }
];

function bookNames(ids) {
  return ids.map(id => (BOOKS.find(b => b.id === id) || {}).name || id).join(" + ");
}

/* Given a task's display "book" string (e.g. "GRE Math Bible" or
   "Mentors MBA Admission Guide + IBA Question Paper (19-20 Session)"),
   returns the actual BOOKS entries it refers to, so the UI can render
   an "Open Book" link straight to that book's PDF. Matches by checking
   whether each book's canonical name appears in the display string —
   robust to suffixes like "(pp.287-331)" tacked on for extra context. */
function booksForDisplayString(displayString) {
  if (!displayString) return [];
  return BOOKS.filter(b => displayString.includes(b.name));
}

/* --------------------------------------------------------------------
   MASTER CURRICULUM — sourced from the user's own IBA Admission
   Preparation Tracker.pdf, which explicitly splits Math into "most
   important" and "other" topics and lists Grammar theory/practice and
   Analytical topics. Each topic is mapped to the book(s) that cover it.
   -------------------------------------------------------------------- */
const CURRICULUM = {
  math: {
    label: "Mathematics",
    mostImportant: [
      { name: "Profit & Loss", books: ["gre-math-bible", "gmat-og"] },
      { name: "Percentage", books: ["gre-math-bible", "gmat-og"] },
      { name: "Time-Distance-Speed", books: ["gre-math-bible"] },
      { name: "Work, Set & Mixture", books: ["gre-math-bible"] },
      { name: "Average", books: ["gre-math-bible"] },
      { name: "Age", books: ["gre-math-bible"] },
      { name: "Angle", books: ["gre-math-bible"] },
      { name: "Triangle", books: ["gre-math-bible"] },
      { name: "Circle", books: ["gre-math-bible"] }
    ],
    other: [
      { name: "Divisibility", books: ["gre-math-bible"] },
      { name: "LCM & HCF", books: ["gre-math-bible"] },
      { name: "Prime Numbers", books: ["gre-math-bible"] },
      { name: "Fraction", books: ["gre-math-bible"] },
      { name: "Number Line", books: ["gre-math-bible"] },
      { name: "Exponents", books: ["gre-math-bible"] },
      { name: "Interest", books: ["gre-math-bible"] },
      { name: "Inequality", books: ["gre-math-bible"] },
      { name: "Ratio & Proportion", books: ["gre-math-bible"] },
      { name: "Quadrilateral", books: ["gre-math-bible"] },
      { name: "Polygon", books: ["gre-math-bible"] },
      { name: "Solid Geometry", books: ["gre-math-bible"] }
    ],
    get topics() { return this.mostImportant.concat(this.other); }
  },
  english: {
    label: "English",
    grammarTheory: [
      { name: "Subject-Verb Agreement", books: ["cliffs-toefl", "gmat-sc"] },
      { name: "Pronouns", books: ["gmat-sc"] },
      { name: "Modifiers", books: ["cliffs-toefl", "gmat-sc"] },
      { name: "Parallelism", books: ["gmat-sc"] },
      { name: "Comparison", books: ["cliffs-toefl", "gmat-sc"] },
      { name: "Redundancy", books: ["gmat-sc"] }
    ],
    other: [
      { name: "Sentence Correction", books: ["gmat-sc", "gmat-og"] },
      { name: "Reading Comprehension", books: ["gmat-og"] },
      { name: "Error Detection", books: ["gmat-og"] }
    ],
    get topics() { return this.grammarTheory.concat(this.other); }
  },
  analytical: {
    label: "Analytical Ability",
    gameTypes: [
      { name: "Ordering Games", books: ["gre-puzzles"] },
      { name: "Grouping Games", books: ["gre-puzzles"] },
      { name: "Networking Games", books: ["gre-puzzles"] }
    ],
    other: [
      { name: "Critical Reasoning", books: ["gmat-og"] },
      { name: "Data Sufficiency (Analytical)", books: ["gmat-og"] }
    ],
    get topics() { return this.gameTypes.concat(this.other); }
  }
};

/* --------------------------------------------------------------------
   Phase definitions (Days 1-90), matching the audited, rebalanced plan:
   Foundation (1-20) -> Core Preparation (21-45) -> Intensive Practice
   (46-65) -> IBA-Focused (66-80) -> Final Completion (81-90) ->
   Revision Only (91-100).
   -------------------------------------------------------------------- */
const PHASES = [
  { key: "foundation", label: "Foundation", from: 1, to: 20 },
  { key: "core", label: "Core Preparation", from: 21, to: 45 },
  { key: "intensive", label: "Intensive Practice", from: 46, to: 65 },
  { key: "iba-focused", label: "IBA-Focused Preparation", from: 66, to: 80 },
  { key: "final", label: "Final Completion", from: 81, to: 90 },
  { key: "revision", label: "Revision Only", from: 91, to: 100 }
];

function phaseForDay(day) {
  return PHASES.find(p => day >= p.from && day <= p.to) || PHASES[PHASES.length - 1];
}

let __taskCounter = 0;
function makeTask(subjectKey, topic, book, type, duration, questionTarget, note) {
  __taskCounter += 1;
  return {
    id: "t" + __taskCounter,
    subject: subjectKey,
    topic: topic || "",
    book: book || "",
    type: type,
    duration: duration,
    questionTarget: questionTarget || 0,
    note: note || ""
  };
}

/* ======================================================================
   VOCABULARY — 20 new words/day (reduced from an initial 25/day design
   once the realism audit showed 25/day plus a full Math+English+
   Analytical load overran a realistic daily time budget). Confirmed
   832-word main list; once exhausted, rolls into the confirmed SAT Hit
   Parade / GRE Hit Parade / Word Roots sections of the same book.
   ====================================================================== */
const VOCAB_PER_DAY = 20;
const VOCAB_MAIN_LIST_TOTAL = 832;
let __vocabWordsDone = 0;
function vocabTask() {
  if (__vocabWordsDone < VOCAB_MAIN_LIST_TOTAL) {
    const start = __vocabWordsDone + 1;
    const end = Math.min(__vocabWordsDone + VOCAB_PER_DAY, VOCAB_MAIN_LIST_TOTAL);
    __vocabWordsDone = end;
    return makeTask("vocab", `Vocab ${start}-${end}/${VOCAB_MAIN_LIST_TOTAL} (main list)`, "Word Smart 1", "vocab", 20, VOCAB_PER_DAY,
      `Learn words ${start}-${end}, recall them, then mark any that are difficult.`);
  } else {
    const setNum = Math.floor((__vocabWordsDone - VOCAB_MAIN_LIST_TOTAL) / VOCAB_PER_DAY) + 1;
    __vocabWordsDone += VOCAB_PER_DAY;
    return makeTask("vocab", `SAT/GRE Hit Parade + Word Roots review, set ${setNum}`, "Word Smart 1 (pp.287-331)", "vocab", 20, VOCAB_PER_DAY,
      "Main 832-word list complete — reviewing the SAT Hit Parade, GRE Hit Parade and Word Roots sections.");
  }
}

/* GRE 200 Puzzles has exactly 25 confirmed timed tests. */
const PUZZLE_TEST_COUNT = 25;

/* ======================================================================
   PHASE 1 — Days 1-20, Foundation
   Math: the 9 "most important" topics, alternating a concept day and a
   practice day. English: the 6 grammar-theory topics (Days 1-12,
   alternating Cliff's TOEFL theory / GMAT SC chapter drill), then
   Reading Comprehension (Days 13-20, GMAT Official Guide). Analytical:
   game-type theory (Days 1-4), then GRE 200 Puzzles tests, alternating
   solve / review (from Day 5).
   ====================================================================== */
function buildFoundationDay(d, state) {
  const phase = phaseForDay(d);
  const tasks = [];

  const mTopic = CURRICULUM.math.mostImportant[state.mathPtr % CURRICULUM.math.mostImportant.length];
  const mIsConceptDay = d % 2 === 1;
  if (mIsConceptDay) {
    tasks.push(makeTask("math", mTopic.name, bookNames(mTopic.books), "concept", 45, 0,
      "Study the concept and 10 worked examples for this topic."));
  } else {
    tasks.push(makeTask("math", mTopic.name, bookNames(mTopic.books), "practice", 35, 20,
      "Solve 20 practice questions on this topic."));
    state.mathPtr++;
  }

  let gTopicName;
  if (d <= 12) {
    const gTopic = CURRICULUM.english.grammarTheory[state.gramPtr % CURRICULUM.english.grammarTheory.length];
    gTopicName = gTopic.name;
    if (d % 2 === 1) {
      tasks.push(makeTask("english", gTopic.name, "Cliff's TOEFL", "grammar", 30, 0,
        "Study the grammar rule and complete the related Cliff's TOEFL Mini Test section."));
    } else {
      tasks.push(makeTask("english", gTopic.name, "GMAT Sentence Correction (Manhattan Prep, 6th Ed.)", "grammar", 30, 10,
        "Drill this rule with the matching GMAT Sentence Correction chapter problem set."));
      state.gramPtr++;
    }
  } else {
    gTopicName = "Reading Comprehension";
    tasks.push(makeTask("english", "Reading Comprehension", "GMAT Official Guide", "rc", 30, 2,
      "Read and answer 2 RC passages."));
  }

  if (d <= 4) {
    const theory = ["Analytical Reasoning theory (rules & symbols)", "Ordering Games", "Grouping Games", "Networking Games"];
    tasks.push(makeTask("analytical", theory[d - 1], "GRE 200 Puzzles", "concept", 25, 0,
      "Study the theory section for this game type."));
  } else {
    const testNo = Math.floor((d - 5) / 2) % PUZZLE_TEST_COUNT + 1;
    if (d % 2 === 1) {
      tasks.push(makeTask("analytical", `Puzzle Test ${testNo}/${PUZZLE_TEST_COUNT}`, "GRE 200 Puzzles", "puzzle", 30, 0,
        "Solve and review 1 timed puzzle test."));
    } else {
      tasks.push(makeTask("analytical", `Puzzle Test ${testNo}/${PUZZLE_TEST_COUNT} — redo`, "GRE 200 Puzzles", "review", 30, 0,
        "Redo the questions you missed."));
    }
  }

  tasks.push(vocabTask());
  tasks.push(makeTask("mixed", "Review yesterday's mistakes", "Error Log", "review", 10, 0,
    "Revisit yesterday's incorrect questions."));

  const estimatedMinutes = tasks.reduce((s, t) => s + t.duration, 0);
  return {
    day: d, phase: phase.label, phaseKey: phase.key,
    mainSubject: "math", secondarySubject: "english",
    goal: `${mTopic.name} (Math) · ${gTopicName} (English) · Analytical practice.`,
    tasks, estimatedMinutes, difficulty: "Foundational", priority: "Normal", isRevision: false
  };
}

/* ======================================================================
   PHASE 2 — Days 21-45, Core Preparation
   Math: the 12 "other" topics, alternating concept/practice. English:
   Sentence Correction practice from the GMAT Official Guide question
   bank (~12 Qs/day). Analytical: puzzle-test review most days, Critical
   Reasoning practice every 3rd day.
   ====================================================================== */
function buildCorePrepDay(d, state, indexInPhase) {
  const phase = phaseForDay(d);
  const tasks = [];

  const mTopic = CURRICULUM.math.other[state.mathOtherPtr % CURRICULUM.math.other.length];
  if (indexInPhase % 2 === 0) {
    tasks.push(makeTask("math", mTopic.name, "GRE Math Bible", "concept", 40, 0,
      "Study the concept and examples for this topic."));
  } else {
    tasks.push(makeTask("math", mTopic.name, "GRE Math Bible", "practice", 30, 20,
      "Solve 20 practice questions."));
    state.mathOtherPtr++;
  }

  const scBatch = 12;
  const scStart = state.scDone + 1;
  const scEnd = state.scDone + scBatch;
  state.scDone = scEnd;
  tasks.push(makeTask("english", "Sentence Correction", "GMAT Official Guide", "sc", 35, scBatch,
    `${scBatch} Sentence Correction questions (GMAT OG, approx. #${scStart}-${scEnd} — exact numbering To be configured).`));

  let aTopicName;
  if (indexInPhase % 3 === 2) {
    aTopicName = "Critical Reasoning";
    tasks.push(makeTask("analytical", "Critical Reasoning", "GMAT Official Guide", "cr", 30, 15,
      "15 Critical Reasoning practice questions."));
  } else {
    const testNo = (indexInPhase % PUZZLE_TEST_COUNT) + 1;
    aTopicName = `Puzzle Test ${testNo}/${PUZZLE_TEST_COUNT}`;
    tasks.push(makeTask("analytical", `${aTopicName} — timed retry`, "GRE 200 Puzzles", "puzzle", 30, 0,
      "Timed retry of this puzzle test."));
  }

  tasks.push(vocabTask());
  tasks.push(makeTask("mixed", "Review yesterday's mistakes", "Error Log", "review", 10, 0,
    "Revisit yesterday's incorrect questions."));

  const estimatedMinutes = tasks.reduce((s, t) => s + t.duration, 0);
  return {
    day: d, phase: phase.label, phaseKey: phase.key,
    mainSubject: "math", secondarySubject: "english",
    goal: `${mTopic.name} (Math) · Sentence Correction practice (English) · ${aTopicName} (Analytical).`,
    tasks, estimatedMinutes, difficulty: "Moderate", priority: "Normal", isRevision: false
  };
}

/* ======================================================================
   PHASE 3 — Days 46-65, Intensive Practice
   All 21 Math topics cycle through as mixed practice sets; English
   alternates RC+SC review with Error-Detection-style drills; Analytical
   alternates Data Sufficiency with timed puzzle sets.
   ====================================================================== */
function buildIntensiveDay(d, indexInPhase) {
  const phase = phaseForDay(d);
  const allMathTopics = CURRICULUM.math.mostImportant.concat(CURRICULUM.math.other);
  const mTopic = allMathTopics[indexInPhase % allMathTopics.length];
  const tasks = [];

  tasks.push(makeTask("math", mTopic.name, "GMAT Official Guide", "practice", 40, 25,
    `25 mixed questions, ${mTopic.name} focus.`));

  if (indexInPhase % 2 === 0) {
    tasks.push(makeTask("english", "RC + Sentence Correction mixed review", "GMAT Official Guide", "practice", 40, 15,
      "2 RC passages + 15 SC questions, mixed review."));
  } else {
    tasks.push(makeTask("english", "Error Detection style drill", "GMAT Official Guide", "practice", 40, 15,
      "15-question error-detection-style drill."));
  }

  if (indexInPhase % 2 === 0) {
    tasks.push(makeTask("analytical", "Data Sufficiency", "GMAT Official Guide", "ds", 35, 15,
      "15 Data Sufficiency questions."));
  } else {
    tasks.push(makeTask("analytical", "Timed puzzle set", "GRE 200 Puzzles", "puzzle", 35, 0,
      "2 puzzle tests, timed."));
  }

  tasks.push(vocabTask());
  tasks.push(makeTask("mixed", "Review yesterday's mistakes", "Error Log", "review", 10, 0,
    "Revisit yesterday's incorrect questions."));

  const estimatedMinutes = tasks.reduce((s, t) => s + t.duration, 0);
  return {
    day: d, phase: phase.label, phaseKey: phase.key,
    mainSubject: "math", secondarySubject: "english",
    goal: `Mixed practice — ${mTopic.name} focus, across Math/English/Analytical.`,
    tasks, estimatedMinutes, difficulty: "High", priority: "Normal", isRevision: false
  };
}

/* ======================================================================
   PHASE 4 — Days 66-80, IBA-Focused Preparation
   IBA-style mixed sets from Mentors MBA Admission Guide and the IBA
   Question Paper (19-20 Session) — both scanned PDFs, so question
   numbering inside them is "To be configured".
   ====================================================================== */
function buildIbaFocusedDay(d, setNum) {
  const phase = phaseForDay(d);
  const tasks = [
    makeTask("math", `IBA-style Math set ${setNum}`, "Mentors MBA Admission Guide + IBA Question Paper (19-20 Session)", "iba", 40, 20,
      "20 IBA-style Math questions (exact source pages To be configured)."),
    makeTask("english", `IBA-style English set ${setNum}`, "Mentors MBA Admission Guide + IBA Question Paper (19-20 Session)", "iba", 40, 20,
      "20 IBA-style English questions: SC + RC + vocabulary in context."),
    vocabTask(),
    makeTask("analytical", `IBA-style Analytical set ${setNum}`, "Mentors MBA Admission Guide + IBA Question Paper (19-20 Session)", "iba", 35, 15,
      "15 IBA-style Analytical questions."),
    makeTask("mixed", "Review yesterday's mistakes", "Error Log", "review", 10, 0,
      "Revisit yesterday's incorrect questions.")
  ];
  const estimatedMinutes = tasks.reduce((s, t) => s + t.duration, 0);
  return {
    day: d, phase: phase.label, phaseKey: phase.key,
    mainSubject: "mixed", secondarySubject: null,
    goal: `IBA-style mixed practice set ${setNum} — Math, English and Analytical together.`,
    tasks, estimatedMinutes, difficulty: "High", priority: "IBA-style", isRevision: false
  };
}

/* ======================================================================
   PHASE 5 — Days 81-90, Final Completion
   Days 81-86: three timed 20/20/15-question IBA-style sets.
   Days 87-90: full-length mock tests.
   ====================================================================== */
function buildFinalDay(d, indexInPhase) {
  const phase = phaseForDay(d);
  const tasks = [];
  if (indexInPhase < 6) {
    tasks.push(makeTask("math", "Timed IBA-style Math set", "IBA Question Paper (19-20 Session)", "timed", 30, 20,
      "20 questions, 30-minute time limit."));
    tasks.push(makeTask("english", "Timed IBA-style English set", "IBA Question Paper (19-20 Session)", "timed", 30, 20,
      "20 questions, 30-minute time limit."));
    tasks.push(vocabTask());
    tasks.push(makeTask("analytical", "Timed Analytical set", "IBA Question Paper (19-20 Session)", "timed", 30, 15,
      "15 questions, 30-minute time limit."));
    tasks.push(makeTask("mixed", "Review mistakes", "Error Log", "review", 15, 0, "Revisit incorrect questions."));
  } else {
    tasks.push(makeTask("mixed", "Full-length mock test", "Mentors MBA Admission Guide + IBA Question Paper (19-20 Session)", "mock", 150, 0,
      "Sit one complete, timed mock test under real exam conditions."));
    tasks.push(vocabTask());
    tasks.push(makeTask("mixed", "Score & log errors", "Error Log", "review", 20, 0,
      "Score the mock, log every mistake, update weak topics."));
  }
  const estimatedMinutes = tasks.reduce((s, t) => s + t.duration, 0);
  return {
    day: d, phase: phase.label, phaseKey: phase.key,
    mainSubject: "mixed", secondarySubject: null,
    goal: indexInPhase < 6 ? "Timed IBA-style practice across all three sections." : "Full-length mock test + analysis.",
    tasks, estimatedMinutes, difficulty: indexInPhase < 6 ? "High" : "Exam Simulation", priority: "Normal", isRevision: false
  };
}

/* ======================================================================
   PHASE 6 — Days 91-100, Revision Only (fixed structure from the brief).
   Weak-topic and error-log tasks are populated live from stored progress
   at render time, not baked in here.
   ====================================================================== */
function buildRevisionDays() {
  const plan = [
    { day: 91, subject: "math", title: "Mathematics Revision",
      desc: "Re-derive formulas and methods for all 21 Math topics; no new material." },
    { day: 92, subject: "english", title: "English + Vocabulary Revision",
      desc: "Full Word Smart 1 list skim (832 words) plus grammar-rule review." },
    { day: 93, subject: "analytical", title: "Analytical Revision",
      desc: "Revisit Ordering/Grouping/Networking methods; 2 puzzle tests." },
    { day: 94, subject: "english", title: "Vocabulary + Grammar Revision",
      desc: "Spaced review of the hardest-marked words; Cliff's TOEFL Mini Tests reread." },
    { day: 95, subject: "mixed", title: "Weak Topics", isWeak: true,
      desc: "Targeted revision of topics currently marked Weak, across all three sections." },
    { day: 96, subject: "mixed", title: "Full Mock Test + Analysis", isMock: true,
      desc: "Sit a complete timed mock test, then analyse section-wise performance." },
    { day: 97, subject: "mixed", title: "Error Log + Weak Topics", isWeak: true, isError: true,
      desc: "Work through unresolved entries in the error log, prioritising weak topics." },
    { day: 98, subject: "mixed", title: "Full Mock Test + Analysis", isMock: true,
      desc: "Second full timed mock test, followed by section-wise analysis." },
    { day: 99, subject: "mixed", title: "Formula + Vocabulary + Key Concepts", isError: true,
      desc: "Formula sheet pass across all Math topics, plus a final vocabulary pass." },
    { day: 100, subject: "mixed", title: "Final Light Revision + Exam Strategy",
      desc: "A light, calm final review. Exam-day logistics and pacing strategy — no new practice." }
  ];

  return plan.map(p => {
    const tasks = [];
    if (p.subject === "math") {
      tasks.push(makeTask("math", "Full-syllabus review", "GRE Math Bible + GMAT Official Guide", "review", 90, 0,
        "Re-derive formulas/methods for all 21 Math topics rather than re-reading passively."));
      tasks.push(makeTask("math", "Mixed practice set", "GMAT Official Guide", "practice", 30, 20,
        "20 mixed questions across all Math topics."));
    } else if (p.subject === "english") {
      tasks.push(makeTask("english", "Full vocabulary + grammar review", "Word Smart 1 + GMAT Sentence Correction (Manhattan Prep, 6th Ed.) + Cliff's TOEFL",
        "review", p.day === 92 ? 90 : 80, 0,
        p.day === 92 ? "Skim the full 832-word list plus grammar rules." : "Spaced review of hardest-marked words plus Cliff's TOEFL Mini Tests."));
      tasks.push(vocabTask());
    } else if (p.subject === "analytical") {
      tasks.push(makeTask("analytical", "Game-method review", "GRE 200 Puzzles", "review", 50, 0,
        "Revisit Ordering/Grouping/Networking methods."));
      tasks.push(makeTask("analytical", "2 puzzle tests", "GRE 200 Puzzles", "puzzle", 60, 0,
        "2 timed puzzle tests."));
    }
    if (p.isWeak) {
      tasks.push(makeTask("mixed", "Weak-topic focus", "(live: Weak Topics list)", "weak", 60, 15,
        "Practice questions pulled from whatever topics are currently marked Weak."));
    }
    if (p.isError) {
      tasks.push(makeTask("mixed", "Error log clearance", "(live: Error Log)", "errorlog", p.day === 99 ? 50 : 100, 0,
        "Re-attempt every unresolved entry in the error log; mark it Understood or Mastered."));
      if (p.day === 99) tasks.push(vocabTask());
    }
    if (p.isMock) {
      tasks.push(makeTask("mixed", "Full mock test", "Mentors MBA Admission Guide + IBA Question Paper (19-20 Session)", "mock", 150, 0,
        "Sit a complete, timed, full-length mock test under real exam conditions."));
      tasks.push(makeTask("mixed", "Mock analysis", "Mock results", "review", 30, 0,
        "Score the test, log every mistake, update weak topics."));
    }
    if (p.day === 100) {
      tasks.push(makeTask("mixed", "Exam-day strategy", "Notes", "strategy", 60, 0,
        "Light skim only. Review exam-day logistics, timing strategy per section, and pacing."));
    }
    const estimatedMinutes = tasks.reduce((s, t) => s + t.duration, 0);
    return {
      day: p.day, phase: "Revision Only", phaseKey: "revision",
      mainSubject: p.subject, secondarySubject: null,
      goal: p.title + " — " + p.desc,
      tasks, estimatedMinutes,
      difficulty: "Revision", priority: p.isMock ? "Full Mock" : "Revision",
      isRevision: true
    };
  });
}

function generateDays() {
  __vocabWordsDone = 0;
  __taskCounter = 0;
  const days = [];
  const foundationState = { mathPtr: 0, gramPtr: 0 };
  for (let d = 1; d <= 20; d++) days.push(buildFoundationDay(d, foundationState));

  const coreState = { mathOtherPtr: 0, scDone: 0 };
  for (let d = 21, i = 0; d <= 45; d++, i++) days.push(buildCorePrepDay(d, coreState, i));

  for (let d = 46, i = 0; d <= 65; d++, i++) days.push(buildIntensiveDay(d, i));

  for (let d = 66, i = 1; d <= 80; d++, i++) days.push(buildIbaFocusedDay(d, i));

  for (let d = 81, i = 0; d <= 90; d++, i++) days.push(buildFinalDay(d, i));

  return days.concat(buildRevisionDays());
}

const MOTIVATION_MESSAGES = [
  "Consistency beats intensity.",
  "Finish today's plan before worrying about tomorrow.",
  "One completed day is one step closer.",
  "Progress, not perfection.",
  "Small daily effort compounds by Day 100.",
  "Protect today's plan — tomorrow has its own.",
  "A cleared error log is worth more than a re-read chapter."
];

const TASK_TYPE_LABELS = {
  concept: "Concept", practice: "Practice", timed: "Timed Practice",
  vocab: "Vocabulary", review: "Review", iba: "IBA-Style Practice",
  mock: "Mock Test", errorlog: "Error Log", weak: "Weak Topic", strategy: "Strategy",
  grammar: "Grammar", sc: "Sentence Correction", rc: "Reading Comprehension",
  cr: "Critical Reasoning", ds: "Data Sufficiency", puzzle: "Analytical Puzzle"
};
