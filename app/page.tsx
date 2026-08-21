"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { plannerModeLabel } from "../lib/ask/planner-presentation.mjs";
import { searchMemoryRecords } from "../lib/institutional-memory-search.mjs";
import {
  calculateEnrollmentMix,
  calculateFacultyAttrition,
  calculatePricingAndAid,
  calculateProgramCapacity,
  calculateRetentionImprovement,
  deriveScenarioEffect,
  formatCurrency,
} from "../lib/scenario-model.mjs";
import {
  loadSavedScenarios,
  persistSavedScenarios,
} from "../lib/scenario-storage.mjs";
import {
  DATA_QUALITY_LIFECYCLE_STATUSES,
  stableFindingIdentity,
} from "../lib/data-quality/lifecycle.mjs";
import commandCenter from "./data/command-center.generated.json";
import ipedsSpecs from "./data/ipeds-specs.generated.json";
import ipedsSuite from "./data/ipeds-suite.generated.json";
import institutionalMemory from "./data/institutional-memory.json";
import institutionalMemoryExpanded from "./data/institutional-memory-expanded.json";
import scenarioBaselines from "./data/scenario-baselines.generated.json";
import { ArchColonnade, EmptyPlot, QuadPlan, SealMark } from "./artwork";

type ViewId =
  | "overview"
  | "analyst"
  | "quality"
  | "ipeds"
  | "scenario"
  | "memory";

type QualityIssue = {
  findingKey: string;
  id: string;
  severity: "Critical" | "High" | "Medium";
  findingType: "DATA_DEFECT" | "ANOMALY";
  title: string;
  description: string;
  records: number;
  observation?: Record<string, string | number | boolean | null> | null;
  source: string;
  sourceFiles: string[];
  sourceFields: string[];
  owner: string;
  rule: string;
  countSemantics: string;
  status: "Open" | "In Review" | "Resolved" | "Suppressed";
  reviewNotes: string;
  reviewerIdentity: string | null;
  reviewerDisplayName: string | null;
  lifecycleCreatedAt: string | null;
  lifecycleUpdatedAt: string | null;
  sampleRows?: Record<string, string | number>[];
};

type QualityLifecycle = {
  findingKey: string;
  issueId: string;
  ruleId: string;
  status: QualityIssue["status"];
  notes: string;
  reviewerIdentity: string | null;
  reviewerDisplayName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastSeenEvaluationAt: string | null;
  isActive: boolean;
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
  explanations?: Record<string, string>;
};

type MemoryRecord = {
  id: string;
  kind: "Policy" | "Definition" | "Analysis" | "Submission" | "Accreditation";
  title: string;
  term: string;
  excerpt: string;
  body: string;
  updated: string;
  effective: string;
  owner: string;
  status: string;
  source: string;
  sourceUrl: string | null;
  use: string;
  tags: string[];
  related: string[];
  calculation?: string;
  numerator?: string;
  denominator?: string;
};

type ScenarioMode =
  | "enrollment"
  | "retention"
  | "pricing"
  | "capacity"
  | "faculty";

type ScenarioResult = {
  title: string;
  summary: string;
  metrics: {
    label: string;
    value: number;
    display: string;
  }[];
  comparison: {
    headcountImpact: number;
    annualRevenueImpact: number;
    financialHorizonYears: number;
    capacitySeatImpact: number;
    capacityImpactKind:
      | "student-seat-demand"
      | "course-seat-demand"
      | "course-seat-supply"
      | "none";
    capacityImpactUnit: "student seats" | "course seats" | null;
    facultyFteImpact: number;
    facultyImpactKind: "faculty-demand" | "faculty-supply" | "none";
  };
  assumptions: string[];
  sources: string[];
  series?: number[];
  details?: {
    discountRatePointChange: number;
    coveredStudents: number;
    modeledNetPriceChange: number;
  };
  program?: {
    programId: string;
    name: string;
    memoryRecordId: string | null;
  };
};

type SavedScenario = {
  id: string;
  name: string;
  mode: ScenarioMode;
  result: ScenarioResult;
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
  sourceRecordCount?: number;
  generatedParts?: string[];
  caveats?: string[];
  blockedParts?: {
    code: string;
    description: string;
    missingFields: string[];
  }[];
  notApplicableParts?: {
    code: string;
    description: string;
    reason: string;
  }[];
};

type IconName =
  | "arrow-right"
  | "check"
  | "command"
  | "external"
  | "home"
  | "ipeds"
  | "memory"
  | "quality"
  | "refresh"
  | "scenario"
  | "search"
  | "sparkles"
  | "warning";

const navigation: { id: ViewId; label: string; icon: IconName }[] = [
  { id: "overview", label: "Command center", icon: "home" },
  { id: "analyst", label: "Ask EduInsight", icon: "sparkles" },
  { id: "quality", label: "Data quality", icon: "quality" },
  { id: "ipeds", label: "IPEDS center", icon: "ipeds" },
  { id: "scenario", label: "Scenario lab", icon: "scenario" },
  { id: "memory", label: "Institutional memory", icon: "memory" },
];

const startingIssues: QualityIssue[] = commandCenter.qualityFindings
  .map((issue) => ({
    findingKey: stableFindingIdentity(issue),
    id: issue.issueId,
    severity: issue.severity as QualityIssue["severity"],
    findingType: issue.findingType as QualityIssue["findingType"],
    title: issue.title,
    description: issue.description,
    records: issue.affectedRecords,
    observation: issue.observation,
    source: issue.sourceSystem,
    sourceFiles: issue.sourceFiles,
    sourceFields: issue.sourceFields,
    owner: issue.owner,
    rule: issue.ruleId,
    countSemantics: issue.countSemantics,
    status: "Open",
    reviewNotes: "",
    reviewerIdentity: null,
    reviewerDisplayName: null,
    lifecycleCreatedAt: issue.openedAt,
    lifecycleUpdatedAt: issue.openedAt,
    sampleRows: issue.sampleRows,
  }));

const memoryItems = [
  ...institutionalMemory.records,
  ...institutionalMemoryExpanded.records,
] as unknown as MemoryRecord[];

const qualitySummary = {
  total: commandCenter.qualityFindings.length,
  critical: commandCenter.qualityFindings.filter(
    (finding) => finding.severity === "Critical",
  ).length,
  high: commandCenter.qualityFindings.filter(
    (finding) => finding.severity === "High",
  ).length,
  medium: commandCenter.qualityFindings.filter(
    (finding) => finding.severity === "Medium",
  ).length,
  open: commandCenter.qualityFindings.filter(
    (finding) => finding.lifecycleStatus !== "Resolved",
  ).length,
  resolved: commandCenter.qualityFindings.filter(
    (finding) => finding.lifecycleStatus === "Resolved",
  ).length,
  notEvaluated: commandCenter.qualityEvaluationSummary.notEvaluated,
  evaluated: commandCenter.qualityEvaluationSummary.executed,
  catalogRules: commandCenter.qualityEvaluationSummary.totalRules,
  dataDefects: commandCenter.qualityEvaluationSummary.dataDefects,
  anomalies: commandCenter.qualityEvaluationSummary.anomalies,
};

