"use client";

import { useMemo, useState } from "react";

type ViewId =
  | "overview"
  | "analyst"
  | "quality"
  | "ipeds"
  | "scenario"
  | "memory";

type QualityIssue = {
  id: string;
  severity: "Critical" | "High" | "Medium";
  title: string;
  description: string;
  records: number;
  source: string;
  owner: string;
  rule: string;
  status: "Open" | "Reviewed";
};

type AnalystAnswer = {
  eyebrow: string;
  headline: string;
  summary: string;
  delta: string;
  points: { label: string; value: number; display: string }[];
  notes: string[];
  metric: string;
  sources: string[];
};

const navigation: { id: ViewId; label: string; glyph: string }[] = [
  { id: "overview", label: "Command center", glyph: "⌂" },
  { id: "analyst", label: "Ask EduInsight", glyph: "✦" },
  { id: "quality", label: "Data quality", glyph: "✓" },
  { id: "ipeds", label: "IPEDS center", glyph: "▤" },
  { id: "scenario", label: "Scenario lab", glyph: "⌁" },
  { id: "memory", label: "Institutional memory", glyph: "◫" },
];

const queryAnswers: Record<string, AnalystAnswer> = {
  enrollment: {
    eyebrow: "Graduate enrollment • Fall census",
    headline: "MS Computer Science enrollment is up 28.6% since 2021.",
    summary:
      "Growth accelerated in Fall 2024 and remained strong in 2025. International students account for 61% of the net increase, while domestic enrollment is nearly flat.",
    delta: "+28.6%",
    points: [
      { label: "2021", value: 214, display: "214" },
      { label: "2022", value: 226, display: "226" },
      { label: "2023", value: 241, display: "241" },
      { label: "2024", value: 269, display: "269" },
      { label: "2025", value: 275, display: "275" },
    ],
    notes: [
      "Online enrollment grew 44% over the period.",
      "Three gateway sections are above 92% capacity.",
      "Spring persistence remained stable at 94.1%.",
    ],
    metric: "Fall census headcount · active degree-seeking students",
    sources: ["student_term_snapshot", "program_dim", "term_dim"],
  },
  retention: {
    eyebrow: "First-year retention • 2024 cohort",
    headline: "First-generation retention trails peers by 11.8 points.",
    summary:
      "The gap is concentrated among Pell-eligible commuters taking fewer than 15 credits. Students who completed the first six weeks without a DFW outcome retained at 84.7%.",
    delta: "−11.8 pts",
    points: [
      { label: "All FTIC", value: 78.4, display: "78.4%" },
      { label: "Continuing-gen", value: 83.1, display: "83.1%" },
      { label: "First-gen", value: 71.3, display: "71.3%" },
      { label: "First-gen + Pell", value: 67.8, display: "67.8%" },
    ],
    notes: [
      "The gap widened 2.1 points year over year.",
      "Gateway math DFW is the strongest academic signal.",
      "312 students fit the highest-friction segment.",
    ],
    metric: "IPEDS-aligned first-time, full-time fall cohort retention",
    sources: ["cohort_fact", "student_term_snapshot", "financial_aid_fact"],
  },
  dfw: {
    eyebrow: "Course outcomes • Current academic year",
    headline: "Five gateway courses drive 43% of all DFW outcomes.",
    summary:
      "College Algebra has the largest volume, while General Chemistry I has the highest rate. Online sections average 6.4 points higher DFW than in-person sections after controlling for course.",
    delta: "2,184 DFWs",
    points: [
      { label: "MATH 110", value: 31.8, display: "31.8%" },
      { label: "CHEM 101", value: 34.6, display: "34.6%" },
      { label: "ENG 101", value: 18.9, display: "18.9%" },
      { label: "BIO 120", value: 23.7, display: "23.7%" },
      { label: "CS 101", value: 21.4, display: "21.4%" },
    ],
    notes: [
      "Evening sections show the largest modality gap.",
      "Adjunct-taught sections are 3.2 points above the course mean.",
      "MATH 110 improved 1.7 points from last year.",
    ],
    metric: "Final grades D, F, or W divided by graded enrollments",
    sources: ["course_enrollment_fact", "section_dim", "faculty_assignment_fact"],
  },
};

