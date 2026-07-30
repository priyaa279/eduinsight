"use client";

import { useEffect, useMemo, useState } from "react";
import { plannerModeLabel } from "../lib/ask/planner-presentation.mjs";
import commandCenter from "./data/command-center.generated.json";
import ipedsCom from "./data/ipeds-com.generated.json";
import ipedsEf from "./data/ipeds-ef.generated.json";
import ipedsSpecs from "./data/ipeds-specs.generated.json";

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
  status: "Open" | "New" | "Investigating" | "Reviewed" | "Resolved" | "Suppressed";
  sampleRows?: Record<string, string | number>[];
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
  confidenceDetails: {
    query: "Resolved" | "Unresolved";
    data: "Certified" | "Caveat" | "Unavailable";
    calculation: "Validated" | "Not run";
  };
  disposition: "answer" | "clarification" | "limitation" | "refusal";
  queryPlan: string;
  chartType?: "none" | "line" | "bar" | "stacked-bar";
  intent?: "definition" | "capability" | "partial" | "analytical";
  resolution?: ResolutionPanel;
};

type ResolutionField = {
  id: string;
  label: string;
  status: "resolved" | "ambiguous" | "assumed";
  assumed?: boolean;
  options: { label: string; value: string }[];
};

type ResolutionPanel = {
  originalQuestion: string;
  fields: ResolutionField[];
};

type FilterAudit = {
  detected: string[];
  applied: string[];
  complete: boolean;
};

type IpedsApproval = {
  id: string;
  surveyCode: string;
  collectionYear: string;
  specId: string;
  fileName: string;
  sha256: string;
  approver: string;
  approvedAt: string;
  status: string;
};

type IpedsPackage = {
  specId: string;
  collectionYear: string;
  verifiedAt: string;
  sourceUrl: string;
  fileStem: string;
  unitId: number;
  cellCount: number;
  uploadText: string;
  reviewCsv: string;
  validations: {
    id: string;
    label: string;
    status: string;
    passedCount: number;
    failedCount: number;
    detail: string;
    category: string;
  }[];
  structuralFailureCount: number;
  reconciliationFailureCount: number;
  assumptions: string[];
  preparedRowCount: number;
  completeSurveyPackage?: boolean;
  sourceCompleterCount?: number;
  sourceEnrollmentCount?: number;
  generatedParts?: string[];
  blockedParts?: {
    code: string;
    description: string;
    missingFields: string[];
  }[];
};

const navigation: { id: ViewId; label: string; glyph: string }[] = [
  { id: "overview", label: "Command center", glyph: "⌂" },
  { id: "analyst", label: "Ask EduInsight", glyph: "✦" },
  { id: "quality", label: "Data quality", glyph: "✓" },
  { id: "ipeds", label: "IPEDS center", glyph: "▤" },
  { id: "scenario", label: "Scenario lab", glyph: "⌁" },
  { id: "memory", label: "Institutional memory", glyph: "◫" },
];

