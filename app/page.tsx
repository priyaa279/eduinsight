"use client";

import { useMemo, useState } from "react";
import commandCenter from "./data/command-center.generated.json";

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
  limitations: string[];
  confidence: "High" | "Medium" | "Low";
  queryPlan: string;
};

const navigation: { id: ViewId; label: string; glyph: string }[] = [
  { id: "overview", label: "Command center", glyph: "⌂" },
  { id: "analyst", label: "Ask EduInsight", glyph: "✦" },
  { id: "quality", label: "Data quality", glyph: "✓" },
  { id: "ipeds", label: "IPEDS center", glyph: "▤" },
  { id: "scenario", label: "Scenario lab", glyph: "⌁" },
  { id: "memory", label: "Institutional memory", glyph: "◫" },
];

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
        <p className="eyebrow">{commandCenter.institution.name}</p>
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
  const metrics = [
    { data: commandCenter.kpis.fallHeadcount, tone: "negative" },
    { data: commandCenter.kpis.firstYearRetention, tone: "positive" },
    { data: commandCenter.kpis.ipedsReadiness, tone: "positive" },
    { data: commandCenter.kpis.openQualityIssues, tone: "neutral" },
  ];

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
              <p className="eyebrow">Agent brief • {commandCenter.briefDate}</p>
              <h2>Three items need your attention.</h2>
            </div>
            <span className="agent-badge">{commandCenter.activeAgents} agents active</span>
          </div>
          <div className="brief-list">
            {commandCenter.brief.map((item) => (
              <button
                className="brief-item"
                onClick={() => onNavigate(item.destination as ViewId)}
                key={item.priority}
              >
                <span className={`severity-marker ${item.severity}`}>
                  {item.priority}
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="metric-grid" aria-label="Institutional metrics">
        {metrics.map(({ data, tone }) => (
          <article className="metric-card" key={data.label}>
            <div className="metric-topline">
              <span>{data.label}</span>
              <span className={`trend ${tone}`}>{data.deltaDisplay}</span>
            </div>
            <div className="metric-content">
              <div>
                <strong>{data.display}</strong>
                <small>{data.context}</small>
              </div>
              <Sparkline values={data.trend} />
            </div>
          </article>
        ))}
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
            {commandCenter.programSignals.map((signal) => (
              <div className="capacity-row" key={signal.programId}>
                <span>{signal.label}</span>
                <div className="capacity-track">
                  <span style={{ width: signal.utilizationDisplay }} />
                </div>
                <strong className={signal.growth < 0 ? "down" : ""}>
                  {signal.delta}
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
            {commandCenter.activity.map((item) => (
              <div key={`${item.time}-${item.activity}`}>
              <span className="activity-icon">↻</span>
              <p>
                  <strong>{item.activity}</strong>
                  <small>{item.detail}</small>
              </p>
                <time>{item.time}</time>
              </div>
            ))}
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
  const [answer, setAnswer] = useState<AnalystAnswer | null>(null);
  const [thinking, setThinking] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const [analysisMode, setAnalysisMode] = useState("governed local planner");
  const [error, setError] = useState("");

  async function runQuery(question = query) {
    const nextQuestion = question.trim();
    if (!nextQuestion) return;
    setQuery(nextQuestion);
    setThinking(true);
    setError("");
    setShowMethod(false);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: nextQuestion }),
      });
      const payload = (await response.json()) as {
        answer?: AnalystAnswer;
        error?: string;
        planner?: string;
        plannerWarning?: string | null;
      };
      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || "EduInsight could not calculate an answer.");
      }
      setAnswer(payload.answer);
      setAnalysisMode(
        payload.planner === "openai"
          ? "AI semantic planner + governed calculation"
          : payload.planner === "local_fallback"
            ? "governed local planner · AI planner temporarily unavailable"
            : "governed local planner",
      );
    } catch (requestError) {
      setAnswer(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "EduInsight could not calculate an answer.",
      );
    } finally {
      setThinking(false);
    }
  }

  const max = answer
    ? Math.max(1, ...answer.points.map((point) => point.value))
    : 1;

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
              "Enrollment by residency in 2025",
              "How has BS retention changed since 2021?",
              "Which program has the most international students?",
              "Which graduate programs use the most capacity?",
              "Which IPEDS checks require review?",
              "What data is available?",
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
            Supports governed enrollment, retention, IPEDS, quality, capacity,
            and course-outcome questions from the uploaded sources.
          </p>
        </aside>
      </section>

      <section className={`answer-card ${thinking ? "is-thinking" : ""}`}>
        {thinking ? (
          <div className="thinking-state">
            <div className="thinking-mark">✦</div>
            <div>
              <strong>EduInsight is checking the evidence</strong>
              <span>Resolving metric → calculating from the upload → testing result</span>
            </div>
          </div>
        ) : error ? (
          <div className="thinking-state analyst-error" role="alert">
            <div className="thinking-mark">!</div>
            <div>
              <strong>The analysis could not be completed</strong>
              <span>{error}</span>
            </div>
          </div>
        ) : answer ? (
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
              {answer.points.length ? (
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
              ) : (
                <div className="answer-empty-chart">
                  <strong>No unrelated chart was shown.</strong>
                  <span>The current upload does not support this calculation.</span>
                </div>
              )}
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
                  <strong>{answer.confidence} confidence</strong>
                  <small>
                    {answer.confidence === "High"
                      ? "Metric definition and source checks passed"
                      : "Review the stated source limitations"}
                  </small>
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
                  <span>Validated query plan</span>
                  <strong>{answer.queryPlan}</strong>
                </div>
                <div>
                  <span>Planning mode</span>
                  <strong>{analysisMode}</strong>
                </div>
                <div>
                  <span>Certified sources</span>
                  <strong>{answer.sources.length ? answer.sources.join(" · ") : "No matching source"}</strong>
                </div>
                <div>
                  <span>Limitations</span>
                  <strong>{answer.limitations.join(" ")}</strong>
                </div>
                <button className="text-button" onClick={onAudit}>
                  Open full lineage <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="thinking-state analyst-ready">
            <div className="thinking-mark">✦</div>
            <div>
              <strong>Ready to calculate from the current upload</strong>
              <span>
                Change the program, population, metric, or year and select Analyze.
              </span>
            </div>
          </div>
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
  const baselineStudents = commandCenter.kpis.fallHeadcount.value;
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
        <div className="audit-id">{commandCenter.audit.runId} · Completed</div>
        <div className="lineage-flow">
          {commandCenter.audit.steps.map((step, index) => (
            <div key={step.label}>
              <span>{index + 1}</span>
              <p><strong>{step.label}</strong><small>{step.detail}</small></p>
            </div>
          ))}
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