const startingIssues: QualityIssue[] = [
  {
    id: "DQ-1042",
    severity: "Critical",
    title: "Full-time status conflicts with attempted credits",
    description:
      "Undergraduate students are coded full-time with fewer than 12 attempted credits in Fall 2025.",
    records: 146,
    source: "Banner SIS",
    owner: "Registrar",
    rule: "UG_FT_CREDIT_THRESHOLD",
    status: "Open",
  },
  {
    id: "DQ-1038",
    severity: "High",
    title: "Fall headcount changed without an explained driver",
    description:
      "Census headcount is 4.2% below last fall, outside the expected band of ±2.5%.",
    records: 684,
    source: "Census snapshot",
    owner: "Institutional Research",
    rule: "YOY_HEADCOUNT_VARIANCE",
    status: "Open",
  },
  {
    id: "DQ-1031",
    severity: "High",
    title: "Financial aid records lack term enrollment",
    description:
      "Aid disbursements exist for students with no matching enrollment in the award term.",
    records: 23,
    source: "Financial Aid",
    owner: "Student Financial Services",
    rule: "AID_WITHOUT_ENROLLMENT",
    status: "Open",
  },
  {
    id: "DQ-1027",
    severity: "Medium",
    title: "Race and ethnicity value is missing",
    description:
      "The missing rate reached 2.7% for the newest student cohort, up from 1.8%.",
    records: 119,
    source: "Admissions CRM",
    owner: "Admissions",
    rule: "DEMOGRAPHIC_COMPLETENESS",
    status: "Open",
  },
  {
    id: "DQ-1019",
    severity: "Medium",
    title: "Program CIP changed mid-year",
    description:
      "Cybersecurity moved from CIP 11.1003 to 11.1001 without a bridge record.",
    records: 307,
    source: "Curriculum catalog",
    owner: "Academic Affairs",
    rule: "CIP_EFFECTIVE_DATING",
    status: "Open",
  },
  {
    id: "DQ-1014",
    severity: "High",
    title: "Potential duplicate student identities",
    description:
      "Migration-era identifiers share name, birth month, and external student key.",
    records: 17,
    source: "Identity crosswalk",
    owner: "Enterprise Systems",
    rule: "IDENTITY_COLLISION",
    status: "Reviewed",
  },
];

const memoryItems = [
  {
    kind: "Policy",
    title: "Official Census Date and Enrollment Reporting Policy",
    excerpt:
      "Defines the census snapshot, late registration treatment, and enrollment exclusions used in official reporting.",
    updated: "Updated Aug 12, 2025",
    tags: ["enrollment", "census", "registrar"],
  },
  {
    kind: "Definition",
    title: "First-year retention semantic definition",
    excerpt:
      "Versioned institutional definition aligned to the IPEDS Fall Enrollment survey for the 2025–26 reporting year.",
    updated: "Verified Oct 3, 2025",
    tags: ["retention", "IPEDS", "cohort"],
  },
  {
    kind: "Analysis",
    title: "Computer Science capacity review",
    excerpt:
      "Prior analysis of graduate demand, gateway course utilization, faculty load, and instructional capacity.",
    updated: "Published May 19, 2025",
    tags: ["computer science", "capacity", "enrollment"],
  },
  {
    kind: "Submission",
    title: "IPEDS Fall Enrollment 2024–25",
    excerpt:
      "Certified submission package with source extracts, validation notes, approvals, and revision history.",
    updated: "Certified Apr 9, 2025",
    tags: ["IPEDS", "fall enrollment", "certified"],
  },
  {
    kind: "Accreditation",
    title: "Student success evidence inventory",
    excerpt:
      "Evidence mapped to institutional effectiveness standards, including disaggregated outcomes and action plans.",
    updated: "Reviewed Jun 28, 2025",
    tags: ["accreditation", "student success", "evidence"],
  },
];

const surveyCards = [
  {
    name: "Fall Enrollment",
    code: "EF",
    status: "Needs review",
    ready: 91,
    checks: "46 of 49",
    due: "Apr 8",
    note: "Three year-over-year checks require an explanation.",
  },
  {
    name: "Completions",
    code: "C",
    status: "Ready",
    ready: 100,
    checks: "38 of 38",
    due: "Apr 8",
    note: "All CIP and award-level validations passed.",
  },
  {
    name: "Student Financial Aid",
    code: "SFA",
    status: "In progress",
    ready: 76,
    checks: "29 of 36",
    due: "Feb 11",
    note: "Pell recipient reconciliation is still running.",
  },
  {
    name: "Outcome Measures",
    code: "OM",
    status: "Ready",
    ready: 100,
    checks: "31 of 31",
    due: "Feb 11",
    note: "Cohort exclusions are documented and approved.",
  },
];

function AppIcon({
  glyph,
  label,
}: {
  glyph: string;
  label?: string;
}) {
  return (
    <span className="app-icon" aria-hidden={label ? undefined : true}>
      {glyph}
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  return (
    <div className="sparkline" aria-label={`Trend values: ${values.join(", ")}`}>
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          style={{ height: `${34 + ((value - min) / (max - min || 1)) * 52}%` }}
        />
      ))}
    </div>
  );
}

