/* ==========================================================================
   viva.js — BUILT-IN VIVA PANEL (no API key, works offline)

   Two parts:
     LocalViva.pick(focus, count, profile)   -> interview questions
     LocalViva.evaluate(item, answer)        -> score /10 + feedback + model answer

   The scoring is a rubric, not a language model: it measures the things a
   real panel actually reacts to — did you cover the substance the question
   asks for, is it specific (numbers, names, a real example), is it structured,
   is it the right length for 45-90 seconds of speech, and is it padded with
   filler. That is blunt but consistent, and it never needs the internet.
   If an AI provider IS configured, the VIVA page offers that instead.
   ========================================================================== */

const LocalViva = {

  /* ---------- question bank ----------
     keys: each ideal point carries the words/ideas that signal it was covered. */
  BANK: [
    /* ---- PERSONAL / MOTIVATION ---- */
    { c: "Personal", q: "Tell us about yourself.", open: true,
      points: [
        { p: "A clear academic background (institution, subject, when)", keys: ["bba", "bsc", "ba ", "honours", "graduat", "university", "college", "studied", "major", "hsc"] },
        { p: "What you do now — work, internship or final-year focus", keys: ["work", "job", "intern", "company", "currently", "final year", "freelanc", "family business"] },
        { p: "One thing that makes you distinct — an achievement, a project, a responsibility", keys: ["led", "organis", "organiz", "founded", "captain", "volunteer", "club", "project", "award", "achiev", "started"] },
        { p: "A closing line pointing at why you are here", keys: ["mba", "iba", "goal", "because", "want to", "aim", "next step"] }
      ],
      model: "I completed my BBA in marketing from ___ in 2024, where I was also the events secretary of the business club. For the last year and a half I've been in sales at ___, handling twelve retail accounts in Dhaka. The part of the job I enjoy most is reading the numbers behind why one outlet outsells another — which is exactly the gap I want to close with an MBA at IBA before moving into brand management." },

    { c: "Personal", q: "Why do you want to do an MBA, and why now?",
      points: [
        { p: "A concrete gap in your current skill set", keys: ["gap", "lack", "don't have", "do not have", "limited", "need", "weak in", "no formal"] },
        { p: "What the MBA specifically supplies (finance, strategy, analytics, network)", keys: ["finance", "strategy", "analytic", "operations", "network", "leadership", "case", "managerial"] },
        { p: "Why this point in your life rather than later", keys: ["now", "two years", "three years", "right time", "early", "before", "stage"] },
        { p: "The role it leads to afterwards", keys: ["manager", "consult", "brand", "analyst", "entrepreneur", "own business", "lead", "role"] }
      ],
      model: "Two years in operations taught me how a process runs but not how it is valued — I can tell you our delivery cost per unit, not what it does to margin or to a financing decision. An MBA gives me finance, strategy and structured problem-solving. Now is the right time because I still have enough runway to change track, and enough work experience to make the classroom discussions useful rather than theoretical. My aim is a management role in operations strategy within five years." },

    { c: "Personal", q: "Why IBA, University of Dhaka, in particular?",
      points: [
        { p: "Something specific about IBA — rigour, reputation, alumni, case method, cost", keys: ["iba", "reputation", "alumni", "rigor", "rigour", "case", "faculty", "corporate", "oldest", "public", "affordab", "placement"] },
        { p: "Fit with your own goals", keys: ["goal", "my", "career", "want", "plan"] },
        { p: "Evidence you have actually looked into it — courses, people, structure", keys: ["curriculum", "course", "evening", "professor", "spoke", "talked", "senior", "batch", "program"] }
      ],
      model: "Three reasons. The alumni network in Bangladeshi corporates is unmatched — in my own company the two people I learn most from are IBA graduates. The programme is case-heavy, which suits how I learn. And its cost-to-value ratio means I can do it without debt that would force me back into the same job I'm trying to leave." },

    { c: "Personal", q: "What is your greatest strength, and how has it shown up at work or in your studies?",
      points: [
        { p: "A named strength, not a list", keys: ["strength", "i am", "i'm", "my "] },
        { p: "A concrete situation where it was visible", keys: ["when", "example", "once", "project", "last", "during", "we had", "case"] },
        { p: "The outcome it produced", keys: ["result", "we ", "increase", "reduc", "saved", "finished", "won", "improv", "%", "percent"] }
      ],
      model: "Follow-through on unglamorous detail. When our distributor data was a mess, nobody wanted to touch it; I spent three weeks rebuilding the sheet with consistent SKU codes. It sounds small, but it cut our monthly reporting time from two days to about three hours and it caught a pricing error worth roughly Tk 4 lakh a quarter." },

    { c: "Personal", q: "What is your biggest weakness?",
      points: [
        { p: "A real weakness, honestly named (not a disguised strength)", keys: ["weak", "struggle", "difficult", "not good", "tend to", "impatien", "nervous", "delegat", "public speak", "detail", "procrastinat", "say no"] },
        { p: "A cost it has actually had", keys: ["cost", "missed", "late", "lost", "problem", "mistake", "suffer", "delay"] },
        { p: "What you are concretely doing about it", keys: ["working on", "started", "now i", "practice", "learn", "improv", "feedback", "course", "habit"] }
      ],
      model: "I take on too much myself rather than delegating, because handing over feels slower in the moment. It cost me during a campus event where I ended up doing three roles and the sponsorship follow-ups slipped. Since then I write out who owns what before a project starts, and I've forced myself to accept work that's 80% of how I'd do it." },

    { c: "Personal", q: "Where do you see yourself in five years?",
      points: [
        { p: "A specific role or function, not just 'a good position'", keys: ["manager", "lead", "head", "analyst", "consultant", "brand", "own", "founder", "director", "specialist"] },
        { p: "A plausible path from where you are now", keys: ["after", "first", "then", "start", "move", "two years", "three years", "step"] },
        { p: "What you will have learned or built by then", keys: ["team", "skill", "experience", "build", "learn", "manage", "portfolio", "p&l"] }
      ],
      model: "Five years out I'd expect to be leading a small brand or category team — owning a P&L rather than a task list. The path: finish the MBA, move into a management-trainee or associate role on the marketing side, spend two to three years learning the category properly, then take on a team. What matters to me is having built people, not just numbers, by then." },

    { c: "Personal", q: "Tell us about a time you failed. What did you do about it?",
      points: [
        { p: "A real failure with something at stake", keys: ["fail", "lost", "rejected", "didn't", "did not", "mistake", "wrong", "missed", "collaps"] },
        { p: "Your own responsibility in it, not blame", keys: ["i ", "my fault", "i should", "i didn't", "i misjudg", "my mistake", "responsib"] },
        { p: "What specifically changed afterwards", keys: ["since then", "learned", "now i", "changed", "next time", "started", "process"] }
      ],
      model: "I ran a campus career fair and assumed sponsors confirmed in March would pay by May. Two dropped out three weeks before, and we cut the venue and printed materials at the last minute. That was my misjudgement — I had verbal commitments and no signed terms. Since then I don't treat anything as confirmed without a written commitment and a fallback that covers at least half the budget." },

    { c: "Personal", q: "Your academic results have a weak patch. How do you explain it?", sensitive: true,
      points: [
        { p: "An honest, non-defensive account", keys: ["yes", "true", "honest", "i ", "was", "because"] },
        { p: "Context without excuse-making", keys: ["at that time", "family", "illness", "job", "transition", "adjust", "first year"] },
        { p: "Evidence of recovery or compensating strength", keys: ["improved", "later", "after that", "cgpa rose", "since", "result", "work", "certificat", "consistent"] }
      ],
      model: "My first-year results were below what I'm capable of — I was commuting three hours a day and treating attendance as optional. I take the responsibility for that. From second year my CGPA moved from 2.9 to 3.5, and I've held a full-time job since graduating while completing two professional certifications, which I think is a fairer test of how I work now." },

    /* ---- BUSINESS / ECONOMY ---- */
    { c: "Business", q: "Bangladesh's economy leans heavily on ready-made garments. What are the risks, and what would you diversify into?",
      points: [
        { p: "Named the concentration risk clearly", keys: ["concentrat", "depend", "single", "one sector", "risk", "vulnerab", "80", "eighty", "export"] },
        { p: "A specific threat — buyer power, margins, automation, LDC graduation, compliance", keys: ["automat", "ldc", "graduat", "duty", "gsp", "buyer", "margin", "wage", "competition", "vietnam", "compliance", "energy"] },
        { p: "A concrete diversification candidate with a reason", keys: ["pharma", "it ", "software", "outsourc", "leather", "agro", "jute", "light engineering", "shipbuild", "ceramic", "freelanc", "remittance", "tourism"] },
        { p: "What it would take to get there — skills, policy, infrastructure", keys: ["policy", "skill", "training", "infrastructure", "invest", "incentive", "port", "energy", "education", "capital"] }
      ],
      model: "RMG is roughly four-fifths of exports, so a demand shock in Europe or an LDC-graduation tariff change hits the whole current account at once. The margin structure is also thin, which discourages the automation needed to stay competitive with Vietnam. I'd back pharmaceuticals and IT-enabled services: both already export, both are skill- rather than land-intensive, and both scale on training rather than on new industrial capacity. The binding constraint is skills and reliable energy, not demand." },

    { c: "Business", q: "Pick a company you admire and explain exactly how it makes money.",
      points: [
        { p: "A named company", keys: ["ltd", "limited", "group", "bank", "company", "brand", "pathao", "bkash", "grameen", "beximco", "square", "walton", "unilever", "apple", "amazon", "netflix"] },
        { p: "The actual revenue mechanism, not the product story", keys: ["revenue", "charge", "fee", "commission", "margin", "subscription", "advertis", "interest", "spread", "per transaction", "price", "volume"] },
        { p: "Why the model is defensible — scale, network, brand, distribution", keys: ["network", "scale", "distribut", "brand", "switch", "moat", "loyal", "data", "cost advantage"] },
        { p: "A risk to it", keys: ["risk", "competit", "regulat", "threat", "margin pressure", "depend"] }
      ],
      model: "bKash. The money comes from transaction fees — cash-out and merchant charges on a very high volume of small transfers — plus float income on balances held. It is defensible because of distribution: an agent network that took a decade and Brac Bank's licence to build, and network effects once everyone you'd send money to is already on it. The risk is regulatory: interchange caps or a state-backed competitor changes the unit economics overnight." },

    { c: "Business", q: "Inflation has squeezed household budgets here. As a marketing manager of an FMCG brand, what would you do?",
      points: [
        { p: "Recognised the trade-off between price, volume and brand equity", keys: ["price", "volume", "margin", "equity", "elastic", "demand", "trade"] },
        { p: "A specific lever — pack size, SKU mix, promotion, channel", keys: ["pack", "sachet", "smaller", "sku", "promotion", "bundle", "channel", "distribut", "entry pack", "value pack", "shrink"] },
        { p: "Awareness of the competitor and consumer reaction", keys: ["competitor", "consumer", "switch", "down-trade", "downtrade", "loyal", "perception", "backlash"] },
        { p: "How you would measure whether it worked", keys: ["measure", "track", "data", "test", "pilot", "share", "sales", "kpi", "monitor"] }
      ],
      model: "Consumers don't stop buying, they down-trade — so the danger is losing them to a cheaper brand permanently. I'd protect the price point on the entry sachet and take the cost on pack size rather than on headline price, keep the premium SKU untouched to preserve equity, and push distribution depth in the areas where our share is under-indexed. Then I'd pilot it in two regions and watch volume share, not just revenue, for eight weeks before rolling out." },

    { c: "Business", q: "What is the difference between profit and cash flow, and why does it matter?",
      points: [
        { p: "Profit is accounting; cash is timing of money in and out", keys: ["accrual", "accounting", "timing", "receiv", "payable", "credit", "recognis", "recogniz", "actual cash"] },
        { p: "A concrete way a profitable business runs out of cash", keys: ["receivable", "inventory", "credit", "delay", "payment", "working capital", "growth", "collect"] },
        { p: "Why a manager cares", keys: ["salary", "supplier", "loan", "survive", "run out", "solvent", "pay"] }
      ],
      model: "Profit is recorded when a sale is made; cash moves when the customer actually pays. A distributor selling on 90-day credit while paying suppliers in 30 is profitable on paper and still can't make payroll — that's working capital squeezing the business. Growth makes it worse, not better, because every new order ties up more cash. That's why you can't manage on the P&L alone." },

    { c: "Business", q: "What do you understand by opportunity cost? Give an example from your own life.",
      points: [
        { p: "Correct definition — the value of the best alternative forgone", keys: ["next best", "alternative", "forgo", "give up", "sacrific", "instead"] },
        { p: "A personal example with a real trade-off", keys: ["i ", "my ", "job", "salary", "time", "chose", "decided", "instead of"] },
        { p: "Recognition that it applies to time and capital, not just money", keys: ["time", "capital", "money", "invest", "resource"] }
      ],
      model: "It's the value of the best alternative you gave up, not what you spent. Doing this MBA costs me tuition, but the real cost is two years of salary and promotion I forgo — that's the number I had to be convinced by. It applies to time too: the evenings I spend preparing for this test are evenings not spent on freelance work I used to take." },

    { c: "Business", q: "Would you rather run a business with high margins and low volume, or low margins and high volume? Why?",
      points: [
        { p: "Picked a side rather than hedging", keys: ["i would", "i'd", "prefer", "choose", "rather"] },
        { p: "Reasoning about fixed costs, scale or resilience", keys: ["fixed cost", "scale", "break", "volume", "margin", "cushion", "resilien", "cash", "working capital"] },
        { p: "Acknowledged the weakness of your own choice", keys: ["however", "but ", "downside", "risk", "weak", "depends", "although"] },
        { p: "Context-dependence — what would change your answer", keys: ["depends", "market", "sector", "capital", "competition", "if "] }
      ],
      model: "High margin, low volume, for the cushion. A thin-margin business dies of a 5% cost shock, and in Bangladesh energy and freight costs move exactly that way. The downside is that high margins invite competition and I'd be exposed to a small number of customers. If I had cheap capital and a protected distribution advantage, the volume model would be the stronger bet." },

    /* ---- SITUATIONAL / LEADERSHIP / ETHICS ---- */
    { c: "Situational", q: "You discover your line manager is quietly inflating monthly sales figures. What do you do?",
      points: [
        { p: "Verify the facts before acting", keys: ["verify", "check", "sure", "evidence", "confirm", "data", "understand", "misunderstand"] },
        { p: "Raise it directly with the person first, if it is safe to", keys: ["talk", "speak", "ask", "direct", "him", "her", "privately", "conversation"] },
        { p: "Escalate through a proper channel if it continues", keys: ["escalat", "hr", "senior", "compliance", "audit", "report", "higher", "policy"] },
        { p: "Weighed the consequences honestly — to the company and to yourself", keys: ["consequence", "risk", "job", "career", "integrity", "company", "reputation", "investor", "legal"] }
      ],
      model: "First I'd make sure I'm right — reporting errors look like fraud more often than fraud does. If the numbers really are being inflated, I'd raise it with him directly and privately, because there may be pressure from above that he'd rather fix than defend. If it continued, I'd escalate through internal audit or compliance with the documentation, not with an accusation. Misstated revenue is not a private matter between two people; it misleads whoever relies on those numbers." },

    { c: "Situational", q: "You are leading a team of five and one member consistently misses deadlines. How do you handle it?",
      points: [
        { p: "Find the cause before judging", keys: ["why", "cause", "ask", "understand", "talk", "capacity", "overload", "personal", "unclear"] },
        { p: "A private conversation with specific examples", keys: ["private", "one-on-one", "specific", "example", "feedback", "direct"] },
        { p: "A concrete corrective arrangement", keys: ["deadline", "check-in", "milestone", "smaller", "plan", "expectation", "clear", "written", "support"] },
        { p: "What you do if it does not improve", keys: ["if not", "escalat", "reassign", "remove", "consequence", "manager", "hr"] }
      ],
      model: "I'd start by asking rather than assuming — slipped deadlines are usually unclear scope or an overloaded person, not laziness. Then a private conversation using the last two specific instances, not a general complaint. We'd agree on smaller milestones with a mid-week check-in so nothing surfaces on the due date. If it didn't improve after a cycle, I'd reallocate the critical-path work and involve my manager rather than let the team carry it silently." },

    { c: "Situational", q: "Two of your team members refuse to work together and the deadline is in a week. What now?",
      points: [
        { p: "Deadline first, relationship second", keys: ["deadline", "deliver", "first", "priorit", "now", "week"] },
        { p: "Separate the work so delivery is not hostage to the conflict", keys: ["split", "separate", "divide", "parallel", "interface", "independ", "own"] },
        { p: "Deal with the underlying conflict after, properly", keys: ["after", "later", "sit", "resolve", "talk", "mediat", "understand", "root"] },
        { p: "Your own role in not letting it fester", keys: ["i ", "my responsib", "lead", "set", "expect", "clear"] }
      ],
      model: "With a week left I'm not going to solve their relationship first. I'd split the deliverable so each owns a self-contained piece with a defined interface, and I take the integration myself so nothing depends on them agreeing. Then after delivery I'd sit with them separately to find out what actually happened, because leaving it unresolved means I'm redesigning work around it forever." },

    { c: "Situational", q: "A major client asks you for a small favour that breaks company policy. They bring most of your revenue. What do you do?",
      points: [
        { p: "Named the conflict plainly", keys: ["policy", "conflict", "revenue", "pressure", "important client", "rule"] },
        { p: "Refused the breach but not the relationship", keys: ["no", "cannot", "can't", "decline", "alternative", "instead", "option", "explain", "find a way"] },
        { p: "Escalated or documented rather than deciding alone", keys: ["manager", "escalat", "senior", "approval", "document", "written", "legal", "compliance"] },
        { p: "Thought about precedent", keys: ["precedent", "next time", "again", "once", "expect", "slippery"] }
      ],
      model: "I'd say no to the specific thing and yes to the problem behind it — usually the client wants an outcome, not a rule broken. So: explain what I can't do and why, then offer the closest compliant alternative, and take it up the chain if the exception is genuinely worth making at a level above me. The thing I'd keep in mind is precedent — a favour granted once becomes the expectation, and then the relationship is built on it." },

    { c: "Situational", q: "You are given a project with an unrealistic deadline. What is your response?",
      points: [
        { p: "Did not simply accept or simply refuse", keys: ["negotiat", "discuss", "ask", "clarify", "options", "talk"] },
        { p: "Broke the work down to show what is actually possible", keys: ["break", "estimate", "scope", "phase", "milestone", "minimum", "priorit", "critical"] },
        { p: "Offered trade-offs — scope, resources or time", keys: ["scope", "resource", "people", "trade", "either", "reduce", "extra", "phase one"] },
        { p: "Raised it early rather than at the deadline", keys: ["early", "immediately", "upfront", "now", "before", "first"] }
      ],
      model: "The worst response is to accept and miss it silently. I'd break it down, come back within a day with what is genuinely achievable, and present it as a choice: full scope with two more weeks, or the core deliverable on time with the secondary parts phased. If neither is available, I'd say plainly what will be incomplete on the date so nobody is surprised. Bad news early is a manageable problem; bad news late is a crisis." },

    { c: "Situational", q: "How would you convince a team of people older and more experienced than you to adopt your idea?",
      points: [
        { p: "Earn credibility before asking for change", keys: ["credibil", "listen", "learn", "first", "respect", "understand", "ask", "experience"] },
        { p: "Evidence rather than assertion", keys: ["data", "evidence", "number", "pilot", "test", "show", "result", "proof"] },
        { p: "Framed it around their problem, not your idea", keys: ["their", "problem", "benefit", "pain", "help", "what they"] },
        { p: "Willing to be wrong", keys: ["wrong", "feedback", "adjust", "open", "listen", "input", "might"] }
      ],
      model: "I'd stop selling and start asking — people who've done the job for fifteen years usually know exactly why the obvious idea hasn't worked before. Then I'd run the smallest possible pilot so the argument is about results instead of opinion, and frame it in terms of the problem they complain about, not the solution I like. And I'd genuinely be prepared to find out my idea was wrong for reasons I couldn't see from the outside." },

    /* ---- CURRENT AFFAIRS ---- */
    { c: "Current Affairs", q: "What is one recent development in Bangladesh that you think matters for business, and why?", open: true,
      points: [
        { p: "A specific, identifiable development", keys: ["policy", "budget", "election", "bank", "taka", "reserve", "tariff", "ldc", "energy", "gas", "inflation", "export", "reform", "interest rate", "vat"] },
        { p: "Who it affects and how", keys: ["affect", "impact", "business", "consumer", "exporter", "import", "cost", "sme", "employ"] },
        { p: "A second-order consequence, not just the headline", keys: ["therefore", "so ", "which means", "consequen", "result", "knock", "in turn", "long run"] },
        { p: "Your own view, held with reasons", keys: ["i think", "i believe", "in my view", "i'd argue", "my view"] }
      ],
      model: "LDC graduation. The headline is a status change, but the business consequence is losing duty-free access to the EU, which is the difference between competing on price and competing on lead time and compliance. Second-order: it pushes exporters toward higher-value products and better compliance records, and it raises the value of anyone who can manage that transition. In my view it's a deadline the RMG sector has known about for years and has mostly treated as someone else's problem." },

    { c: "Current Affairs", q: "How has digital payment adoption changed business in Bangladesh?",
      points: [
        { p: "Named the actual change — MFS, agent banking, QR, e-commerce", keys: ["mfs", "bkash", "nagad", "rocket", "agent bank", "qr", "mobile", "digital", "e-commerce", "online"] },
        { p: "Who it reached that banks did not", keys: ["unbank", "rural", "informal", "small", "sme", "women", "remittance", "worker", "access"] },
        { p: "A business consequence — cost, data, credit, distribution", keys: ["cost", "cash handling", "data", "credit", "lending", "distribut", "record", "footprint", "collection"] },
        { p: "A remaining problem", keys: ["fee", "fraud", "literacy", "regulat", "interoperab", "trust", "cash still", "cash-out"] }
      ],
      model: "Mobile financial services reached people that branch banking never did — a rural retailer now settles with a distributor without holding cash overnight. The underrated consequence is data: a merchant with two years of transaction history is lendable for the first time, which starts to solve the SME credit problem. What's still unsolved is cost — cash-out fees are real, so a lot of money still lands digitally and leaves as cash immediately." },

    { c: "Current Affairs", q: "Should Bangladesh prioritise attracting foreign investment or supporting local industry? Take a position.",
      points: [
        { p: "Took a clear position", keys: ["i would", "i think", "prioriti", "should", "my view", "argue", "favour", "favor"] },
        { p: "An argument with a mechanism, not a slogan", keys: ["capital", "technology", "transfer", "employ", "export", "know-how", "competition", "productiv", "scale", "supply chain"] },
        { p: "Acknowledged the opposing case", keys: ["however", "on the other", "but ", "critics", "downside", "risk", "argument against"] },
        { p: "Something concrete about how, not just what", keys: ["policy", "zone", "sez", "tax", "regulat", "one-stop", "infrastructure", "skill", "contract", "enforce"] }
      ],
      model: "I'd prioritise foreign investment, but for the technology and supply-chain access rather than the capital — capital alone we can borrow. An FDI-anchored electronics or pharma supplier drags local firms up to its quality standard, which is a productivity transfer no subsidy achieves. The counter-argument is real: protected local industries create employment now and FDI can be footloose. So the how matters — predictable regulation and enforceable contracts do more than tax holidays, which mostly subsidise what would have happened anyway." },

    { c: "Current Affairs", q: "What do you think AI will change about the kind of job you want after your MBA?",
      points: [
        { p: "Specific about which tasks change", keys: ["task", "analysis", "report", "research", "data", "draft", "routine", "summar", "forecast", "automat"] },
        { p: "What becomes more valuable rather than only what disappears", keys: ["judgement", "judgment", "decision", "relationship", "context", "responsib", "ask", "question", "domain", "people"] },
        { p: "A realistic personal response", keys: ["i will", "i'd", "learn", "use", "tool", "adapt", "skill", "practice"] }
      ],
      model: "The parts of a marketing analyst's job that are 'pull the numbers and write the summary' are already collapsing to minutes. What gets more valuable is deciding which question is worth asking and carrying the responsibility for a decision that the data underdetermines — a model won't sit in front of a distributor and defend a price change. So my plan is to be fluent with the tools and deliberate about building the judgement they can't supply." },

    /* ---- CLOSING ---- */
    { c: "Personal", q: "Is there anything you would like to ask us?", open: true,
      points: [
        { p: "Asked something substantive rather than 'nothing'", keys: ["?", "how", "what", "would", "could", "do you", "curious", "ask"] },
        { p: "A question about the programme, the experience or the panel's view", keys: ["programme", "program", "course", "class", "student", "faculty", "career", "alumni", "batch", "advice", "prepare"] },
        { p: "Not a question you could have answered by reading the website", keys: ["your", "you", "experience", "see", "advice", "view", "typical"] }
      ],
      model: "Yes — what distinguishes the students who get the most out of this programme from those who merely finish it? And is there anything you would suggest I do in the months before classes begin to be ready for the pace here?" }
  ],

  /* ---------- selection ---------- */
  pick(focus, count, profile) {
    const want = (c) => this.BANK.filter(q => q.c === c);
    let pool;
    if (focus === "personal") pool = want("Personal");
    else if (focus === "business") pool = want("Business");
    else if (focus === "situational") pool = want("Situational");
    else if (focus === "current") pool = want("Current Affairs");
    else pool = null;

    const shuffle = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
    const n = Math.max(3, Math.min(12, Number(count) || 8));
    let chosen;

    if (pool) {
      chosen = shuffle(pool).slice(0, n);
    } else {
      // realistic mix: opens with "tell us about yourself", closes with "any questions"
      const opener = this.BANK[0];
      const closer = this.BANK.find(q => /anything you would like to ask/i.test(q.q));
      const rest = this.BANK.filter(q => q !== opener && q !== closer);
      const byCat = (c) => shuffle(rest.filter(q => q.c === c));
      const mix = [];
      const personal = byCat("Personal"), business = byCat("Business"), sit = byCat("Situational"), cur = byCat("Current Affairs");
      const order = ["Personal", "Personal", "Business", "Situational", "Business", "Current Affairs", "Personal", "Situational", "Business", "Current Affairs"];
      const take = { Personal: personal, Business: business, Situational: sit, "Current Affairs": cur };
      order.forEach(c => { if (mix.length < n - 2 && take[c].length) mix.push(take[c].shift()); });
      chosen = [opener].concat(mix).slice(0, n - 1);
      if (closer && chosen.length < n) chosen.push(closer);
    }

    return chosen.map((q, i) => ({
      id: "lv" + i,
      question: q.q,
      category: q.c,
      idealPoints: q.points.map(p => p.p),
      _points: q.points,
      _model: q.model,
      _open: !!q.open,
      _profile: profile || ""
    }));
  },

  /* ---------- scoring ---------- */
  _words(t) { return (String(t || "").trim().match(/\S+/g) || []); },

  _coverage(item, low) {
    const pts = item._points || [];
    const hit = [], miss = [];
    pts.forEach(p => {
      const ok = (p.keys || []).some(k => low.includes(k));
      (ok ? hit : miss).push(p.p);
    });
    return { hit, miss, ratio: pts.length ? hit.length / pts.length : 0 };
  },

  _specificity(answer, low) {
    let n = 0;
    if (/\d/.test(answer)) n++;                                        // a number
    if (/\b(for example|for instance|once|last year|in 20\d\d|when i|we had|in my)\b/.test(low)) n++;  // an anecdote
    if ((answer.match(/(?!^)\b[A-Z][a-z]{2,}/g) || []).length >= 2) n++; // named things
    if (/%|taka|tk|crore|lakh|percent/.test(low)) n++;                  // quantified
    return n;                                                           // 0-4
  },

  _structure(answer, low) {
    let n = 0;
    const sentences = (answer.match(/[.!?]+/g) || []).length;
    if (sentences >= 3) n++;
    if (/\b(first|second|firstly|secondly|then|finally|to begin)\b/.test(low)) n++;
    if (/\b(because|therefore|so that|which means|as a result|however|whereas|although)\b/.test(low)) n++;
    if (/\b(so|overall|that is why|in short|which is why)\b/.test(low)) n++;
    return n;                                                           // 0-4
  },

  _filler(low) {
    const bad = ["i think maybe", "something like that", "things like that", "you know", "basically", "etc", "and all", "blah", "whatever", "kind of like", "i guess"];
    let n = 0;
    bad.forEach(b => { if (low.includes(b)) n++; });
    return n;
  },

  evaluate(item, answer) {
    const text = String(answer || "").trim();
    const low = " " + text.toLowerCase().replace(/\s+/g, " ") + " ";
    const words = this._words(text).length;

    if (words < 8) {
      return {
        score: 1,
        verdict: "Too short to be an answer — in a real viva this reads as being unprepared.",
        strengths: [],
        improvements: [
          "Aim for roughly 90-180 words: about 45-90 seconds of speech.",
          "Answer the question in your first sentence, then support it with one concrete example."
        ].concat((item.idealPoints || []).slice(0, 2).map(p => "Cover: " + p)),
        modelAnswer: item._model || "",
        breakdown: { words }
      };
    }

    const cov = this._coverage(item, low);
    const spec = this._specificity(text, low);
    const str = this._structure(text, low);
    const fill = this._filler(low);

    // length band: 90-200 words is the sweet spot for a spoken viva answer
    let lengthScore;
    if (words < 35) lengthScore = 0.3;
    else if (words < 70) lengthScore = 0.7;
    else if (words <= 220) lengthScore = 1;
    else if (words <= 300) lengthScore = 0.75;
    else lengthScore = 0.5;

    // open-ended questions can't be keyword-checked as hard
    const covWeight = item._open ? 3.0 : 4.0;
    let score =
      covWeight * cov.ratio +
      2.2 * (spec / 4) +
      1.8 * (str / 4) +
      2.0 * lengthScore +
      (item._open ? 1.0 * Math.min(1, spec / 2) : 0);
    score -= Math.min(1.5, fill * 0.5);
    score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));

    const strengths = [];
    if (cov.hit.length) strengths.push("Covered: " + cov.hit.slice(0, 3).join("; ") + ".");
    if (spec >= 2) strengths.push("Concrete — you used real specifics rather than generalities, which is what a panel remembers.");
    if (str >= 3) strengths.push("Well structured: the answer has a clear line of reasoning rather than a list of thoughts.");
    if (words >= 70 && words <= 220) strengths.push("Good length for a spoken answer (" + words + " words ≈ " + Math.round(words / 2.2) + " seconds).");

    const improvements = [];
    cov.miss.slice(0, 3).forEach(m => improvements.push("Not covered: " + m + "."));
    if (spec < 2) improvements.push("Add one specific anchor — a number, a company name, a dated example. Generic answers score low even when they are correct.");
    if (str < 2) improvements.push("Structure it: position first, then two supporting reasons, then a one-line close.");
    if (words < 70) improvements.push("Too brief at " + words + " words — develop one point properly instead of stopping early.");
    if (words > 260) improvements.push("Too long at " + words + " words — a panel stops listening after about 90 seconds. Cut the preamble.");
    if (fill) improvements.push("Filler phrases (\"you know\", \"basically\", \"things like that\") weaken it — pause instead.");
    if (!improvements.length) improvements.push("Solid. Tighten the opening sentence so the position lands in the first eight words.");

    let verdict;
    if (score >= 8.5) verdict = "Strong — specific, structured and the right length.";
    else if (score >= 7) verdict = "Good answer with a clear gap or two left on the table.";
    else if (score >= 5) verdict = "Acceptable but generic — the substance is thin for a competitive viva.";
    else if (score >= 3) verdict = "Weak: it touches the question but doesn't answer it with anything a panel could hold on to.";
    else verdict = "This would not land well — it misses most of what the question is asking for.";

    return {
      score, verdict, strengths, improvements,
      modelAnswer: item._model || "",
      breakdown: { words, covered: cov.hit.length, totalPoints: (item._points || []).length, specificity: spec, structure: str, filler: fill }
    };
  }
};