function AppIcon({
  name,
  label,
  className = "",
}: {
  name: IconName;
  label?: string;
  className?: string;
}) {
  const drawing = {
    "arrow-right": (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    command: (
      <>
        <path d="M9 6V5a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v14a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z" />
      </>
    ),
    external: (
      <>
        <path d="M14 5h5v5" />
        <path d="m19 5-8 8" />
        <path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </>
    ),
    home: (
      <>
        <path d="m4 11 8-7 8 7" />
        <path d="M6 10v9h12v-9" />
      </>
    ),
    ipeds: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h8M8 16h8" />
      </>
    ),
    memory: (
      <>
        <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H12v17H7.5A2.5 2.5 0 0 1 5 17.5z" />
        <path d="M19 5.5A2.5 2.5 0 0 0 16.5 3H12v17h4.5a2.5 2.5 0 0 0 2.5-2.5z" />
      </>
    ),
    quality: (
      <>
        <path d="m5 12 4 4L19 6" />
        <path d="M4 4h16v16H4z" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M18.4 16A8 8 0 1 1 20 12" />
      </>
    ),
    scenario: (
      <>
        <path d="M4 7h5l3 5 3-5h5" />
        <path d="M4 17h5l3-5 3 5h5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" />
        <path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
      </>
    ),
    warning: (
      <>
        <path d="M12 4 3 20h18z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
  }[name];

  return (
    <span
      className={`app-icon ${className}`.trim()}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        {drawing}
      </svg>
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
        {/* Institution-agnostic: the product is not built for one named school,
            so the header carries the reporting period the data covers rather
            than an institution name. */}
        <p className="eyebrow">{commandCenter.institution.currentTermLabel}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="header-actions">
        <button className="button button-secondary" onClick={onAudit}>
          <AppIcon name="command" />
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
          {/* Quadrangle drawn in plan, sunk into the panel as a watermark. */}
          <QuadPlan className="card-watermark" />
          <div className="ask-orb"><AppIcon name="sparkles" /></div>
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
            Start an analysis <AppIcon name="arrow-right" />
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
                    <AppIcon name="arrow-right" />
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
              Explore <AppIcon name="arrow-right" />
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
              <AppIcon name="refresh" className="activity-icon" />
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
            <div className="ask-orb small"><AppIcon name="sparkles" /></div>
            <div>
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
              {!thinking && <AppIcon name="arrow-right" />}
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
            <div className="thinking-mark"><AppIcon name="sparkles" /></div>
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
                      Analyze confirmed request <AppIcon name="arrow-right" />
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
                  Open full lineage <AppIcon name="arrow-right" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="thinking-state analyst-ready">
            <EmptyPlot className="empty-plot" />
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
  const selectedKeyRef = useRef(startingIssues[0]?.findingKey ?? null);
  const [draftStatus, setDraftStatus] = useState<QualityIssue["status"]>("Open");
  const [draftNotes, setDraftNotes] = useState("");
  const [savingLifecycle, setSavingLifecycle] = useState(false);
  const [persistenceState, setPersistenceState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const lifecycleCounts = Object.fromEntries(
    DATA_QUALITY_LIFECYCLE_STATUSES.map((status) => [
      status,
      issues.filter((issue) => issue.status === status).length,
    ]),
  ) as Record<QualityIssue["status"], number>;
  const filtered = issues.filter(
    (issue) =>
      filter === "All" ||
      issue.severity === filter ||
      issue.status === filter
  );

  useEffect(() => {
    let active = true;
    fetch("/api/data-quality/lifecycle", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Lifecycle service unavailable");
        return (await response.json()) as {
          findings?: { lifecycle: QualityLifecycle }[];
        };
      })
      .then((result) => {
        if (!active) return;
        const lifecycleByKey = new Map(
          (result.findings ?? []).map(({ lifecycle }) => [
            lifecycle.findingKey,
            lifecycle,
          ]),
        );
        const mergeLifecycle = (issue: QualityIssue): QualityIssue => {
          const lifecycle = lifecycleByKey.get(issue.findingKey);
          return lifecycle
            ? {
                ...issue,
                status: lifecycle.status,
                reviewNotes: lifecycle.notes,
                reviewerIdentity: lifecycle.reviewerIdentity,
                reviewerDisplayName: lifecycle.reviewerDisplayName,
                lifecycleCreatedAt: lifecycle.createdAt,
                lifecycleUpdatedAt: lifecycle.updatedAt,
              }
            : issue;
        };
        setIssues((current) => current.map(mergeLifecycle));
        setSelected((current) => (current ? mergeLifecycle(current) : current));
        const selectedLifecycle = selectedKeyRef.current
          ? lifecycleByKey.get(selectedKeyRef.current)
          : null;
        if (selectedLifecycle) {
          setDraftStatus(selectedLifecycle.status);
          setDraftNotes(selectedLifecycle.notes);
        }
        setPersistenceState("ready");
      })
      .catch(() => {
        if (active) setPersistenceState("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  function selectIssue(issue: QualityIssue) {
    selectedKeyRef.current = issue.findingKey;
    setSelected(issue);
    setDraftStatus(issue.status);
    setDraftNotes(issue.reviewNotes);
  }

  async function saveLifecycle() {
    if (!selected) return;
    setSavingLifecycle(true);
    try {
      const response = await fetch("/api/data-quality/lifecycle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingKey: selected.findingKey,
          status: draftStatus,
          notes: draftNotes,
          expectedUpdatedAt: selected.lifecycleUpdatedAt,
        }),
      });
      const result = (await response.json()) as {
        lifecycle?: QualityLifecycle;
        error?: string;
      };
      if (!response.ok || !result.lifecycle) {
        throw new Error(result.error ?? "The lifecycle update could not be saved.");
      }
      const lifecycle = result.lifecycle;
      const applyLifecycle = (issue: QualityIssue): QualityIssue =>
        issue.findingKey === lifecycle.findingKey
          ? {
              ...issue,
              status: lifecycle.status,
              reviewNotes: lifecycle.notes,
              reviewerIdentity: lifecycle.reviewerIdentity,
              reviewerDisplayName: lifecycle.reviewerDisplayName,
              lifecycleCreatedAt: lifecycle.createdAt,
              lifecycleUpdatedAt: lifecycle.updatedAt,
            }
          : issue;
      setIssues((current) => current.map(applyLifecycle));
      setSelected((current) => (current ? applyLifecycle(current) : current));
      setDraftStatus(lifecycle.status);
      setDraftNotes(lifecycle.notes);
      setPersistenceState("ready");
      notify(`Saved ${selected.id} as ${lifecycle.status}.`);
    } catch (error) {
      setPersistenceState("unavailable");
      notify(error instanceof Error ? error.message : "The lifecycle update could not be saved.");
    } finally {
      setSavingLifecycle(false);
    }
  }

  return (
    <div className="view">
      <Header
        title="Data quality"
        description="Find structural defects and governed validation failures before they reach a report."
        onAudit={onAudit}
      />
      <section className="quality-summary">
        <div className="quality-score">
          <div>
            <p className="eyebrow">Finding inventory</p>
            <h2>{qualitySummary.total} source-derived active findings.</h2>
            <p>Every count comes from the current rule evaluation, not a seeded issue log.</p>
            <p>
              {qualitySummary.dataDefects} data defects · {qualitySummary.anomalies} anomaly
              {qualitySummary.anomalies === 1 ? " observation" : " observations"}
            </p>
            <p>
              Rule coverage: {qualitySummary.evaluated} of {qualitySummary.catalogRules} evaluated
              ({Math.round((qualitySummary.evaluated / qualitySummary.catalogRules) * 100)}%).{" "}
              {qualitySummary.notEvaluated} rules were not evaluated because required source data
              or governed contracts are unavailable.
            </p>
          </div>
        </div>
        <div className="quality-stat">
          <span>Critical</span><strong>{qualitySummary.critical}</strong><small>active findings</small>
        </div>
        <div className="quality-stat">
          <span>High</span><strong>{qualitySummary.high}</strong><small>active findings</small>
        </div>
        <div className="quality-stat">
          <span>Medium</span><strong>{qualitySummary.medium}</strong><small>active findings</small>
        </div>
        <div className="quality-stat">
          <span>Open</span><strong>{lifecycleCounts.Open}</strong><small>lifecycle status</small>
        </div>
        <div className="quality-stat">
          <span>Not evaluated</span><strong>{qualitySummary.notEvaluated}</strong><small>missing required data</small>
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
              {["All", "Critical", "High", "Medium", ...DATA_QUALITY_LIFECYCLE_STATUSES].map((item) => (
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
                onClick={() => selectIssue(issue)}
                key={issue.id}
              >
                <span className={`issue-severity ${issue.severity.toLowerCase()}`}>
                  {issue.severity.slice(0, 1)}
                </span>
                <span className="issue-copy">
                  <span>
                    <strong>{issue.title}</strong>
                    <em className={`lifecycle-chip status-${issue.status.toLowerCase().replaceAll(" ", "-")}`}>
                      {issue.status}
                    </em>
                  </span>
                  <small>{issue.id} · {issue.source}</small>
                </span>
                <span className="records">
                  {issue.findingType === "ANOMALY"
                    ? Number(issue.observation?.absoluteChange ?? 0).toLocaleString()
                    : issue.records.toLocaleString()}
                  <small>{issue.findingType === "ANOMALY" ? "change" : "records"}</small>
                </span>
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
                          {rule.executionState === "ENABLED_EXECUTED"
                            ? `Executed · ${rule.lastResult === "PASS" ? "Pass" : "Fail"}`
                            : "Not evaluated"}
                        </span>
                        <small>
                          {rule.executionState === "ENABLED_EXECUTED"
                            ? rule.coverage
                            : rule.reasonNotEvaluated}
                        </small>
                      </td>
                      <td>
                        {rule.lastViolationCount === null
                          ? "—"
                          : rule.lastViolationCount.toLocaleString()}
                      </td>
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
                <span>{selected.id} · {selected.status}</span>
              </div>
              <h2>{selected.title}</h2>
              <p>{selected.description}</p>
              <div className="detail-grid">
                <div>
                  <span>{selected.findingType === "ANOMALY" ? "Observed change" : "Affected"}</span>
                  <strong>
                    {selected.findingType === "ANOMALY"
                      ? `${Number(selected.observation?.absoluteChange ?? 0).toLocaleString()} students (${Number(selected.observation?.percentChange ?? 0).toFixed(1)}%)`
                      : `${selected.records.toLocaleString()} records`}
                  </strong>
                </div>
                <div><span>Source</span><strong>{selected.source}</strong></div>
                <div><span>Owner</span><strong>{selected.owner}</strong></div>
                <div><span>Rule</span><strong>{selected.rule}</strong></div>
              </div>
              <div className="agent-explanation">
                <AppIcon name="sparkles" />
                <div>
                  <strong>Why the agent flagged this</strong>
                  <p>{selected.description}</p>
                  <small>{selected.countSemantics}</small>
                </div>
              </div>
              {selected.findingType === "ANOMALY" && (
                <div className="sample-records">
                  <div className="sample-records-heading">
                    <strong>Period and threshold evidence</strong>
                    <span>one aggregate observation</span>
                  </div>
                  <div className="detail-grid">
                    <div>
                      <span>{String(selected.observation?.previousTerm ?? "Previous term")}</span>
                      <strong>
                        {Number(selected.observation?.previousValue ?? 0).toLocaleString()} students
                      </strong>
                    </div>
                    <div>
                      <span>{String(selected.observation?.currentTerm ?? "Current term")}</span>
                      <strong>
                        {Number(selected.observation?.currentValue ?? 0).toLocaleString()} students
                      </strong>
                    </div>
                    <div>
                      <span>Alert threshold</span>
                      <strong>
                        ±{Number(selected.observation?.thresholdPercent ?? 0).toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>
              )}
              <div className="sample-records">
                <div className="sample-records-heading">
                  <strong>
                    {selected.findingType === "ANOMALY"
                      ? "Observation evidence"
                      : "Affected sample rows"}
                  </strong>
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
                    {selected.findingType === "ANOMALY"
                      ? "This is an aggregate reconciliation observation, not a set of defective records."
                      : "No sample rows are available for this finding."}
                  </p>
                )}
              </div>
              <div className="lifecycle-editor">
                <div className="sample-records-heading">
                  <strong>Finding review lifecycle</strong>
                  <span>
                    {persistenceState === "loading"
                      ? "Loading saved review"
                      : persistenceState === "ready"
                        ? "Durable workspace record"
                        : "Persistence unavailable"}
                  </span>
                </div>
                <label>
                  Lifecycle status
                  <select
                    value={draftStatus}
                    onChange={(event) =>
                      setDraftStatus(event.target.value as QualityIssue["status"])
                    }
                    disabled={persistenceState === "loading" || savingLifecycle}
                  >
                    {DATA_QUALITY_LIFECYCLE_STATUSES.map((status) => (
                      <option value={status} key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Review notes
                  <textarea
                    value={draftNotes}
                    maxLength={4000}
                    rows={4}
                    placeholder="Record the review conclusion, evidence checked, or reason for suppression."
                    onChange={(event) => setDraftNotes(event.target.value)}
                    disabled={persistenceState === "loading" || savingLifecycle}
                  />
                </label>
                <div className="lifecycle-metadata">
                  <span>
                    Reviewer: {selected.reviewerDisplayName ?? "Not yet reviewed"}
                  </span>
                  <span>
                    Updated: {selected.lifecycleUpdatedAt
                      ? new Date(selected.lifecycleUpdatedAt).toLocaleString()
                      : "Not yet saved"}
                  </span>
                </div>
              </div>
              <div className="detail-actions">
                <button className="button button-secondary" onClick={onAudit}>
                  Trace source
                </button>
                <button
                  className="button button-primary"
                  disabled={
                    persistenceState !== "ready" ||
                    savingLifecycle ||
                    (draftStatus === selected.status &&
                      draftNotes.trim() === selected.reviewNotes)
                  }
                  onClick={saveLifecycle}
                >
                  {savingLifecycle ? "Saving…" : "Save review"}
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
  const suitePackages = ipedsSuite.packages as unknown as Record<
    string,
    IpedsPackage
  >;
  const surveyCards = ipedsSpecs.surveys.map((item) => {
    const candidate = suitePackages[item.code];
    if (!candidate) {
      return item.code === "IC"
        ? {
            ...item,
            coverage: "partial",
            status: "Questionnaire",
            reason:
              "NCES does not expose an import-file layout for Institutional Characteristics. Use the governed questionnaire evidence to complete the component in DCS.",
            generator: false,
            blockedParts: [],
          }
        : item;
    }
    return {
      ...item,
      coverage: candidate.completeSurveyPackage ? "full" : "partial",
      status: candidate.completeSurveyPackage
        ? "Ready to prepare"
        : "Source gap",
      reason: candidate.completeSurveyPackage
        ? `The ${item.code} source contract, current NCES layout, deterministic generator, review-file logic, and eight validation checks are configured.`
        : "A review file is available, but one or more required parts remain blocked until the missing source arrives.",
      blockedParts: candidate.blockedParts ?? [],
      generator: true,
    };
  });
  const readyToPrepareCount = surveyCards.filter(
    (item) => item.generator && item.coverage === "full",
  ).length;
  const sourceGapCount = surveyCards.filter(
    (item) => item.generator && item.coverage === "partial",
  ).length;
  const questionnaireCount = surveyCards.filter(
    (item) => !item.generator,
  ).length;
  const survey = surveyCards[selected];
  const isCompletions = survey.code === "C";
  const isFallEnrollment = survey.code === "EF";
  const packageData = suitePackages[survey.code] ?? null;
  const canGenerate = Boolean(survey.generator && packageData);
  const packageComplete = packageData?.completeSurveyPackage !== false;
  const varianceItems = isCompletions
    ? [
        {
          id: "completions-total-yoy",
          edit: "Year-over-year completions total",
          prompt:
            "Completions changed more than 10% from the prior reporting year.",
        },
        {
          id: "completions-cip-110701-yoy",
          edit: "CIP 11.0701 historical range",
          prompt: "CIP 11.0701 increased outside the expected historical range.",
        },
      ]
    : isFallEnrollment
      ? [
          {
            id: "fall-headcount-yoy",
            edit: "Year-over-year Fall census headcount",
            prompt:
              "Fall census headcount changed outside the expected year-over-year range.",
          },
        ]
      : [];
  const allExplained = varianceItems.every((item) =>
    explanations[item.id]?.trim(),
  );
  const approvalExplanations = Object.fromEntries(
    varianceItems.map((item) => [
      item.prompt,
      explanations[item.id]?.trim() ?? "",
    ]),
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
  const selectedWorkflowStatus = !canGenerate
    ? "Questionnaire workflow"
    : !packageComplete
      ? "Source gap"
      : validationComplete
        ? "Validation complete"
        : generated
          ? "Generated · validation pending"
          : "Ready to generate";
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
          explanations: approvalExplanations,
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
        description="Coordinate source readiness, validation, variance explanations, and keyholder handoff for each reporting component."
        onAudit={onAudit}
      />
      <section className="ipeds-banner">
        <div>
          <p className="eyebrow light">2025–26 collection year</p>
          <h2>Prepare, validate, explain, and hand off each IPEDS component.</h2>
          <p>
            Work is organized by the official Fall, Winter, and Spring
            collection periods. Missing sources remain visible until resolved.
          </p>
        </div>
      </section>
      <section className="ipeds-work-queue" aria-label="IPEDS work queue">
        <article>
          <span className="queue-dot ready" />
          <div>
            <strong>{readyToPrepareCount}</strong>
            <small>Ready to prepare</small>
          </div>
        </article>
        <article>
          <span className="queue-dot gap" />
          <div>
            <strong>{sourceGapCount}</strong>
            <small>Source gaps</small>
          </div>
        </article>
        <article>
          <span className="queue-dot questionnaire" />
          <div>
            <strong>{questionnaireCount}</strong>
            <small>Questionnaire workflow</small>
          </div>
        </article>
        <article>
          <span className="queue-dot layout" />
          <div>
            <strong>{ipedsSuite.generatorCount}/11</strong>
            <small>Official import layouts available</small>
          </div>
        </article>
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
          <div className="spec-control-meta">
            <span>Collection year pinned: {ipedsSpecs.collectionYear}</span>
            <span>Annual reverification required</span>
          </div>
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
        <div className="spec-source-links">
          <a
            href={ipedsSpecs.annualChanges.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
                  Review official annual changes <AppIcon name="external" />
          </a>
          <a
            href="https://surveys.nces.ed.gov/ipeds/public/survey-materials/index"
            target="_blank"
            rel="noreferrer"
          >
                  Review current survey materials <AppIcon name="external" />
          </a>
        </div>
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
              {item.window} collection · {item.status}
            </small>
            {item.coverage === "partial" && item.blockedParts?.length ? (
              <span className="survey-card-blockers">
                {item.blockedParts.map((part) => (
                  <span key={part.code}>
                    Part {part.code}: {part.description}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        ))}
      </section>
      <section className="ipeds-detail">
        <article className="panel ipeds-main">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {survey.code} · {survey.window} collection ·{" "}
                {selectedWorkflowStatus}
              </p>
              <h2>{survey.name}</h2>
              <p>{survey.reason}</p>
            </div>
            <div className="ipeds-actions">
              {canGenerate ? (
                <button
                  className="button button-primary"
                  onClick={() => {
                    setGenerated(true);
                    notify(
                      `${survey.code} import and review artifacts generated from governed data.`,
                    );
                  }}
                >
                  {packageComplete
                    ? "Generate import file"
                    : "Generate review file"}
                </button>
              ) : null}
              {canGenerate ? (
                <button
                  className="button button-secondary"
                  onClick={validate}
                  disabled={!generated || validating}
                >
                  {validating ? "Validating…" : "Run validation"}
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
                    packageData.sourceRecordCount ??
                    0
                  ).toLocaleString()}
                  )
                </span>
                    <b><AppIcon name="arrow-right" /></b>
                <span>
                  2 Prepared ({packageData.preparedRowCount.toLocaleString()})
                </span>
                    <b><AppIcon name="arrow-right" /></b>
                <span>3 Cells ({packageData.cellCount.toLocaleString()})</span>
                    <b><AppIcon name="arrow-right" /></b>
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
                      Part {part.code} blocked · {part.description}. Missing:{" "}
                      {part.missingFields.join(", ")}
                    </span>
                  ))}
                  {packageData.notApplicableParts?.map((part) => (
                    <span className="not-applicable" key={part.code}>
                      Part {part.code} not applicable · {part.description}.{" "}
                      {part.reason}
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
                      <span>
                        <AppIcon
                          name={check.status === "Passed" ? "check" : "warning"}
                        />
                      </span>
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
              {packageData.caveats?.length ||
              packageData.assumptions.length ? (
                <section className="ipeds-assumptions">
                  <p className="eyebrow">Reporting assumptions and limitations</p>
                  {packageData.caveats?.length ? (
                    <div className="assumption-group attention">
                      <strong>Submission caveats</strong>
                      <ul>
                        {packageData.caveats.map((caveat) => (
                          <li key={caveat}>{caveat}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {packageData.assumptions.length ? (
                    <div className="assumption-group">
                      <strong>Documented reporting assumptions</strong>
                      <ul>
                        {packageData.assumptions.map((assumption) => (
                          <li key={assumption}>{assumption}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}
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
                    Download {survey.code}{" "}
                    {packageComplete ? "import" : "review draft"}
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
                    Explanation edits requiring institutional response
                  </p>
                  <p className="variance-help">
                    Verify the values first. Correct the data if they are wrong;
                    otherwise document the factual institutional reason. The
                    response is saved with the sealed approval and shown in the
                    Audit trail for keyholder review.
                  </p>
                  {varianceItems.map((item) => (
                    <label key={item.id}>
                      <small>{item.edit}</small>
                      <span>{item.prompt}</span>
                      <textarea
                        rows={2}
                        value={explanations[item.id] ?? ""}
                        onChange={(event) =>
                          setExplanations((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        placeholder="Explain why the verified change is accurate, or correct the source data before continuing…"
                      />
                    </label>
                  ))}
                  {approved ? (
                    <p className="variance-saved">
                    <AppIcon name="check" /> Explanations saved with this approval record and
                      available in the Audit trail.
                    </p>
                  ) : null}
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
                <span>{generated ? <AppIcon name="check" /> : "1"}</span>
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
                <span>{validationComplete ? <AppIcon name="check" /> : "2"}</span>
              <p>
                <strong>Validated</strong>
                <small>{packageData?.validations.length ?? 0} checks</small>
              </p>
            </div>
            <div className={approved ? "done" : ""}>
                <span>{approved ? <AppIcon name="check" /> : "3"}</span>
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
  onOpenMemory,
  savedScenarios,
  setSavedScenarios,
}: {
  onAudit: () => void;
  onOpenMemory: (recordId: string) => void;
  savedScenarios: SavedScenario[];
  setSavedScenarios: Dispatch<SetStateAction<SavedScenario[]>>;
}) {
  const [mode, setMode] = useState<ScenarioMode>("enrollment");
  const [undergraduateChange, setUndergraduateChange] = useState(0);
  const [graduateChange, setGraduateChange] = useState(15);
  const [retentionPointGain, setRetentionPointGain] = useState(3);
  const [undergraduatePriceChange, setUndergraduatePriceChange] = useState(0);
  const [graduatePriceChange, setGraduatePriceChange] = useState(0);
  const [additionalGrant, setAdditionalGrant] = useState(0);
  const [programId, setProgramId] = useState("PCS");
  const [programGrowth, setProgramGrowth] = useState(20);
  const [positionsNotReplaced, setPositionsNotReplaced] = useState(5);
  const [scenarioName, setScenarioName] = useState("");
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");

  const modes: { id: ScenarioMode; label: string; description: string }[] = [
    {
      id: "enrollment",
      label: "Enrollment mix",
      description: "Independent undergraduate and graduate changes",
    },
    {
      id: "retention",
      label: "Retention",
      description: "Cumulative cohort effect",
    },
    {
      id: "pricing",
      label: "Tuition & aid",
      description: "Pricing held apart from grant aid",
    },
    {
      id: "capacity",
      label: "Program capacity",
      description: "Program demand against course seats",
    },
    {
      id: "faculty",
      label: "Faculty staffing",
      description: "Positions not replaced",
    },
  ];

  const result = useMemo<ScenarioResult>(() => {
    if (mode === "retention") {
      return calculateRetentionImprovement(scenarioBaselines, {
        pointGain: retentionPointGain,
      }) as ScenarioResult;
    }
    if (mode === "pricing") {
      return calculatePricingAndAid(scenarioBaselines, {
        undergraduatePriceChangePercent: undergraduatePriceChange,
        graduatePriceChangePercent: graduatePriceChange,
        additionalGrantPerPellEligible: additionalGrant,
      }) as ScenarioResult;
    }
    if (mode === "capacity") {
      return calculateProgramCapacity(scenarioBaselines, {
        programId,
        growthPercent: programGrowth,
      }) as ScenarioResult;
    }
    if (mode === "faculty") {
      return calculateFacultyAttrition(scenarioBaselines, {
        positionsNotReplaced,
      }) as ScenarioResult;
    }
    return calculateEnrollmentMix(scenarioBaselines, {
      undergraduateChangePercent: undergraduateChange,
      graduateChangePercent: graduateChange,
    }) as ScenarioResult;
  }, [
    mode,
    undergraduateChange,
    graduateChange,
    retentionPointGain,
    undergraduatePriceChange,
    graduatePriceChange,
    additionalGrant,
    programId,
    programGrowth,
    positionsNotReplaced,
  ]);

  const selectedA = savedScenarios.find((item) => item.id === compareA);
  const selectedB = savedScenarios.find((item) => item.id === compareB);
  type NumericComparisonKey =
    | "headcountImpact"
    | "annualRevenueImpact"
    | "capacitySeatImpact"
    | "facultyFteImpact";
  const comparisonRows: {
    key: NumericComparisonKey;
    label: string;
    format: (value: number) => string;
  }[] = [
    {
      key: "headcountImpact",
      label: "Year 1 headcount effect",
      format: (value) =>
        `${value > 0 ? "+" : ""}${Math.round(value).toLocaleString()}`,
    },
    {
      key: "annualRevenueImpact",
      label: "Year 1 financial effect",
      format: formatCurrency,
    },
  ];

  const capacityLabels = {
    "student-seat-demand": "Student-seat demand change",
    "course-seat-demand": "Course-seat demand change",
    "course-seat-supply": "Course-seat supply change",
    none: "Capacity consequence",
  } as const;
  const facultyLabels = {
    "faculty-demand": "Faculty FTE requirement",
    "faculty-supply": "Faculty FTE supply change",
    none: "Faculty FTE consequence",
  } as const;
  const activeComparisonRows = [
    ...comparisonRows,
    ...(result.comparison.capacityImpactKind !== "none"
      ? [
          {
            key: "capacitySeatImpact" as NumericComparisonKey,
            label: capacityLabels[result.comparison.capacityImpactKind],
            format: (value: number) =>
              `${value > 0 ? "+" : ""}${Math.round(value).toLocaleString()} ${
                result.comparison.capacityImpactUnit
              }`,
          },
        ]
      : []),
    ...(result.comparison.facultyImpactKind !== "none"
      ? [
          {
            key: "facultyFteImpact" as NumericComparisonKey,
            label: facultyLabels[result.comparison.facultyImpactKind],
            format: (value: number) =>
              `${value > 0 ? "+" : ""}${value.toFixed(1)} FTE`,
          },
        ]
      : []),
  ];
  const capacityComparisonCompatible = Boolean(
    selectedA &&
      selectedB &&
      selectedA.result.comparison.capacityImpactKind !== "none" &&
      selectedA.result.comparison.capacityImpactKind ===
        selectedB.result.comparison.capacityImpactKind &&
      selectedA.result.comparison.capacityImpactUnit ===
        selectedB.result.comparison.capacityImpactUnit,
  );
  const facultyComparisonCompatible = Boolean(
    selectedA &&
      selectedB &&
      selectedA.result.comparison.facultyImpactKind !== "none" &&
      selectedA.result.comparison.facultyImpactKind ===
        selectedB.result.comparison.facultyImpactKind,
  );

  function formatCapacityConsequence(scenario: SavedScenario) {
    const comparison = scenario.result.comparison;
    if (comparison.capacityImpactKind === "none") return "Not applicable";
    const direction = comparison.capacityImpactKind.endsWith("supply")
      ? "supply"
      : "demand";
    return `${comparison.capacitySeatImpact > 0 ? "+" : ""}${Math.round(
      comparison.capacitySeatImpact,
    ).toLocaleString()} ${comparison.capacityImpactUnit} ${direction}`;
  }

  function formatFacultyConsequence(scenario: SavedScenario) {
    const comparison = scenario.result.comparison;
    if (comparison.facultyImpactKind === "none") return "Not applicable";
    const direction =
      comparison.facultyImpactKind === "faculty-supply"
        ? "supply change"
        : "required";
    return `${comparison.facultyFteImpact > 0 ? "+" : ""}${comparison.facultyFteImpact.toFixed(
      1,
    )} FTE ${direction}`;
  }

  function saveScenario() {
    const id = `scenario-${Date.now()}`;
    const saved: SavedScenario = {
      id,
      name: scenarioName.trim() || `${result.title} ${savedScenarios.length + 1}`,
      mode,
      result: structuredClone(result),
    };
    setSavedScenarios((current) => [...current, saved]);
    if (!compareA) setCompareA(id);
    else if (!compareB) setCompareB(id);
    setScenarioName("");
  }

  const { tone: effectTone, label: effectLabel } = deriveScenarioEffect(
    mode,
    result.comparison,
  );
  const activeMode = modes.find((item) => item.id === mode) ?? modes[0];

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
          <h2>{result.title}</h2>
          <p>
            {activeMode.description}. Every result is direct arithmetic from
            the governed baseline—not a forecast.
          </p>
        </div>
      </section>
      <div className="scenario-mode-tabs" role="tablist" aria-label="Scenario type">
        {modes.map((item) => (
          <button
            className={mode === item.id ? "active" : ""}
            onClick={() => setMode(item.id)}
            role="tab"
            aria-selected={mode === item.id}
            key={item.id}
          >
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </button>
        ))}
      </div>
      <section className="scenario-layout">
        <aside className="assumptions-panel">
          <p className="eyebrow">Assumptions</p>
          {mode === "enrollment" ? (
            <>
              <h2>Enrollment mix shift</h2>
              <label className="scenario-control">
                <span>
                  Undergraduate change
                  <strong>{undergraduateChange > 0 ? "+" : ""}{undergraduateChange}%</strong>
                </span>
                <input
                  aria-label="Undergraduate enrollment change"
                  type="range"
                  min="-25"
                  max="25"
                  step="1"
                  value={undergraduateChange}
                  onChange={(event) =>
                    setUndergraduateChange(Number(event.target.value))
                  }
                />
              </label>
              <label className="scenario-control">
                <span>
                  Graduate change
                  <strong>{graduateChange > 0 ? "+" : ""}{graduateChange}%</strong>
                </span>
                <input
                  aria-label="Graduate enrollment change"
                  type="range"
                  min="-25"
                  max="30"
                  step="1"
                  value={graduateChange}
                  onChange={(event) =>
                    setGraduateChange(Number(event.target.value))
                  }
                />
              </label>
              <div className="baseline-pair">
                <span><small>UG baseline</small><strong>{scenarioBaselines.enrollment.undergraduateHeadcount.toLocaleString()}</strong></span>
                <span><small>GR baseline</small><strong>{scenarioBaselines.enrollment.graduateHeadcount.toLocaleString()}</strong></span>
              </div>
            </>
          ) : null}
          {mode === "retention" ? (
            <>
              <h2>Retention improvement</h2>
              <div className="slider-value positive">+{retentionPointGain.toFixed(1)} pts</div>
              <input
                aria-label="First-year retention point improvement"
                type="range"
                min="0"
                max="8"
                step=".5"
                value={retentionPointGain}
                onChange={(event) =>
                  setRetentionPointGain(Number(event.target.value))
                }
              />
              <div className="range-labels"><span>Current</span><span>+4 pts</span><span>+8 pts</span></div>
              <div className="baseline-pair">
                <span><small>2024 FTFT cohort</small><strong>{scenarioBaselines.retention.cohortSize.toLocaleString()}</strong></span>
                <span><small>Current rate</small><strong>{(scenarioBaselines.retention.rate * 100).toFixed(1)}%</strong></span>
              </div>
            </>
          ) : null}
          {mode === "pricing" ? (
            <>
              <h2>Tuition and grant aid</h2>
              <label className="scenario-control">
                <span>
                  UG tuition & fee change
                  <strong>{undergraduatePriceChange > 0 ? "+" : ""}{undergraduatePriceChange}%</strong>
                </span>
                <input
                  aria-label="Undergraduate tuition and fee change"
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={undergraduatePriceChange}
                  onChange={(event) =>
                    setUndergraduatePriceChange(Number(event.target.value))
                  }
                />
              </label>
              <label className="scenario-control">
                <span>
                  GR tuition & fee change
                  <strong>{graduatePriceChange > 0 ? "+" : ""}{graduatePriceChange}%</strong>
                </span>
                <input
                  aria-label="Graduate tuition and fee change"
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={graduatePriceChange}
                  onChange={(event) =>
                    setGraduatePriceChange(Number(event.target.value))
                  }
                />
              </label>
              <label className="number-field">
                <span>Additional grant per Pell-eligible student</span>
                <div>
                  <span>$</span>
                  <input
                    aria-label="Additional grant per Pell-eligible student"
                    type="number"
                    min="0"
                    max="50000"
                    step="250"
                    value={additionalGrant}
                    onChange={(event) =>
                      setAdditionalGrant(
                        Math.min(
                          50_000,
                          Math.max(0, Number(event.target.value)),
                        ),
                      )
                    }
                  />
                </div>
              </label>
            </>
          ) : null}
          {mode === "capacity" ? (
            <>
              <h2>Program growth</h2>
              <label className="select-field">
                <span>Academic program</span>
                <select
                  value={programId}
                  onChange={(event) => setProgramId(event.target.value)}
                >
                  {scenarioBaselines.programs.map((program) => (
                    <option value={program.programId} key={program.programId}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="slider-value positive">{programGrowth > 0 ? "+" : ""}{programGrowth}%</div>
              <input
                aria-label="Program enrollment change"
                type="range"
                min="-20"
                max="40"
                step="1"
                value={programGrowth}
                onChange={(event) => setProgramGrowth(Number(event.target.value))}
              />
              <div className="range-labels"><span>−20%</span><span>Baseline</span><span>+40%</span></div>
            </>
          ) : null}
          {mode === "faculty" ? (
            <>
              <h2>Positions not replaced</h2>
              <div className="slider-value">{positionsNotReplaced}</div>
              <input
                aria-label="Faculty positions not replaced"
                type="range"
                min="0"
                max="20"
                step="1"
                value={positionsNotReplaced}
                onChange={(event) =>
                  setPositionsNotReplaced(Number(event.target.value))
                }
              />
              <div className="range-labels"><span>0</span><span>10</span><span>20</span></div>
              <div className="baseline-pair">
                <span><small>Full-time instructional</small><strong>{scenarioBaselines.faculty.fullTimeInstructionalCount}</strong></span>
                <span><small>Hire year</small><strong>Unavailable</strong></span>
              </div>
            </>
          ) : null}
          <div className="assumption-note">
            <span>i</span>
            <p>{result.assumptions[0]}</p>
          </div>
        </aside>
        <article className="scenario-results">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Modeled impact</p>
              <h2>{result.summary}</h2>
            </div>
            <span className={`scenario-direction ${effectTone}`}>
              {effectLabel}
            </span>
          </div>
          <div className="impact-grid scenario-impact-grid">
            {result.metrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.display}</strong>
                <small>direct modeled value</small>
              </div>
            ))}
          </div>
          {result.details ? (
            <div className="pricing-detail-strip">
              <span>
                <small>Pell-eligible students covered</small>
                <strong>{result.details.coveredStudents.toLocaleString()}</strong>
              </span>
              <span>
                <small>Modeled price change after added grant</small>
                <strong>{formatCurrency(result.details.modeledNetPriceChange)}</strong>
              </span>
              <span>
                <small>Incremental gross discount-rate effect</small>
                <strong>+{result.details.discountRatePointChange.toFixed(2)} pts</strong>
              </span>
            </div>
          ) : null}
          {result.series ? (
            <div className="retention-horizon">
              <p className="eyebrow">Cumulative effect if this rate holds</p>
              {result.series.map((value, index) => (
                <div key={index}>
                  <span>Year {index + 1}</span>
                  <div><span style={{ width: `${(value / Math.max(...result.series!)) * 100}%` }} /></div>
                  <strong>+{value.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="scenario-bars">
              {activeComparisonRows.map((row) => {
                const value = result.comparison[row.key];
                const scale =
                  row.key === "annualRevenueImpact"
                    ? 15_000_000
                    : row.key === "facultyFteImpact"
                      ? 20
                      : 2000;
                return (
                  <div className="scenario-bar" key={row.key}>
                    <span>{row.label}</span>
                    <div>
                      <span
                        className={value < 0 ? "negative" : ""}
                        style={{
                          width: `${Math.max(3, Math.min(100, (Math.abs(value) / scale) * 100))}%`,
                        }}
                      />
                    </div>
                    <strong>{row.format(value)}</strong>
                  </div>
                );
              })}
            </div>
          )}
          {result.program?.memoryRecordId ? (
            <button
              className="scenario-memory-link"
              onClick={() => onOpenMemory(result.program!.memoryRecordId!)}
            >
              Open the governed Computer Science capacity review
              <AppIcon name="arrow-right" />
            </button>
          ) : null}
          <div className="scenario-evidence">
            <div>
              <strong>Governed sources</strong>
              <p>{result.sources.join(" · ")}</p>
            </div>
            <div>
              <strong>Assumptions and limits</strong>
              <ul>
                {result.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="scenario-caveat">
            <strong>Interpretation, not prediction</strong>
            <p>
              This model shows the direct effect of your assumptions. It does
              not estimate behavioral response, price elasticity, yield,
              course-mix changes, or second-order effects.
            </p>
          </div>
        </article>
      </section>
      <section className="scenario-save-panel">
        <div>
          <p className="eyebrow">Save and compare</p>
          <h2>Keep planning alternatives side by side.</h2>
          <p>Saved scenarios remain in this browser session and retain the exact assumptions and result shown at save time.</p>
        </div>
        <label>
          <span>Scenario name</span>
          <input
            value={scenarioName}
            onChange={(event) => setScenarioName(event.target.value)}
            placeholder={`e.g. ${result.title} — working case`}
          />
        </label>
        <button className="button button-primary" onClick={saveScenario}>
          Save current scenario
        </button>
      </section>
      {savedScenarios.length ? (
        <section className="saved-scenarios">
          <div className="saved-scenario-list">
            {savedScenarios.map((scenario) => (
              <article key={scenario.id}>
                <span>{modes.find((item) => item.id === scenario.mode)?.label}</span>
                <strong>{scenario.name}</strong>
                <small>{scenario.result.summary}</small>
              </article>
            ))}
          </div>
          <div className="scenario-compare-controls">
            <label>
              Scenario A
              <select value={compareA} onChange={(event) => setCompareA(event.target.value)}>
                <option value="">Choose scenario</option>
                {savedScenarios.map((scenario) => (
                  <option value={scenario.id} key={scenario.id}>{scenario.name}</option>
                ))}
              </select>
            </label>
            <span>versus</span>
            <label>
              Scenario B
              <select value={compareB} onChange={(event) => setCompareB(event.target.value)}>
                <option value="">Choose scenario</option>
                {savedScenarios.map((scenario) => (
                  <option value={scenario.id} key={scenario.id}>{scenario.name}</option>
                ))}
              </select>
            </label>
          </div>
          {selectedA && selectedB ? (
            <div className="scenario-comparison-table">
              <div className="comparison-row heading">
                <strong>Measure</strong>
                <strong>{selectedA.name}</strong>
                <strong>{selectedB.name}</strong>
                <strong>Delta B − A</strong>
              </div>
              {comparisonRows.map((row) => {
                const aValue = selectedA.result.comparison[row.key];
                const bValue = selectedB.result.comparison[row.key];
                return (
                  <div className="comparison-row" key={row.key}>
                    <span>{row.label}</span>
                    <strong>{row.format(aValue)}</strong>
                    <strong>{row.format(bValue)}</strong>
                    <strong className={bValue - aValue < 0 ? "negative" : "positive"}>
                      {row.format(bValue - aValue)}
                    </strong>
                  </div>
                );
              })}
              <div className="comparison-row">
                <span>Capacity consequence</span>
                <strong>{formatCapacityConsequence(selectedA)}</strong>
                <strong>{formatCapacityConsequence(selectedB)}</strong>
                <strong
                  className={
                    capacityComparisonCompatible
                      ? selectedB.result.comparison.capacitySeatImpact -
                            selectedA.result.comparison.capacitySeatImpact <
                          0
                        ? "negative"
                        : "positive"
                      : "not-comparable"
                  }
                >
                  {capacityComparisonCompatible
                    ? `${
                        selectedB.result.comparison.capacitySeatImpact -
                          selectedA.result.comparison.capacitySeatImpact >
                        0
                          ? "+"
                          : ""
                      }${Math.round(
                        selectedB.result.comparison.capacitySeatImpact -
                          selectedA.result.comparison.capacitySeatImpact,
                      ).toLocaleString()} ${
                        selectedA.result.comparison.capacityImpactUnit
                      }`
                    : "Not comparable"}
                </strong>
              </div>
              <div className="comparison-row">
                <span>Faculty consequence</span>
                <strong>{formatFacultyConsequence(selectedA)}</strong>
                <strong>{formatFacultyConsequence(selectedB)}</strong>
                <strong
                  className={
                    facultyComparisonCompatible
                      ? selectedB.result.comparison.facultyFteImpact -
                            selectedA.result.comparison.facultyFteImpact <
                          0
                        ? "negative"
                        : "positive"
                      : "not-comparable"
                  }
                >
                  {facultyComparisonCompatible
                    ? `${
                        selectedB.result.comparison.facultyFteImpact -
                          selectedA.result.comparison.facultyFteImpact >
                        0
                          ? "+"
                          : ""
                      }${(
                        selectedB.result.comparison.facultyFteImpact -
                        selectedA.result.comparison.facultyFteImpact
                      ).toFixed(1)} FTE`
                    : "Not comparable"}
                </strong>
              </div>
              <p>
                Financial values are standardized to Year 1. Capacity and
                faculty deltas appear only when both scenarios use the same
                demand-or-supply definition and unit.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Memory({
  onAudit,
  initialRecordId,
}: {
  onAudit: () => void;
  initialRecordId?: string;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("All");
  const [selected, setSelected] = useState(
    memoryItems.find((item) => item.id === initialRecordId) ??
      memoryItems.find((item) => item.id === "definition-fall-headcount") ??
      memoryItems[0],
  );
  const kinds = [
    "All",
    "Definition",
    "Policy",
    "Submission",
    "Analysis",
    "Accreditation",
  ];
  const definitionCount = memoryItems.filter(
    (item) => item.kind === "Definition",
  ).length;
  const policyCount = memoryItems.filter((item) => item.kind === "Policy").length;
  const sourceCount = new Set(memoryItems.map((item) => item.source)).size;
  const ownerCount = new Set(memoryItems.map((item) => item.owner)).size;
  const searchResults = useMemo(() => {
    const kindFiltered = memoryItems.filter(
      (item) => kind === "All" || item.kind === kind,
    );
    return searchMemoryRecords(kindFiltered, search);
  }, [search, kind]);
  const results = searchResults.map(({ record }) => record);
  const resultGroups = search.trim()
    ? [
        {
          key: "direct",
          label: "Direct matches",
          entries: searchResults.filter(
            ({ match }) => match.matchType === "direct",
          ),
        },
        {
          key: "related",
          label: "Related definitions",
          entries: searchResults.filter(
            ({ match }) => match.matchType === "related",
          ),
        },
      ].filter((group) => group.entries.length > 0)
    : [{ key: "all", label: null, entries: searchResults }];
  const displayedSelected =
    results.find((item) => item.id === selected.id) ?? results[0] ?? selected;

  return (
    <div className="view">
      <Header
        title="Institutional memory"
        description="Search governed definitions, policies, prior submissions, analyses, and evidence—with owners, effective periods, and sources."
        onAudit={onAudit}
      />
      <section className="memory-search">
        <div className="memory-mark"><AppIcon name="memory" /></div>
        <div>
          <details
            className="memory-version"
            title={`Catalog version ${institutionalMemoryExpanded.catalogVersion}`}
          >
            <summary>Definitions verified July 30, 2026</summary>
            <code>{institutionalMemoryExpanded.catalogVersion}</code>
          </details>
          <h2>Find the definition before using the number.</h2>
        </div>
        <label>
            <AppIcon name="search" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search IPEDS, retention, Pell, DFW, census, capacity…"
          />
        </label>
      </section>
      <section className="memory-catalog-summary" aria-label="Knowledge catalog summary">
        <article>
          <strong>{definitionCount}</strong>
          <span>Governed definitions</span>
        </article>
        <article>
          <strong>{policyCount}</strong>
          <span>Active policies</span>
        </article>
        <article>
          <strong>{sourceCount}</strong>
          <span>Named sources</span>
        </article>
        <article>
          <strong>{ownerCount}</strong>
          <span>Accountable owners</span>
        </article>
      </section>
      <div
        className="memory-filters"
        role="group"
        aria-label="Filter institutional memory"
      >
        {kinds.map((item) => {
          const count =
            item === "All"
              ? memoryItems.length
              : memoryItems.filter((record) => record.kind === item).length;
          return (
            <button
              className={kind === item ? "active" : ""}
              onClick={() => setKind(item)}
              key={item}
            >
              {item} <span>{count}</span>
            </button>
          );
        })}
      </div>
      <section className="memory-layout">
        <article className="memory-results">
          <div className="results-topline">
            <span>{results.length} governed records</span>
            <span>Verified {institutionalMemoryExpanded.verifiedAt}</span>
          </div>
          {resultGroups.map((group) => (
            <section className="memory-result-group" key={group.key}>
              {group.label ? (
                <div className={`memory-result-group-heading ${group.key}`}>
                  <strong>{group.label}</strong>
                  <span>{group.entries.length}</span>
                </div>
              ) : null}
              {group.entries.map(({ record: item, match }) => (
                <button
                  className={`memory-item ${
                    displayedSelected.id === item.id ? "selected" : ""
                  }`}
                  onClick={() => setSelected(item)}
                  key={item.id}
                >
                  <span className="memory-kind">{item.kind.slice(0, 1)}</span>
                  <span>
                    <span className="memory-item-kicker">
                      <em>
                        {item.kind} · {item.status}
                      </em>
                      {match.reason ? (
                        <span
                          className={`memory-match-reason ${match.matchType}`}
                        >
                          {match.reason}
                        </span>
                      ) : null}
                    </span>
                    <strong>{item.title}</strong>
                    <small>{item.excerpt}</small>
                    <span className="tag-row">
                      {item.tags.map((tag) => (
                        <i key={tag}>{tag}</i>
                      ))}
                    </span>
                  </span>
                  <time>{item.updated}</time>
                </button>
              ))}
            </section>
          ))}
          {!results.length ? (
            <div className="empty-state">
              No governed records match that search.
            </div>
          ) : null}
        </article>
        <aside className="memory-preview">
          <div className="document-page">
            <div className="doc-heading-row">
              <span className="doc-label">{displayedSelected.kind}</span>
              <span className="doc-status">{displayedSelected.status}</span>
            </div>
            <h2>{displayedSelected.title}</h2>
            <p className="doc-meta">
              {displayedSelected.updated} · Effective:{" "}
              {displayedSelected.effective}
            </p>
            <p className="doc-owner">Owner: {displayedSelected.owner}</p>
            <hr />
            <h3>
              {displayedSelected.kind === "Definition"
                ? "Definition"
                : "Record"}
            </h3>
            <p>{displayedSelected.body}</p>
            {displayedSelected.calculation ? (
              <div className="definition-formula">
                <span>
                  <strong>Calculation</strong>
                  {displayedSelected.calculation}
                </span>
                <span>
                  <strong>Numerator</strong>
                  {displayedSelected.numerator}
                </span>
                <span>
                  <strong>Denominator</strong>
                  {displayedSelected.denominator}
                </span>
              </div>
            ) : null}
            <h3>Reporting use</h3>
            <p>{displayedSelected.use}</p>
            <div className="memory-source">
              <span>Governed source</span>
              {displayedSelected.sourceUrl ? (
                <a
                  href={displayedSelected.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
              {displayedSelected.source} <AppIcon name="external" />
                </a>
              ) : (
                <strong>{displayedSelected.source}</strong>
              )}
            </div>
            <div className="doc-citations">
              {displayedSelected.related.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSearch(term);
                    setKind("All");
                  }}
                >
                  {term}
                </button>
              ))}
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
                {approval.explanations &&
                Object.keys(approval.explanations).length ? (
                  <div className="audit-explanations">
                    <span>Institutional explanations</span>
                    {Object.entries(approval.explanations).map(
                      ([edit, explanation]) => (
                        <p key={edit}>
                          <strong>
                            {/^\d+$/.test(edit)
                              ? `Recorded variance explanation ${
                                  Number(edit) + 1
                                }`
                              : edit}
                          </strong>
                          <small>{explanation}</small>
                        </p>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <div className="audit-note">
          <strong>Demonstration data notice</strong>
          <p>
            This portfolio workspace uses generated institution-like records.
            No personal or institution-owned student data is present.
          </p>
        </div>
        <button className="button button-primary full" onClick={onClose}>Done</button>
      </aside>
    </>
  );
}

export default function EduInsightApp() {
  const [view, setView] = useState<ViewId>("overview");
  const [memoryTarget, setMemoryTarget] = useState<string>();
  const [auditOpen, setAuditOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() =>
    typeof window === "undefined"
      ? []
      : (loadSavedScenarios(window.sessionStorage) as SavedScenario[]),
  );
  const [ipedsApprovals, setIpedsApprovals] = useState<IpedsApproval[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      persistSavedScenarios(window.sessionStorage, savedScenarios);
    }
  }, [savedScenarios]);

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

  function openMemory(recordId: string) {
    setMemoryTarget(recordId);
    navigate("memory");
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <SealMark className="brand-seal" />
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
              <AppIcon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "quality" && <em>{qualitySummary.open}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-status">
          <div>
            <span className="status-pip" aria-hidden="true" />
            <p>
              <strong>Agents online</strong>
              <small>Last sync 8 min ago</small>
            </p>
          </div>
          <button onClick={() => setAuditOpen(true)}>
            View system status <AppIcon name="arrow-right" />
          </button>
        </div>
        <div className="profile">
          <span>IR</span>
          <p>
            <strong>Institutional Research</strong>
            <small>Administrator</small>
          </p>
        </div>
        {/* Horizon line: the one piece of plainly architectural imagery. */}
        <ArchColonnade className="sidebar-arches" />
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
        {view === "scenario" && (
          <Scenario
            onAudit={() => setAuditOpen(true)}
            onOpenMemory={openMemory}
            savedScenarios={savedScenarios}
            setSavedScenarios={setSavedScenarios}
          />
        )}
        {view === "memory" && (
          <Memory
            onAudit={() => setAuditOpen(true)}
            initialRecordId={memoryTarget}
          />
        )}
      </section>

      <AuditDrawer
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        ipedsApprovals={ipedsApprovals}
      />
      <div className={`toast ${toast ? "show" : ""}`} role="status">
        <AppIcon name="check" />{toast}
      </div>
    </main>
  );
}