function Header({
  title,
  description,
  onAudit,
}: {
  title: string;
  description: string;
  onAudit: () => void;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">Atlas Valley University</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="header-actions">
        <span className="synthetic-pill">
          <span className="pulse-dot" />
          Synthetic environment
        </span>
        <button className="button button-secondary" onClick={onAudit}>
          <AppIcon glyph="⌘" />
          Audit trail
        </button>
      </div>
    </header>
  );
}

function Overview({
  onNavigate,
  onAudit,
}: {
  onNavigate: (view: ViewId) => void;
  onAudit: () => void;
}) {
  return (
    <div className="view">
      <Header
        title="Institutional command center"
        description="A decision-ready brief assembled by your agents from the latest certified snapshots."
        onAudit={onAudit}
      />

      <section className="hero-grid">
        <article className="ask-card">
          <div className="ask-orb"><span>✦</span></div>
          <p className="eyebrow light">Ask your institution</p>
          <h2>Move from a question to evidence in minutes.</h2>
          <p>
            EduInsight resolves the definition, writes the query, checks the
            result, and shows its work.
          </p>
          <button
            className="button button-light"
            onClick={() => onNavigate("analyst")}
          >
            Start an analysis <span aria-hidden="true">→</span>
          </button>
          <div className="ask-suggestion">
            “Why did first-generation retention decline?”
          </div>
        </article>

        <article className="brief-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Agent brief • Oct 14, 2025</p>
              <h2>Three items need your attention.</h2>
            </div>
            <span className="agent-badge">5 agents active</span>
          </div>
          <div className="brief-list">
            <button
              className="brief-item"
              onClick={() => onNavigate("quality")}
            >
              <span className="severity-marker critical">1</span>
              <span>
                <strong>146 full-time classifications look wrong</strong>
                <small>Data Quality Agent · 8 minutes ago</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
            <button
              className="brief-item"
              onClick={() => onNavigate("quality")}
            >
              <span className="severity-marker warning">2</span>
              <span>
                <strong>Fall headcount is 4.2% below last year</strong>
                <small>Silent Error Monitor · 21 minutes ago</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
            <button
              className="brief-item"
              onClick={() => onNavigate("ipeds")}
            >
              <span className="severity-marker calm">3</span>
              <span>
                <strong>Fall Enrollment is 91% submission-ready</strong>
                <small>IPEDS Agent · 34 minutes ago</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </article>
      </section>

      <section className="metric-grid" aria-label="Institutional metrics">
        <article className="metric-card">
          <div className="metric-topline">
            <span>Fall headcount</span>
            <span className="trend negative">−4.2%</span>
          </div>
          <div className="metric-content">
            <div>
              <strong>18,426</strong>
              <small>as of census</small>
            </div>
            <Sparkline values={[88, 91, 94, 96, 99, 95]} />
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-topline">
            <span>First-year retention</span>
            <span className="trend positive">+0.8 pts</span>
          </div>
          <div className="metric-content">
            <div>
              <strong>78.4%</strong>
              <small>2024 FTIC cohort</small>
            </div>
            <Sparkline values={[70, 72, 71, 74, 76, 78]} />
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-topline">
            <span>IPEDS readiness</span>
            <span className="trend positive">+12 pts</span>
          </div>
          <div className="metric-content">
            <div>
              <strong>91%</strong>
              <small>Fall Enrollment</small>
            </div>
            <Sparkline values={[45, 54, 61, 74, 82, 91]} />
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-topline">
            <span>Open quality issues</span>
            <span className="trend neutral">−9 this week</span>
          </div>
          <div className="metric-content">
            <div>
              <strong>27</strong>
              <small>3 critical</small>
            </div>
            <Sparkline values={[92, 84, 70, 63, 50, 41]} />
          </div>
        </article>
      </section>

      <section className="two-column">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Enrollment signal</p>
              <h2>Graduate demand is reshaping capacity.</h2>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigate("analyst")}
            >
              Explore <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="capacity-chart">
            {[
              ["Business Analytics", 92, "+17%"],
              ["Computer Science", 86, "+13%"],
              ["Nursing", 78, "+8%"],
              ["Public Administration", 53, "−4%"],
            ].map(([label, value, delta]) => (
              <div className="capacity-row" key={label}>
                <span>{label}</span>
                <div className="capacity-track">
                  <span style={{ width: `${value}%` }} />
                </div>
                <strong className={delta.startsWith("−") ? "down" : ""}>
                  {delta}
                </strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Agent activity</p>
              <h2>What EduInsight completed today</h2>
            </div>
          </div>
          <div className="activity-list">
            <div>
              <span className="activity-icon">✓</span>
              <p>
                <strong>Reconciled Fall census snapshot</strong>
                <small>2.4M records · full source lineage retained</small>
              </p>
              <time>9:42</time>
            </div>
            <div>
              <span className="activity-icon">✓</span>
              <p>
                <strong>Validated Completions package</strong>
                <small>38 checks passed · ready for approval</small>
              </p>
              <time>8:17</time>
            </div>
            <div>
              <span className="activity-icon">↻</span>
              <p>
                <strong>Indexed three new policy documents</strong>
                <small>Definitions and effective dates extracted</small>
              </p>
              <time>7:54</time>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function Analyst({
  onAudit,
}: {
  onAudit: () => void;
}) {
  const [query, setQuery] = useState(
    "How has MS Computer Science enrollment changed since 2021?"
  );
  const [answer, setAnswer] = useState<AnalystAnswer>(queryAnswers.enrollment);
  const [thinking, setThinking] = useState(false);
  const [showMethod, setShowMethod] = useState(false);

  function runQuery(question = query) {
    setQuery(question);
    setThinking(true);
    window.setTimeout(() => {
      const lower = question.toLowerCase();
      if (lower.includes("retention") || lower.includes("first-generation")) {
        setAnswer(queryAnswers.retention);
      } else if (
        lower.includes("dfw") ||
        lower.includes("gateway") ||
        lower.includes("course")
      ) {
        setAnswer(queryAnswers.dfw);
      } else {
        setAnswer(queryAnswers.enrollment);
      }
      setThinking(false);
    }, 620);
  }

  const max = Math.max(...answer.points.map((point) => point.value));

  return (
    <div className="view">
      <Header
        title="Ask EduInsight"
        description="Ask in plain language. Every answer is grounded in governed metrics and traceable data."
        onAudit={onAudit}
      />

      <section className="analyst-layout">
        <article className="query-workspace">
          <div className="query-intro">
            <div className="ask-orb small"><span>✦</span></div>
            <div>
              <p className="eyebrow">AI Analyst</p>
              <h2>What would you like to understand?</h2>
            </div>
          </div>
          <label className="query-box">
            <span className="sr-only">Ask a question about institutional data</span>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  runQuery();
                }
              }}
              rows={3}
            />
            <div className="query-actions">
              <span>Uses certified metrics only</span>
              <button
                className="button button-primary"
                onClick={() => runQuery()}
                disabled={!query.trim() || thinking}
              >
                {thinking ? "Analyzing…" : "Analyze"}
                {!thinking && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </label>
          <div className="suggestion-row">
            <span>Try asking</span>
            {[
              "Why is first-generation retention lower?",
              "Which gateway courses have the highest DFW?",
              "Show graduate enrollment since 2021",
            ].map((suggestion) => (
              <button key={suggestion} onClick={() => runQuery(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        </article>

        <aside className="analyst-context">
          <p className="eyebrow">Analysis contract</p>
          <h3>What the agent will do</h3>
          <ol>
            <li><span>1</span> Resolve the institutional definition</li>
            <li><span>2</span> Generate and validate a read-only query</li>
            <li><span>3</span> Check the result for anomalies</li>
            <li><span>4</span> Explain with sources and limitations</li>
          </ol>
          <p className="context-note">
            This workspace contains synthesized student-level records only.
          </p>
        </aside>
      </section>

      <section className={`answer-card ${thinking ? "is-thinking" : ""}`}>
        {thinking ? (
          <div className="thinking-state">
            <div className="thinking-mark">✦</div>
            <div>
              <strong>EduInsight is checking the evidence</strong>
              <span>Resolving metric → validating query → testing result</span>
            </div>
          </div>
        ) : (
          <>
            <div className="answer-heading">
              <div>
                <p className="eyebrow">{answer.eyebrow}</p>
                <h2>{answer.headline}</h2>
                <p>{answer.summary}</p>
              </div>
              <span className="answer-delta">{answer.delta}</span>
            </div>
            <div className="answer-body">
              <div className="bar-chart" aria-label={answer.headline}>
                {answer.points.map((point) => (
                  <div className="bar-column" key={point.label}>
                    <span className="bar-value">{point.display}</span>
                    <div className="bar-track">
                      <span
                        style={{ height: `${Math.max(18, (point.value / max) * 100)}%` }}
                      />
                    </div>
                    <span className="bar-label">{point.label}</span>
                  </div>
                ))}
              </div>
              <div className="finding-list">
                <p className="eyebrow">What matters</p>
                {answer.notes.map((note, index) => (
                  <div key={note}>
                    <span>{index + 1}</span>
                    <p>{note}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="answer-footer">
              <div className="confidence">
                <span className="confidence-dot" />
                <span>
                  <strong>High confidence</strong>
                  <small>Metric definition and source checks passed</small>
                </span>
              </div>
              <button
                className="button button-secondary"
                onClick={() => setShowMethod(!showMethod)}
                aria-expanded={showMethod}
              >
                {showMethod ? "Hide method" : "Show method & sources"}
              </button>
            </div>
            {showMethod && (
              <div className="method-panel">
                <div>
                  <span>Interpreted metric</span>
                  <strong>{answer.metric}</strong>
                </div>
                <div>
                  <span>Semantic path</span>
                  <strong>Question → governed metric → verified SQL → result</strong>
                </div>
                <div>
                  <span>Certified sources</span>
                  <strong>{answer.sources.join(" · ")}</strong>
                </div>
                <button className="text-button" onClick={onAudit}>
                  Open full lineage <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function DataQuality({
  onAudit,
  notify,
}: {
  onAudit: () => void;
  notify: (message: string) => void;
}) {
  const [issues, setIssues] = useState(startingIssues);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<QualityIssue | null>(
    startingIssues[0]
  );
  const filtered = issues.filter(
    (issue) =>
      filter === "All" ||
      issue.severity === filter ||
      (filter === "Reviewed" && issue.status === "Reviewed")
  );

  function markReviewed(id: string) {
    setIssues((current) =>
      current.map((issue) =>
        issue.id === id ? { ...issue, status: "Reviewed" } : issue
      )
    );
    setSelected((current) =>
      current?.id === id ? { ...current, status: "Reviewed" } : current
    );
    notify("Issue marked reviewed and added to the audit trail.");
  }

  return (
    <div className="view">
      <Header
        title="Data quality"
        description="Find structural defects and plausible-looking silent errors before they reach a report."
        onAudit={onAudit}
      />
      <section className="quality-summary">
        <div className="quality-score">
          <div className="score-ring"><strong>94</strong><span>/ 100</span></div>
          <div>
            <p className="eyebrow">Trust score</p>
            <h2>Good, with three critical exceptions.</h2>
            <p>1.8M values checked across nine governed domains.</p>
          </div>
        </div>
        <div className="quality-stat">
          <span>Critical</span><strong>3</strong><small>needs action now</small>
        </div>
        <div className="quality-stat">
          <span>Silent errors</span><strong>8</strong><small>valid but implausible</small>
        </div>
        <div className="quality-stat">
          <span>Resolved</span><strong>41</strong><small>this reporting cycle</small>
        </div>
      </section>

      <section className="quality-workspace">
        <article className="issues-panel">
          <div className="panel-toolbar">
            <div>
              <p className="eyebrow">Open findings</p>
              <h2>Prioritized by reporting risk</h2>
            </div>
            <div className="filter-tabs" role="group" aria-label="Filter findings">
              {["All", "Critical", "High", "Medium", "Reviewed"].map((item) => (
                <button
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                  key={item}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="issue-list">
            {filtered.map((issue) => (
              <button
                className={`issue-row ${
                  selected?.id === issue.id ? "selected" : ""
                }`}
                onClick={() => setSelected(issue)}
                key={issue.id}
              >
                <span className={`issue-severity ${issue.severity.toLowerCase()}`}>
                  {issue.severity.slice(0, 1)}
                </span>
                <span className="issue-copy">
                  <span>
                    <strong>{issue.title}</strong>
                    {issue.status === "Reviewed" && <em>Reviewed</em>}
                  </span>
                  <small>{issue.id} · {issue.source}</small>
                </span>
                <span className="records">{issue.records.toLocaleString()}<small>records</small></span>
              </button>
            ))}
          </div>
        </article>
        <aside className="issue-detail">
          {selected ? (
            <>
              <div className="detail-topline">
                <span className={`severity-chip ${selected.severity.toLowerCase()}`}>
                  {selected.severity}
                </span>
                <span>{selected.id}</span>
              </div>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
              <div className="detail-grid">
                <div><span>Affected</span><strong>{selected.records.toLocaleString()} records</strong></div>
                <div><span>Source</span><strong>{selected.source}</strong></div>
                <div><span>Owner</span><strong>{selected.owner}</strong></div>
                <div><span>Rule</span><strong>{selected.rule}</strong></div>
              </div>
              <div className="agent-explanation">
                <span>✦</span>
                <div>
                  <strong>Why the agent flagged this</strong>
                  <p>
                    The values pass field-level validation but violate a
                    cross-domain business rule. This can silently distort
                    enrollment reporting and downstream IPEDS counts.
                  </p>
                </div>
              </div>
              <div className="detail-actions">
                <button className="button button-secondary" onClick={onAudit}>
                  Trace source
                </button>
                <button
                  className="button button-primary"
                  disabled={selected.status === "Reviewed"}
                  onClick={() => markReviewed(selected.id)}
                >
                  {selected.status === "Reviewed" ? "Reviewed" : "Mark reviewed"}
                </button>
              </div>
            </>
          ) : (
            <p>Select a finding to review.</p>
          )}
        </aside>
      </section>
    </div>
  );
}

function Ipeds({
  onAudit,
  notify,
}: {
  onAudit: () => void;
  notify: (message: string) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [validating, setValidating] = useState(false);
  const [approved, setApproved] = useState(false);
  const survey = surveyCards[selected];

  function validate() {
    setValidating(true);
    window.setTimeout(() => {
      setValidating(false);
      notify("49 validation checks completed. Three items need an explanation.");
    }, 700);
  }

  return (
    <div className="view">
      <Header
        title="IPEDS reporting center"
        description="Definitions, transformations, validations, explanations, and approvals in one reporting chain."
        onAudit={onAudit}
      />
      <section className="ipeds-banner">
        <div>
          <p className="eyebrow light">Spring collection • 2025–26</p>
          <h2>Two surveys are ready. One needs your review.</h2>
          <p>Next keyholder deadline: February 11, 2026 · 119 days remaining</p>
        </div>
        <div className="readiness-dial">
          <strong>92%</strong>
          <span>collection ready</span>
        </div>
      </section>
      <section className="survey-grid">
        {surveyCards.map((item, index) => (
          <button
            key={item.code}
            className={`survey-card ${selected === index ? "selected" : ""}`}
            onClick={() => {
              setSelected(index);
              setApproved(false);
            }}
          >
            <span className="survey-code">{item.code}</span>
            <span className={`survey-status ${item.status.toLowerCase().replace(" ", "-")}`}>
              {item.status}
            </span>
            <strong>{item.name}</strong>
            <div className="progress-track">
              <span style={{ width: `${item.ready}%` }} />
            </div>
            <small>{item.ready}% ready · {item.checks} checks</small>
          </button>
        ))}
      </section>
      <section className="ipeds-detail">
        <article className="panel ipeds-main">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{survey.code} • Due {survey.due}</p>
              <h2>{survey.name}</h2>
              <p>{survey.note}</p>
            </div>
            <button className="button button-secondary" onClick={validate}>
              {validating ? "Validating…" : "Run validation"}
            </button>
          </div>
          <div className="validation-list">
            <div className="validation-row passed">
              <span>✓</span>
              <div><strong>Structural validation</strong><small>File shape, required fields, and code sets</small></div>
              <em>18 passed</em>
            </div>
            <div className="validation-row passed">
              <span>✓</span>
              <div><strong>Internal reconciliation</strong><small>Student, program, and census totals</small></div>
              <em>16 passed</em>
            </div>
            <div className="validation-row attention">
              <span>!</span>
              <div><strong>Year-over-year variance</strong><small>Three changes exceed the expected range</small></div>
              <em>3 review</em>
            </div>
            <div className="validation-row passed">
              <span>✓</span>
              <div><strong>Cross-survey consistency</strong><small>Matches Completions and prior-year cohorts</small></div>
              <em>12 passed</em>
            </div>
          </div>
        </article>
        <aside className="approval-panel">
          <p className="eyebrow">Human approval gate</p>
          <h2>{approved ? "Package approved" : "Ready for keyholder review"}</h2>
          <p>
            EduInsight prepares and explains the package. A designated human
            remains responsible for final certification.
          </p>
          <div className="approval-flow">
            <div className="done"><span>✓</span><p><strong>Prepared</strong><small>IPEDS Agent</small></p></div>
            <div className="done"><span>✓</span><p><strong>Validated</strong><small>49 automated checks</small></p></div>
            <div className={approved ? "done" : ""}><span>{approved ? "✓" : "3"}</span><p><strong>Approve</strong><small>Keyholder required</small></p></div>
          </div>
          <button
            className="button button-primary full"
            onClick={() => {
              setApproved(true);
              notify("IPEDS package approved. Certification handoff recorded.");
            }}
            disabled={approved}
          >
            {approved ? "Approval recorded" : "Approve package"}
          </button>
          <button className="text-button centered" onClick={onAudit}>
            View source-to-submission lineage
          </button>
        </aside>
      </section>
    </div>
  );
}

function Scenario({
  onAudit,
}: {
  onAudit: () => void;
}) {
  const [change, setChange] = useState(-15);
  const [tuition, setTuition] = useState(12400);
  const baselineStudents = 18426;
  const impactedStudents = Math.round(baselineStudents * (change / 100));
  const revenueImpact = (impactedStudents * tuition) / 1_000_000;
  const sectionImpact = Math.round(impactedStudents / 24);
  const facultyImpact = Math.round((sectionImpact / 8) * 10) / 10;

  return (
    <div className="view">
      <Header
        title="Scenario lab"
        description="Model deterministic what-if decisions with transparent assumptions—without pretending a forecast is certain."
        onAudit={onAudit}
      />
      <section className="scenario-hero">
        <div>
          <p className="eyebrow light">Active scenario</p>
          <h2>What if total enrollment changes?</h2>
          <p>
            Adjust one assumption and see the direct operational effect across
            revenue, course demand, and instructional capacity.
          </p>
        </div>
        <span className="scenario-mode">Deterministic model</span>
      </section>
      <section className="scenario-layout">
        <aside className="assumptions-panel">
          <p className="eyebrow">Assumptions</p>
          <h2>Enrollment change</h2>
          <div className="slider-value">{change > 0 ? "+" : ""}{change}%</div>
          <input
            aria-label="Enrollment percentage change"
            type="range"
            min="-25"
            max="15"
            step="1"
            value={change}
            onChange={(event) => setChange(Number(event.target.value))}
          />
          <div className="range-labels"><span>−25%</span><span>Baseline</span><span>+15%</span></div>
          <label className="number-field">
            <span>Net tuition per student</span>
            <div><span>$</span><input type="number" value={tuition} onChange={(event) => setTuition(Number(event.target.value))} /></div>
          </label>
          <div className="assumption-note">
            <span>i</span>
            <p>Uses Fall 2025 census headcount and current average instructional load.</p>
          </div>
        </aside>
        <article className="scenario-results">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Modeled impact</p>
              <h2>{Math.abs(impactedStudents).toLocaleString()} {change < 0 ? "fewer" : "additional"} students</h2>
            </div>
            <span className={`scenario-direction ${change < 0 ? "negative" : "positive"}`}>
              {change < 0 ? "Contraction" : "Growth"}
            </span>
          </div>
          <div className="impact-grid">
            <div><span>Annual net tuition</span><strong>{revenueImpact < 0 ? "−" : "+"}${Math.abs(revenueImpact).toFixed(1)}M</strong><small>direct arithmetic impact</small></div>
            <div><span>Course sections</span><strong>{sectionImpact > 0 ? "+" : ""}{sectionImpact}</strong><small>at 24 students per section</small></div>
            <div><span>Faculty capacity</span><strong>{facultyImpact > 0 ? "+" : ""}{facultyImpact} FTE</strong><small>at 8 sections per FTE</small></div>
          </div>
          <div className="scenario-bars">
            {[
              ["Net tuition", Math.abs(revenueImpact) / 36, `$${Math.abs(revenueImpact).toFixed(1)}M`],
              ["Student credit hours", Math.abs(change) / 25, `${change}%`],
              ["Course sections", Math.min(1, Math.abs(sectionImpact) / 120), Math.abs(sectionImpact).toString()],
              ["Faculty capacity", Math.min(1, Math.abs(facultyImpact) / 15), `${Math.abs(facultyImpact)} FTE`],
            ].map(([label, amount, display]) => (
              <div className="scenario-bar" key={label as string}>
                <span>{label as string}</span>
                <div><span style={{ width: `${Math.max(4, Number(amount) * 100)}%` }} /></div>
                <strong>{display as string}</strong>
              </div>
            ))}
          </div>
          <div className="scenario-caveat">
            <strong>Interpretation, not prediction</strong>
            <p>
              This model shows the direct effect of your assumptions. It does
              not estimate behavioral response, program mix, discount-rate
              changes, or second-order effects.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

function Memory({
  onAudit,
}: {
  onAudit: () => void;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("All");
  const [selected, setSelected] = useState(memoryItems[1]);
  const results = useMemo(() => {
    const needle = search.toLowerCase();
    return memoryItems.filter(
      (item) =>
        (kind === "All" || item.kind === kind) &&
        (!needle ||
          item.title.toLowerCase().includes(needle) ||
          item.excerpt.toLowerCase().includes(needle) ||
          item.tags.some((tag) => tag.includes(needle)))
    );
  }, [search, kind]);

  return (
    <div className="view">
      <Header
        title="Institutional memory"
        description="Find the definition, decision, evidence, and prior analysis behind institutional work."
        onAudit={onAudit}
      />
      <section className="memory-search">
        <div className="memory-mark">◫</div>
        <div>
          <p className="eyebrow light">Governed knowledge</p>
          <h2>Ask what the institution already knows.</h2>
        </div>
        <label>
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search policies, definitions, analyses, and submissions…"
          />
        </label>
      </section>
      <div className="memory-filters" role="group" aria-label="Filter institutional memory">
        {["All", "Policy", "Definition", "Analysis", "Submission", "Accreditation"].map((item) => (
          <button className={kind === item ? "active" : ""} onClick={() => setKind(item)} key={item}>
            {item}
          </button>
        ))}
      </div>
      <section className="memory-layout">
        <article className="memory-results">
          <div className="results-topline">
            <span>{results.length} governed records</span>
            <span>Ranked by relevance</span>
          </div>
          {results.map((item) => (
            <button
              className={`memory-item ${selected.title === item.title ? "selected" : ""}`}
              onClick={() => setSelected(item)}
              key={item.title}
            >
              <span className="memory-kind">{item.kind.slice(0, 1)}</span>
              <span>
                <em>{item.kind}</em>
                <strong>{item.title}</strong>
                <small>{item.excerpt}</small>
                <span className="tag-row">{item.tags.map((tag) => <i key={tag}>{tag}</i>)}</span>
              </span>
              <time>{item.updated}</time>
            </button>
          ))}
          {!results.length && <div className="empty-state">No governed records match that search.</div>}
        </article>
        <aside className="memory-preview">
          <div className="document-page">
            <span className="doc-label">{selected.kind}</span>
            <h2>{selected.title}</h2>
            <p className="doc-meta">{selected.updated} · Owner: Institutional Research</p>
            <hr />
            <h3>Purpose</h3>
            <p>{selected.excerpt}</p>
            <h3>Governed interpretation</h3>
            <p>
              Use this record with the effective reporting year and the
              certified census population. Exclusions must be documented in the
              analysis audit trail.
            </p>
            <blockquote>
              “Official results must retain the metric version, source
              snapshot, and approver.”
            </blockquote>
            <div className="doc-citations">
              <span>3 linked definitions</span>
              <span>2 prior analyses</span>
              <span>1 certified source</span>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function AuditDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <button
        className={`drawer-scrim ${open ? "open" : ""}`}
        aria-label="Close audit trail"
        onClick={onClose}
      />
      <aside className={`audit-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Audit & provenance</p>
            <h2>Every number has a chain of custody.</h2>
          </div>
          <button aria-label="Close audit trail" onClick={onClose}>×</button>
        </div>
        <div className="audit-id">RUN-2025-10-14-0942 · Completed</div>
        <div className="lineage-flow">
          <div>
            <span>1</span>
            <p><strong>Source snapshot</strong><small>Banner SIS · Fall census · 2025-10-13 23:00</small></p>
          </div>
          <div>
            <span>2</span>
            <p><strong>Transformation</strong><small>dbt model: fct_student_term · commit 7c19e2</small></p>
          </div>
          <div>
            <span>3</span>
            <p><strong>Metric definition</strong><small>fall_headcount v3.2 · effective 2025–26</small></p>
          </div>
          <div>
            <span>4</span>
            <p><strong>Validation</strong><small>12 checks passed · 0 suppressed warnings</small></p>
          </div>
          <div>
            <span>5</span>
            <p><strong>Result</strong><small>18,426 students · generated 2025-10-14 09:42</small></p>
          </div>
        </div>
        <div className="audit-note">
          <strong>Synthetic data boundary</strong>
          <p>
            All student-level records in this environment are generated. No
            personal or institution-owned data is present.
          </p>
        </div>
        <button className="button button-primary full" onClick={onClose}>Done</button>
      </aside>
    </>
  );
}

export default function EduInsightApp() {
  const [view, setView] = useState<ViewId>("overview");
  const [auditOpen, setAuditOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState("");

  function navigate(next: ViewId) {
    setView(next);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">E</span>
          <span>
            <strong>EduInsight</strong>
            <small>Institutional intelligence</small>
          </span>
        </div>
        <nav aria-label="Primary navigation">
          <p>Workspace</p>
          {navigation.map((item) => (
            <button
              className={view === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
              key={item.id}
              aria-current={view === item.id ? "page" : undefined}
            >
              <AppIcon glyph={item.glyph} />
              <span>{item.label}</span>
              {item.id === "quality" && <em>3</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-status">
          <div>
            <span className="status-orb">✦</span>
            <p><strong>Agents online</strong><small>Last sync 8 min ago</small></p>
          </div>
          <button onClick={() => setAuditOpen(true)}>View system status →</button>
        </div>
        <div className="profile">
          <span>IR</span>
          <p><strong>Institutional Research</strong><small>Administrator</small></p>
          <button aria-label="Open profile menu">•••</button>
        </div>
      </aside>

      <button
        className="mobile-menu"
        aria-label="Toggle navigation"
        aria-expanded={mobileNavOpen}
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
      >
        <span />
        <span />
        <span />
      </button>

      <section className="main-canvas">
        {view === "overview" && (
          <Overview onNavigate={navigate} onAudit={() => setAuditOpen(true)} />
        )}
        {view === "analyst" && <Analyst onAudit={() => setAuditOpen(true)} />}
        {view === "quality" && (
          <DataQuality
            onAudit={() => setAuditOpen(true)}
            notify={notify}
          />
        )}
        {view === "ipeds" && (
          <Ipeds onAudit={() => setAuditOpen(true)} notify={notify} />
        )}
        {view === "scenario" && <Scenario onAudit={() => setAuditOpen(true)} />}
        {view === "memory" && <Memory onAudit={() => setAuditOpen(true)} />}
      </section>

      <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} />
      <div className={`toast ${toast ? "show" : ""}`} role="status">
        <span>✓</span>{toast}
      </div>
    </main>
  );
}