const legacyStartingIssues: QualityIssue[] = [
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

const startingIssues: QualityIssue[] = commandCenter.qualityFindings
  .filter((issue) => issue.lifecycleStatus !== "Resolved")
  .slice(0, 12)
  .map((issue) => ({
    id: issue.issueId,
    severity: issue.severity as QualityIssue["severity"],
    title: issue.title,
    description: issue.description,
    records: issue.affectedRecords,
    source: issue.sourceSystem,
    owner: issue.owner,
    rule: issue.ruleId,
    status: issue.lifecycleStatus as QualityIssue["status"],
    sampleRows: issue.sampleRows,
  }));
void legacyStartingIssues;

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

const legacySurveyCards = [
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
    status: "Needs review",
    ready: 88,
    checks: "8 structural",
    due: "Apr 8",
    note: "COM upload is structurally valid; distance education and second majors require review.",
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

function LineChart({
  points,
  label,
}: {
  points: AnalystAnswer["points"];
  label: string;
}) {
  const width = 760;
  const height = 250;
  const padding = 34;
  const max = Math.max(...points.map((point) => point.value), 1);
  const min = Math.min(...points.map((point) => point.value), 0);
  const range = max - min || 1;
  const coordinates = points.map((point, index) => ({
    x: padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1),
    y: height - padding - ((point.value - min) / range) * (height - padding * 2),
    point,
  }));
  return (
    <div className="line-chart" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <polyline
          points={coordinates.map(({ x, y }) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coordinates.map(({ x, y, point }) => (
          <g key={point.label}>
            <circle cx={x} cy={y} r="7" />
            <text x={x} y={Math.max(18, y - 16)} textAnchor="middle">
              {point.display}
            </text>
            <text x={x} y={height - 8} textAnchor="middle">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
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
  const [analysisMode, setAnalysisMode] = useState("local deterministic planner");
  const [filterAudit, setFilterAudit] = useState<FilterAudit | null>(null);
  const [error, setError] = useState("");
  const [resolutionChoices, setResolutionChoices] = useState<Record<string, string>>({});

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
        plan?: { filterAudit?: FilterAudit };
      };
      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || "EduInsight could not calculate an answer.");
      }
      setAnswer(payload.answer);
      setResolutionChoices(
        Object.fromEntries(
          (payload.answer.resolution?.fields ?? [])
            .filter((field) => field.status === "resolved" && field.options[0])
            .map((field) => [field.id, field.options[0].value]),
        ),
      );
      setFilterAudit(payload.plan?.filterAudit ?? null);
      setAnalysisMode(plannerModeLabel(payload.planner));
    } catch (requestError) {
      setAnswer(null);
      setFilterAudit(null);
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

  function runResolvedAnalysis() {
    if (!answer?.resolution) return;
    const fields = answer.resolution.fields;
    if (fields.some((field) => !resolutionChoices[field.id])) return;
    const metric = resolutionChoices.metric ?? "Enrollment headcount";
    const program = resolutionChoices.program ?? "the institution";
    const time = resolutionChoices.time ?? "the latest available Fall term";
    const population = resolutionChoices.population
      ? `${resolutionChoices.population} in `
      : "";
    runQuery(`What was ${metric.toLowerCase()} for ${population}${program} in ${time}?`);
  }

  return (
    <div className="view">
      <Header
        title="Ask EduInsight"
        description="Ask a clear question or compact request. Every answer is calculated locally from governed, traceable data."
        onAudit={onAudit}
      />

      <section className="analyst-layout">
        <article className="query-workspace">
          <div className="query-intro">
            <div className="ask-orb small"><span>✦</span></div>
            <div>
              <p className="eyebrow">Governed analyst</p>
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
              "Show enrollment by residency in 2025.",
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
          <h3>What EduInsight will do</h3>
          <ol>
            <li><span>1</span> Check that the question is clear and supported</li>
            <li><span>2</span> Resolve and validate every requested constraint</li>
            <li><span>3</span> Calculate locally from governed sources</li>
            <li><span>4</span> Explain sources, confidence, and limitations</li>
          </ol>
          <p className="context-note">
            Supports governed enrollment, retention, IPEDS, quality, capacity,
            and course-outcome questions from the uploaded sources. Common
            academic abbreviations such as MS, BS, CS, IPEDS, and DFW are
            recognized. No external language model or API credential is used.
          </p>
        </aside>
      </section>

      <section
        className={`answer-card ${thinking ? "is-thinking" : ""}`}
        aria-live="polite"
      >
        {thinking ? (
          <div className="thinking-state">
            <div className="thinking-mark">✦</div>
            <div>
              <strong>EduInsight is checking the evidence</strong>
              <span>Checking question → validating constraints → calculating locally</span>
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
              {answer.intent === "partial" && answer.resolution ? (
                <div className="resolution-panel">
                  <p>I can calculate this once you confirm:</p>
                  {answer.resolution.fields.map((field) => (
                    <fieldset key={field.id}>
                      <legend>
                        {field.label}
                        {field.assumed ? <em>Assumed — confirm before analysis</em> : null}
                      </legend>
                      <div className="resolution-options">
                        {field.options.map((option) => (
                          <button
                            type="button"
                            className={resolutionChoices[field.id] === option.value ? "active" : ""}
                            onClick={() =>
                              setResolutionChoices((current) => ({
                                ...current,
                                [field.id]: option.value,
                              }))
                            }
                            key={option.value}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                  <button
                    className="button button-primary"
                    onClick={runResolvedAnalysis}
                    disabled={answer.resolution.fields.some(
                      (field) => !resolutionChoices[field.id],
                    )}
                  >
                    Analyze confirmed request <span aria-hidden="true">→</span>
                  </button>
                </div>
              ) : answer.chartType === "line" && answer.points.length > 1 ? (
                <LineChart points={answer.points} label={answer.headline} />
              ) : answer.chartType !== "none" && answer.points.length > 1 ? (
                <div className="bar-chart" aria-label={answer.headline}>
                  {answer.points.map((point) => (
                    <div className="bar-column" key={point.label}>
                      <span className="bar-value">{point.display}</span>
                      <div className="bar-track">
                        <span
                          style={{
                            height:
                              point.value <= 0
                                ? "0%"
                                : `${Math.max(6, (point.value / max) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="bar-label">{point.label}</span>
                    </div>
                  ))}
                </div>
              ) : answer.disposition !== "answer" ? (
                <div className="answer-empty-chart">
                  <strong>
                    {answer.disposition === "refusal"
                      ? "No sensitive data was disclosed."
                      : answer.queryPlan === "clarification_required"
                      ? "No assumption was made."
                      : "No unrelated chart was shown."}
                  </strong>
                  <span>
                    {answer.disposition === "refusal"
                      ? "This aggregate-only interface blocked the request under its privacy policy."
                      : answer.queryPlan === "clarification_required"
                      ? "Clarify the requested metric or population to continue."
                      : "The current upload does not support this calculation."}
                  </span>
                </div>
              ) : null}
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
              <div className={`confidence confidence-${answer.confidence.toLowerCase()}`}>
                <span className="confidence-dot" />
                <span>
                  <strong>
                    {answer.disposition === "refusal"
                      ? "Request blocked"
                      : answer.disposition === "clarification"
                        ? "Clarification needed"
                        : answer.disposition === "limitation"
                          ? "No governed result"
                          : `${answer.confidence} confidence`}
                  </strong>
                  <small>
                    {answer.confidence === "High"
                      ? "Query, data, and calculation checks passed"
                      : answer.confidence === "Medium"
                        ? "Calculation supported; review the data caveat"
                      : answer.disposition === "refusal"
                        ? "Request blocked by aggregate-only privacy policy"
                      : answer.queryPlan === "clarification_required"
                        ? "Waiting for a precise metric or population"
                        : "No governed result was published"}
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
                  <span>Filter completeness</span>
                  <strong>
                    {filterAudit
                      ? filterAudit.complete
                        ? "Every detected filter was applied"
                        : "Fail closed: one or more filters could not be applied"
                      : "No filter audit available"}
                  </strong>
                </div>
                <div>
                  <span>Applied filters</span>
                  <strong>
                    {filterAudit?.applied.length
                      ? filterAudit.applied.join(" · ")
                      : "No filters applied"}
                  </strong>
                </div>
                <div>
                  <span>Confidence checks</span>
                  <strong>
                    Query: {answer.confidenceDetails.query} · Data:{" "}
                    {answer.confidenceDetails.data} · Calculation:{" "}
                    {answer.confidenceDetails.calculation}
                  </strong>
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
  const [workspaceTab, setWorkspaceTab] = useState<"findings" | "catalog">("findings");
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
              <p className="eyebrow">Governed checks</p>
              <h2>{workspaceTab === "findings" ? "Prioritized by reporting risk" : "Complete rule catalog"}</h2>
            </div>
            <div className="filter-tabs" role="group" aria-label="Filter findings">
              <button
                className={workspaceTab === "findings" ? "active" : ""}
                onClick={() => setWorkspaceTab("findings")}
              >
                Findings
              </button>
              <button
                className={workspaceTab === "catalog" ? "active" : ""}
                onClick={() => setWorkspaceTab("catalog")}
              >
                Rule catalog
              </button>
            </div>
          </div>
          {workspaceTab === "findings" ? (
            <>
            <div className="filter-tabs quality-secondary-tabs" role="group" aria-label="Filter findings">
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
                    <em className={`lifecycle-chip status-${issue.status.toLowerCase()}`}>
                      {issue.status === "Open" ? "New" : issue.status}
                    </em>
                  </span>
                  <small>{issue.id} · {issue.source}</small>
                </span>
                <span className="records">{issue.records.toLocaleString()}<small>records</small></span>
              </button>
            ))}
          </div>
            </>
          ) : (
            <div className="rule-catalog-wrap">
              <table className="rule-catalog">
                <thead>
                  <tr>
                    <th>Rule ID</th>
                    <th>Category</th>
                    <th>Domain</th>
                    <th>Threshold</th>
                    <th>Owner</th>
                    <th>State</th>
                    <th>Last fired</th>
                  </tr>
                </thead>
                <tbody>
                  {commandCenter.qualityRuleCatalog.map((rule) => (
                    <tr key={rule.id}>
                      <td><strong>{rule.id}</strong><small>{rule.implementationRule}</small></td>
                      <td>{rule.category}</td>
                      <td>{rule.domain}</td>
                      <td>{rule.threshold}</td>
                      <td>{rule.owner}</td>
                      <td>
                        <span className={`catalog-state ${rule.enabled ? "enabled" : "pending"}`}>
                          {rule.enabled ? "Enabled" : "Disabled"}
                        </span>
                        <small>{rule.coverage}</small>
                      </td>
                      <td>{rule.lastFiredCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                  <p>{selected.description}</p>
                </div>
              </div>
              <div className="sample-records">
                <div className="sample-records-heading">
                  <strong>Affected sample rows</strong>
                  <span>{selected.sampleRows?.length ?? 0} source records shown</span>
                </div>
                {selected.sampleRows?.length ? (
                  <div className="sample-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(selected.sampleRows[0]).map((key) => <th key={key}>{key}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.sampleRows.map((row, index) => (
                          <tr key={`${selected.id}-${index}`}>
                            {Object.keys(selected.sampleRows![0]).map((key) => <td key={key}>{row[key]}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="sample-unavailable">
                    This source supplied only an aggregate finding, so row-level samples are unavailable.
                  </p>
                )}
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

function LegacyIpeds({
  onAudit,
  notify,
}: {
  onAudit: () => void;
  notify: (message: string) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [validating, setValidating] = useState(false);
  const [approved, setApproved] = useState(false);
  const survey = legacySurveyCards[selected];

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
        {legacySurveyCards.map((item, index) => (
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

void LegacyIpeds;

function LegacyIpedsGenerated({
  onAudit,
  notify,
}: {
  onAudit: () => void;
  notify: (message: string) => void;
}) {
  const [selected, setSelected] = useState(1);
  const [validating, setValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [approved, setApproved] = useState(false);
  const [packageHash, setPackageHash] = useState("");
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const survey = legacySurveyCards[selected];
  const isCompletions = survey.code === "C";
  const varianceItems = [
    "Completions changed more than 10% from the prior reporting year.",
    "CIP 11.0701 increased outside the expected historical range.",
  ];
  const allExplained = varianceItems.every((_, index) =>
    explanations[String(index)]?.trim(),
  );
  const canApprove =
    isCompletions &&
    generated &&
    validationComplete &&
    ipedsCom.structuralFailureCount === 0 &&
    allExplained;

  function downloadArtifact(contents: string, fileName: string, type: string) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function validate() {
    setValidating(true);
    window.setTimeout(() => {
      setValidating(false);
      setValidationComplete(true);
      const failures =
        ipedsCom.structuralFailureCount + ipedsCom.reconciliationFailureCount;
      notify(
        isCompletions
          ? `${ipedsCom.validations.length} COM checks completed with ${failures} failures.`
          : "The survey validation run completed.",
      );
    }, 450);
  }

  async function approvePackage() {
    if (!canApprove) return;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(ipedsCom.uploadText),
    );
    const hash = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    setPackageHash(hash);
    setApproved(true);
    notify("COM package approved, frozen, and sealed with SHA-256.");
  }

  return (
    <div className="view">
      <Header
        title="IPEDS reporting center"
        description="Prepare, validate, review, and seal submission artifacts from governed institutional data."
        onAudit={onAudit}
      />
      <section className="ipeds-banner">
        <div>
          <p className="eyebrow light">Spring collection · 2025–26</p>
          <h2>Completions upload preparation is now reproducible.</h2>
          <p>Governed source → prepared contract → aggregated cells → validated key-value file</p>
        </div>
        <div className="readiness-dial">
          <strong>92%</strong>
          <span>collection ready</span>
        </div>
      </section>
      <section className="survey-grid">
        {legacySurveyCards.map((item, index) => (
          <button
            key={item.code}
            className={`survey-card ${selected === index ? "selected" : ""}`}
            onClick={() => {
              setSelected(index);
              setApproved(false);
              setValidationComplete(false);
              setGenerated(false);
              setPackageHash("");
            }}
          >
            <span className="survey-code">{item.code}</span>
            <span className={`survey-status ${item.status.toLowerCase().replace(" ", "-")}`}>
              {item.status}
            </span>
            <strong>{item.name}</strong>
            <div className="progress-track"><span style={{ width: `${item.ready}%` }} /></div>
            <small>{item.ready}% ready · {item.checks} checks</small>
          </button>
        ))}
      </section>
      <section className="ipeds-detail">
        <article className="panel ipeds-main">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{survey.code} · Due {survey.due}</p>
              <h2>{survey.name}</h2>
              <p>{survey.note}</p>
            </div>
            <div className="ipeds-actions">
              <button className="button button-secondary" onClick={validate}>
                {validating ? "Validating…" : "Run validation"}
              </button>
              {isCompletions ? (
                <button
                  className="button button-primary"
                  onClick={() => {
                    setGenerated(true);
                    notify("COM upload and review artifacts generated.");
                  }}
                >
                  Generate upload file
                </button>
              ) : null}
            </div>
          </div>
          {isCompletions ? (
            <>
              <div className="com-pipeline">
                <span>1 Source ({ipedsCom.sourceCompleterCount.toLocaleString()})</span>
                <b>→</b>
                <span>2 Prepared ({ipedsCom.preparedRowCount.toLocaleString()})</span>
                <b>→</b>
                <span>3 Cells ({ipedsCom.cellCount.toLocaleString()})</span>
                <b>→</b>
                <span>4 Key-value file</span>
              </div>
              <div className="validation-list">
                {ipedsCom.validations.map((check) => (
                  <div
                    className={`validation-row ${check.status === "Passed" ? "passed" : "attention"}`}
                    key={check.id}
                  >
                    <span>{check.status === "Passed" ? "✓" : "!"}</span>
                    <div>
                      <strong>{check.label}</strong>
                      <small>{check.id} · {check.detail}</small>
                    </div>
                    <em>
                      {validationComplete
                        ? check.status === "Passed"
                          ? `${check.passedCount} passed`
                          : `${check.failedCount} failed`
                        : "Not run"}
                    </em>
                  </div>
                ))}
              </div>
              <div className="ipeds-assumptions">
                {ipedsCom.assumptions.map((assumption) => (
                  <p key={assumption}><strong>Manual review:</strong> {assumption}</p>
                ))}
              </div>
              {generated ? (
                <div className="download-row">
                  <button
                    className="button button-secondary"
                    onClick={() =>
                      downloadArtifact(
                        ipedsCom.uploadText,
                        `ipeds_com_upload_${ipedsCom.reportingYear}.txt`,
                        "text/plain;charset=utf-8",
                      )
                    }
                  >
                    Download COM .txt
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() =>
                      downloadArtifact(
                        ipedsCom.reviewCsv,
                        `ipeds_com_review_${ipedsCom.reportingYear}.csv`,
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    Download review CSV
                  </button>
                </div>
              ) : null}
              <div className="variance-explanations">
                <p className="eyebrow">Required year-over-year explanations</p>
                {varianceItems.map((item, index) => (
                  <label key={item}>
                    <span>{item}</span>
                    <textarea
                      rows={2}
                      value={explanations[String(index)] ?? ""}
                      onChange={(event) =>
                        setExplanations((current) => ({
                          ...current,
                          [String(index)]: event.target.value,
                        }))
                      }
                      placeholder="Enter the keyholder's written explanation…"
                    />
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="validation-list">
              <div className="validation-row passed">
                <span>✓</span>
                <div><strong>Existing survey checks</strong><small>Select Completions to generate a COM import package.</small></div>
                <em>{survey.checks}</em>
              </div>
            </div>
          )}
        </article>
        <aside className="approval-panel">
          <p className="eyebrow">Human approval gate</p>
          <h2>{approved ? "Package approved and sealed" : "Keyholder review required"}</h2>
          <p>
            Approval remains blocked until the upload file validates and every
            material year-over-year variance has a written explanation.
          </p>
          <div className="approval-flow">
            <div className={generated ? "done" : ""}><span>{generated ? "✓" : "1"}</span><p><strong>Prepared</strong><small>{generated ? `${ipedsCom.cellCount} cells` : "Generate file"}</small></p></div>
            <div className={validationComplete ? "done" : ""}><span>{validationComplete ? "✓" : "2"}</span><p><strong>Validated</strong><small>{ipedsCom.validations.length} checks</small></p></div>
            <div className={approved ? "done" : ""}><span>{approved ? "✓" : "3"}</span><p><strong>Approve</strong><small>Keyholder required</small></p></div>
          </div>
          <button
            className="button button-primary full"
            onClick={approvePackage}
            disabled={!canApprove || approved}
          >
            {approved ? "Approval recorded" : "Approve package"}
          </button>
          {!canApprove && !approved ? (
            <p className="approval-blocker">
              Generate the file, run validation, and explain both variance items to unlock approval.
            </p>
          ) : null}
          {packageHash ? (
            <div className="package-seal">
              <span>Frozen SHA-256</span>
              <code>{packageHash}</code>
            </div>
          ) : null}
          <button className="text-button centered" onClick={onAudit}>
            View source-to-submission lineage
          </button>
        </aside>
      </section>
    </div>
  );
}

void LegacyIpedsGenerated;

function Ipeds({
  onAudit,
  notify,
  onApproval,
}: {
  onAudit: () => void;
  notify: (message: string) => void;
  onApproval: (approval: IpedsApproval) => void;
}) {
  const [selected, setSelected] = useState(1);
  const [validating, setValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [approved, setApproved] = useState(false);
  const [packageHash, setPackageHash] = useState("");
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [annualChangesAcknowledged, setAnnualChangesAcknowledged] =
    useState(false);
  const [approvalSaving, setApprovalSaving] = useState(false);
  const surveyCards = ipedsSpecs.surveys;
  const survey = surveyCards[selected];
  const isCompletions = survey.code === "C";
  const isFallEnrollment = survey.code === "EF";
  const packageData = (
    isCompletions ? ipedsCom : isFallEnrollment ? ipedsEf : null
  ) as unknown as IpedsPackage | null;
  const canGenerate = Boolean(survey.generator && packageData);
  const packageComplete = packageData?.completeSurveyPackage !== false;
  const varianceItems = isCompletions
    ? [
        "Completions changed more than 10% from the prior reporting year.",
        "CIP 11.0701 increased outside the expected historical range.",
      ]
    : isFallEnrollment
      ? ["Fall census headcount changed outside the expected year-over-year range."]
      : [];
  const allExplained = varianceItems.every((_, index) =>
    explanations[String(index)]?.trim(),
  );
  const validationFailures = packageData
    ? packageData.structuralFailureCount +
      packageData.reconciliationFailureCount
    : 0;
  const canApprove =
    canGenerate &&
    packageComplete &&
    generated &&
    validationComplete &&
    validationFailures === 0 &&
    allExplained &&
    annualChangesAcknowledged;
  const readiness =
    survey.coverage === "full" && packageComplete
      ? 88
      : survey.coverage === "full"
        ? 70
        : survey.coverage === "partial"
          ? 35
          : 0;
  const blockers = [
    !canGenerate ? survey.reason : "",
    canGenerate && !generated ? "Generate the governed upload artifacts." : "",
    canGenerate && !validationComplete
      ? "Run structural and reconciliation validation."
      : "",
    validationFailures > 0
      ? "Resolve every structural and reconciliation failure."
      : "",
    !packageComplete
      ? "Complete every required survey part; this partial file is not ready for DCS upload."
      : "",
    varianceItems.length && !allExplained
      ? "Write an explanation for every material year-over-year variance."
      : "",
    !annualChangesAcknowledged
      ? "Acknowledge the 2025–26 NCES specification changes."
      : "",
  ].filter(Boolean);

  function resetSurvey(index: number) {
    setSelected(index);
    setApproved(false);
    setValidationComplete(false);
    setGenerated(false);
    setPackageHash("");
    setExplanations({});
  }

  function downloadArtifact(contents: string, fileName: string, type: string) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function validate() {
    if (!packageData) {
      notify(`${survey.code} validation is unavailable: ${survey.reason}`);
      return;
    }
    setValidating(true);
    window.setTimeout(() => {
      setValidating(false);
      setValidationComplete(true);
      notify(
        `${packageData.validations.length} ${survey.code} checks completed with ${validationFailures} failures.`,
      );
    }, 450);
  }

  async function approvePackage() {
    if (!canApprove || !packageData) return;
    setApprovalSaving(true);
    try {
      const fileName = `${packageData.fileStem}_approved.txt`;
      const response = await fetch("/api/ipeds/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyCode: survey.code,
          collectionYear: packageData.collectionYear,
          specId: packageData.specId,
          fileName,
          uploadText: packageData.uploadText,
          approver: "Institutional Research",
          explanations,
          validationFailureCount: validationFailures,
          completeSurveyPackage: packageComplete,
        }),
      });
      const result = (await response.json()) as {
        approval?: IpedsApproval;
        error?: string;
      };
      if (!response.ok || !result.approval) {
        throw new Error(result.error || "Approval could not be persisted.");
      }
      setPackageHash(result.approval.sha256);
      setApproved(true);
      onApproval(result.approval);
      notify(
        `${survey.code} package frozen and marked ready for the keyholder. EduInsight did not submit it to NCES.`,
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "The approval record could not be saved.",
      );
    } finally {
      setApprovalSaving(false);
    }
  }

  return (
    <div className="view">
      <Header
        title="IPEDS reporting center"
        description="Prepare governed files, validate every supported part, and create a durable keyholder handoff record."
        onAudit={onAudit}
      />
      <section className="ipeds-banner">
        <div>
          <p className="eyebrow light">All collection windows · 2025–26</p>
          <h2>Every live IPEDS component is visible—without fabricated files.</h2>
          <p>
            12 current components · 2 generators · unsupported data domains are
            explicitly blocked
          </p>
        </div>
        <div className="readiness-dial">
          <strong>2/12</strong>
          <span>generators available</span>
        </div>
      </section>
      <section className="spec-governance panel">
        <div>
          <p className="eyebrow">Annual specification control</p>
          <h2>{ipedsSpecs.catalogVersion}</h2>
          <p>
            Verified {ipedsSpecs.verifiedAt}. Survey membership, fields, parts,
            code tables, and key order are versioned data and must be checked
            before each collection window.
          </p>
        </div>
        <div className="annual-change-list">
          {ipedsSpecs.annualChanges.changes.map((change) => (
            <span key={`${change.component}-${change.type}`}>
              <strong>{change.component}</strong> {change.summary}
            </span>
          ))}
        </div>
        <button
          className={`button ${
            annualChangesAcknowledged
              ? "button-secondary"
              : "button-primary"
          }`}
          onClick={() => setAnnualChangesAcknowledged(true)}
          disabled={annualChangesAcknowledged}
        >
          {annualChangesAcknowledged
            ? "Annual changes acknowledged"
            : "Acknowledge annual changes"}
        </button>
      </section>
      <section className="survey-grid full-catalog">
        {surveyCards.map((item, index) => (
          <button
            key={item.code}
            className={`survey-card ${selected === index ? "selected" : ""}`}
            onClick={() => resetSurvey(index)}
          >
            <span className="survey-code">{item.code}</span>
            <span
              className={`survey-status ${item.coverage}`}
            >
              {item.status}
            </span>
            <strong>{item.name}</strong>
            <small>
              {item.window} collection · {item.coverage} warehouse coverage
            </small>
          </button>
        ))}
      </section>
      <section className="ipeds-detail">
        <article className="panel ipeds-main">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {survey.code} · {survey.window} collection · {readiness}% prepared
              </p>
              <h2>{survey.name}</h2>
              <p>{survey.reason}</p>
            </div>
            <div className="ipeds-actions">
              {canGenerate ? (
                <button className="button button-secondary" onClick={validate}>
                  {validating ? "Validating…" : "Run validation"}
                </button>
              ) : null}
              {canGenerate ? (
                <button
                  className="button button-primary"
                  onClick={() => {
                    setGenerated(true);
                    notify(
                      `${survey.code} upload and review artifacts generated from governed data.`,
                    );
                  }}
                >
                  Generate upload file
                </button>
              ) : null}
            </div>
          </div>
          {packageData ? (
            <>
              <div className="com-pipeline">
                <span>
                  1 Source (
                  {(
                    packageData.sourceCompleterCount ??
                    packageData.sourceEnrollmentCount ??
                    0
                  ).toLocaleString()}
                  )
                </span>
                <b>→</b>
                <span>
                  2 Prepared ({packageData.preparedRowCount.toLocaleString()})
                </span>
                <b>→</b>
                <span>3 Cells ({packageData.cellCount.toLocaleString()})</span>
                <b>→</b>
                <span>4 Key-value file</span>
              </div>
              {packageData.generatedParts ? (
                <div className="part-status-grid">
                  {packageData.generatedParts.map((part) => (
                    <span className="generated" key={part}>
                      Part {part} generated
                    </span>
                  ))}
                  {packageData.blockedParts?.map((part) => (
                    <span className="blocked" key={part.code}>
                      Part {part.code} blocked · {part.missingFields.join(", ")}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="validation-list">
                {packageData.validations.map((check) => (
                  <div
                    className={`validation-row ${
                      check.status === "Passed" ? "passed" : "attention"
                    }`}
                    key={check.id}
                  >
                    <span>{check.status === "Passed" ? "✓" : "!"}</span>
                    <div>
                      <strong>{check.label}</strong>
                      <small>
                        {check.id} · {check.detail}
                      </small>
                    </div>
                    <em>
                      {validationComplete
                        ? check.status === "Passed"
                          ? `${check.passedCount} passed`
                          : `${check.failedCount} failed`
                        : "Not run"}
                    </em>
                  </div>
                ))}
              </div>
              <div className="ipeds-assumptions">
                {packageData.assumptions.map((assumption) => (
                  <p key={assumption}>
                    <strong>Manual review:</strong> {assumption}
                  </p>
                ))}
              </div>
              {generated ? (
                <div className="download-row">
                  <button
                    className="button button-secondary"
                    onClick={() =>
                      downloadArtifact(
                        packageData.uploadText,
                        `${packageData.fileStem}_draft.txt`,
                        "text/plain;charset=utf-8",
                      )
                    }
                  >
                    Download {survey.code} .txt
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() =>
                      downloadArtifact(
                        packageData.reviewCsv,
                        `${packageData.fileStem}_review.csv`,
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    Download review CSV
                  </button>
                  <p className="filename-caption">
                    This filename is EduInsight’s internal recordkeeping
                    convention. NCES validates the key-value content, not a
                    mandated filename.
                  </p>
                </div>
              ) : null}
              {varianceItems.length ? (
                <div className="variance-explanations">
                  <p className="eyebrow">
                    Required year-over-year explanations
                  </p>
                  {varianceItems.map((item, index) => (
                    <label key={item}>
                      <span>{item}</span>
                      <textarea
                        rows={2}
                        value={explanations[String(index)] ?? ""}
                        onChange={(event) =>
                          setExplanations((current) => ({
                            ...current,
                            [String(index)]: event.target.value,
                          }))
                        }
                        placeholder="Enter the institutional review explanation…"
                      />
                    </label>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="unsupported-survey">
              <p className="eyebrow">Generator intentionally unavailable</p>
              <h3>{survey.status}</h3>
              <p>{survey.reason}</p>
              <strong>
                No upload file will be generated until the missing governed
                source domain and official survey rules are implemented.
              </strong>
            </div>
          )}
        </article>
        <aside className="approval-panel">
          <p className="eyebrow">Human approval gate</p>
          <h2>
            {approved
              ? "Ready-for-keyholder record saved"
              : "Keyholder handoff review"}
          </h2>
          <p>
            This freezes and hashes the artifact for a human keyholder to upload
            in the real NCES Data Collection System. EduInsight does not submit
            or lock IPEDS surveys.
          </p>
          <div className="approval-flow">
            <div className={generated ? "done" : ""}>
              <span>{generated ? "✓" : "1"}</span>
              <p>
                <strong>Prepared</strong>
                <small>
                  {generated && packageData
                    ? `${packageData.cellCount} cells`
                    : "Generate file"}
                </small>
              </p>
            </div>
            <div className={validationComplete ? "done" : ""}>
              <span>{validationComplete ? "✓" : "2"}</span>
              <p>
                <strong>Validated</strong>
                <small>{packageData?.validations.length ?? 0} checks</small>
              </p>
            </div>
            <div className={approved ? "done" : ""}>
              <span>{approved ? "✓" : "3"}</span>
              <p>
                <strong>Ready for keyholder</strong>
                <small>Persistent seal required</small>
              </p>
            </div>
          </div>
          {blockers.length && !approved ? (
            <div className="blocker-checklist">
              <strong>Blocking items</strong>
              {blockers.map((blocker) => (
                <p key={blocker}>
                  <span>!</span>
                  {blocker}
                </p>
              ))}
            </div>
          ) : null}
          <button
            className="button button-primary full"
            onClick={approvePackage}
            disabled={!canApprove || approved || approvalSaving}
          >
            {approved
              ? "Ready-for-keyholder record saved"
              : approvalSaving
                ? "Freezing package…"
                : "Mark ready for keyholder"}
          </button>
          {packageHash ? (
            <div className="package-seal">
              <span>Frozen SHA-256</span>
              <code>{packageHash}</code>
            </div>
          ) : null}
          <button className="text-button centered" onClick={onAudit}>
            View source-to-handoff lineage
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
  ipedsApprovals,
}: {
  open: boolean;
  onClose: () => void;
  ipedsApprovals: IpedsApproval[];
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
        {ipedsApprovals.length ? (
          <div className="audit-approvals">
            <p className="eyebrow">IPEDS keyholder handoffs</p>
            {ipedsApprovals.map((approval) => (
              <div key={approval.id}>
                <strong>
                  {approval.surveyCode} · {approval.status}
                </strong>
                <small>
                  {approval.approver} ·{" "}
                  {new Date(approval.approvedAt).toLocaleString()}
                </small>
                <code>{approval.sha256}</code>
              </div>
            ))}
          </div>
        ) : null}
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
  const [ipedsApprovals, setIpedsApprovals] = useState<IpedsApproval[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/ipeds/approvals", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return { approvals: [] };
        return (await response.json()) as { approvals?: IpedsApproval[] };
      })
      .then((result) => {
        if (active) setIpedsApprovals(result.approvals ?? []);
      })
      .catch(() => {
        // The reporting UI remains usable if the persistence service is offline.
      });
    return () => {
      active = false;
    };
  }, []);

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
          <Ipeds
            onAudit={() => setAuditOpen(true)}
            notify={notify}
            onApproval={(approval) =>
              setIpedsApprovals((current) => [
                approval,
                ...current.filter((item) => item.id !== approval.id),
              ])
            }
          />
        )}
        {view === "scenario" && <Scenario onAudit={() => setAuditOpen(true)} />}
        {view === "memory" && <Memory onAudit={() => setAuditOpen(true)} />}
      </section>

      <AuditDrawer
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        ipedsApprovals={ipedsApprovals}
      />
      <div className={`toast ${toast ? "show" : ""}`} role="status">
        <span>✓</span>{toast}
      </div>
    </main>
  );
}
