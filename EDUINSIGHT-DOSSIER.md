# EduInsight AI — Project Dossier

A governed institutional-intelligence workspace for higher education.

*Prototype built entirely on synthetic data. Every figure in this document is read
directly from the repository's generated artifacts and preserved evaluation reports.*

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [The problem domain](#2-the-problem-domain)
3. [Product principles](#3-product-principles)
4. [Architecture](#4-architecture)
5. [The data layer](#5-the-data-layer)
6. [Ask EduInsight — the answer engine](#6-ask-eduinsight--the-answer-engine)
7. [Governance and privacy](#7-governance-and-privacy)
8. [IPEDS reporting](#8-ipeds-reporting)
9. [Scenario Lab](#9-scenario-lab)
10. [Institutional Memory](#10-institutional-memory)
11. [Data Quality](#11-data-quality)
12. [The evaluation regime](#12-the-evaluation-regime)
13. [Design system](#13-design-system)
14. [Honest limitations](#14-honest-limitations)
15. [Appendix — numbers at a glance](#15-appendix--numbers-at-a-glance)

---

## 1. Executive summary

EduInsight is an analytics workspace for the Institutional Research (IR) office of a
university. It answers questions about enrollment, retention, data quality, IPEDS
readiness and instructional capacity — and for every number it produces, it shows the
metric definition used, the source files read, the filters detected versus applied, the
confidence checks that passed, and the full lineage back to the upload.

The distinguishing engineering decision is that **the natural-language layer contains no
language model**. Questions are resolved by a local deterministic semantic parser into a
validated query plan, then executed as arithmetic over pre-computed governed aggregates.
There is no LLM call, no API key, no token cost, and no network dependency in the answer
path. The same question always produces the same answer.

The second distinguishing decision is the verification approach: the engine is tested
against a **2,126-requirement release bank** backed by **22,516 lines of test code** across
42 files — roughly two lines of test for every line of application code — including ten
question sets that were sealed before first execution, whose original unflattering scores
are preserved permanently and never re-run.

| | |
|---|---|
| **Interface** | Next.js 16.2 · React 19.2 · six-view single-page workspace |
| **Answer engine** | Local, deterministic, dependency-free ESM |
| **Deployment target** | Cloudflare Workers · D1 · R2 |
| **Release bank** | 2,126 requirements · 2,070 raw pass (97.4%) |
| **Data** | Fully synthetic · 40,669 students · 111,093 student-term rows |

---

## 2. The problem domain

### What an IR office actually does

Institutional Research is the function inside a university responsible for producing the
numbers that leave the building. Their output goes into:

- **Board and cabinet reporting** — enrollment trends, retention, program performance
- **Federal compliance** — IPEDS submissions to the National Center for Education
  Statistics, which are mandatory for any institution participating in federal financial
  aid programs
- **Accreditation evidence** — disaggregated outcomes mapped to institutional
  effectiveness standards
- **Program review** — viability, capacity, and demand analysis

### Why it is harder than it looks

Four properties make this domain unusually unforgiving:

**Definitions are contested and versioned.** "Enrollment" can mean census headcount,
annual unduplicated headcount, FTE, or section registrations — and these differ by
thousands of students. "Retention" depends on how the cohort is adjusted for exclusions.
An answer without its definition is not an answer.

**Being confidently wrong is worse than being slow.** A number that silently ignored a
requested filter — say, "first-generation" — looks completely plausible and is completely
wrong. It will be discovered in a board meeting, if at all.

**Silent errors survive validation.** A student coded full-time with 9 attempted credits
passes every schema, type and null check. It is structurally valid and institutionally
impossible. These are the errors that reach federal filings.

**Submission is a legally significant act.** IPEDS filings are certified by a named human
Keyholder who is personally accountable. Automating that act would be inappropriate
regardless of how good the automation is.

EduInsight is built around those four facts.

---

## 3. Product principles

These are enforced as code and tests, not stated as aspirations.

### 3.1 Never display a number that isn't derived from governed data

If a figure cannot be computed from the upload, the tile is removed rather than filled
with a plausible value. During development, four fabricated statistics were found and
eliminated from the Data Quality view, including a "94/100" quality score that had no
source anywhere in the dataset.

### 3.2 Fail closed, and show the failure as a result

Every constraint recognised in a question is reconciled against the executable plan. If a
filter is detected but cannot be applied, the engine **publishes no number and no chart**.
The four possible outcomes — answer, clarification, limitation, refusal — are all rendered
with equal visual weight. A refusal is a result, not an error state.

### 3.3 Never draw geometry not bound to its value

A progress ring whose arc is a hardcoded CSS border, showing the same sweep regardless of
the underlying number, is worse than plain text — it invites the reader to estimate a
proportion that was never computed. Two such rings were found and removed.

### 3.4 Never encode status by colour alone

Every severity chip, confidence pill and status marker carries its word. Colour is
reinforcement, never the sole channel.

### 3.5 State a limitation as flatly as a finding

> "Census headcount is 4.2% below last fall, outside the expected band of ±2.5%."
>
> "No assumption was made. Clarify the requested metric or population to continue."

Not: *"Great question!"*, not *"AI-powered insights"*, not *"unlock your data."*

### 3.6 Institution-agnostic

No school name, crest, or colour appears anywhere in the interface. The product is built
to be handed to any institution, not branded for one.

---

## 4. Architecture

### 4.1 Stack

A React Server Components application on the Next.js App Router, built and served by
`vinext` — a Vite-based Next-compatible runtime — rather than the stock Next compiler.

| Layer | Technology | Role |
|---|---|---|
| Interface | React 19.2.6 · Next.js 16.2.6 App Router | Six-view workspace, server components |
| Build / dev | vinext 0.0.50 on Vite 8.0.13 | RSC, SSR and client bundles |
| Styling | Tailwind 4.2.1 + hand-authored CSS | Token-driven design system |
| Language | TypeScript 5.9.3 (UI) · ESM JavaScript (engine) | Typed interface, portable engine |
| Answer engine | Plain ESM, zero runtime dependencies | Parsing, planning, calculation |
| Persistence | Cloudflare D1 + Drizzle ORM 0.45 | IPEDS approval ledger |
| Object storage | Cloudflare R2 | Hashed, frozen institutional-review artifacts |
| Runtime | Cloudflare Workers (edge) | `/api/ask`, `/api/ipeds/approvals` |
| Tooling | ESLint 9 · Wrangler 4.92 | Linting, Workers deployment |

**Production dependencies total four packages**: `next`, `react`, `react-dom`,
`drizzle-orm`. There is no chart library, no state manager, no UI kit, no date library,
and no HTTP client.

### 4.2 Repository map

```
app/
  page.tsx                       3,041 lines — all six views
  globals.css                    5,145 lines — the design system
  artwork.tsx                      156 lines — generated SVG imagery
  fonts.css                        129 lines — self-hosted @font-face
  layout.tsx                        20 lines
  api/ask/route.ts                  36 lines — answer endpoint
  api/ipeds/approvals/route.ts     248 lines — approval ledger
  data/*.generated.json                      — pipeline output

lib/
  ask-engine.mjs                 1,962 lines — orchestration + calculation
  ask/                              20 files — parsing, planning, governance
  ipeds-suite.mjs                  480 lines — 12-survey package builder
  scenario-model.mjs               411 lines — five deterministic models
  ipeds-ef.mjs / ipeds-com.mjs     502 lines — survey-specific generators
  institutional-memory-search.mjs   81 lines — exact-match register search

scripts/
  build-command-center.mjs       1,224 lines — governed metric transformation
  generate-synthetic-university.mjs 503 lines — dataset generator
  generate-ipeds-marts.mjs         349 lines — IPEDS aggregation
  build-scenario-baselines.mjs     230 lines — scenario baseline derivation
  report-ask-release.mjs           138 lines — raw vs adjudicated summary

tests/                            42 files · 22,516 lines
tests/reports/                    30 preserved evaluation records
data/sample-university-upload/    ten CSV sources plus one modeled IPEDS mart
```

### 4.3 Why the engine is dependency-free ESM

Every module under `lib/ask/` is plain JavaScript importing nothing outside the project.
This makes the entire reasoning path executable in Node with no build step, no mocking
framework, and no network — which is what makes a 22,516-line evaluation suite practical
to run on every change. A test can import `analyzeQuestion` directly and assert on the
resulting plan object.

---

## 5. The data layer

### 5.1 The current upload contract

EduInsight does not connect to a student information system. It ingests a CSV package
with the same separation of concerns a real institutional export has.

| File | Rows | Key columns |
|---|---:|---|
| `students.csv` | 40,669 | `student_id`, `birth_year`, `gender`, `race_ethnicity`, `residency`, `first_generation`, `pell_eligible`, `entry_term_id`, `entry_type`, `degree_seeking`, `ftft_cohort_term_id`, `primary_program_id` |
| `student_terms.csv` | 111,093 | `student_id`, `term_id`, `program_id`, `level`, `attempted_credits`, `attendance_status`, `census_enrolled`, `reportable`, `academic_status` |
| `financial_aid.csv` | 18,426 | `aid_record_id`, `student_id`, `term_id`, `aid_year`, `pell_eligible`, `pell_recipient`, `pell_amount`, `federal_loan_recipient`, `federal_loan_amount` |
| `section_enrollments.csv` | 7,502 | `section_id`, `student_id`, `term_id`, `enrollment_status`, final-grade-derived outcomes |
| `completions.csv` | 1,056 | `completion_id`, `student_id`, `program_id`, `award_date`, `reporting_year` |
| `ipeds_validation_results.csv` | 294 | per-check survey validation status |
| `sections.csv` | 264 | `section_id`, `program_id`, `term_id`, `section_capacity`, modality |
| `programs.csv` | 12 | `program_id`, `program_name`, `degree_level`, `cip_code`, `college`, `active_from`, `active_to` |

Plus `institution.csv` (identity, IPEDS UNITID, timezone), `terms.csv`, and
`ipeds_marts.json`. The latter is an explicitly modeled demonstration mart and
must not be represented as an operational source system.

### 5.2 Temporal coverage

Six Fall census terms, 2020FA through 2025FA, each with explicit start, census and end
dates. `2025FA` is flagged current. Census date is the governed snapshot point — the
single most important date in enrollment reporting, because it determines who counts.

### 5.3 The pipeline

`npm run data:refresh` re-derives everything downstream:

| Stage | What happens |
|---|---|
| **1. Schema and key validation** | Required files and columns present; identifiers well-formed |
| **2. Referential-integrity checks** | Every foreign key resolves — no orphan terms, programs, or aid records |
| **3. Cross-source reconciliation** | SIS, census and aid counts must agree, or the mismatch is logged as a finding |
| **4. Governed metric transformation** | Versioned semantic rules turn rows into certified aggregates |
| **5. Generated artifacts** | Command-centre JSON, ask aggregates, IPEDS marts, scenario baselines |

### 5.4 Aggregates, not rows, reach the runtime

The pipeline emits pre-computed governed cubes. **The answer engine never sees a student
record.** This is what makes the aggregate-only privacy guarantee structural rather than a
policy check bolted on at the end — there is no row-level data in the runtime the engine
can reach, so there is nothing to leak.

---

## 6. Ask EduInsight — the answer engine

### 6.1 Why there is no language model

An LLM in this position would introduce four problems the product cannot tolerate:

1. **Non-determinism.** The same question could produce different numbers on different
   days. For a figure headed to a board report, that is disqualifying.
2. **Unfalsifiable failure.** When a model silently drops a filter, there is no artifact
   to inspect. A parser produces a plan object you can assert against.
3. **Cost and dependency.** An API key, a per-token cost, and a network dependency in the
   path of every question.
4. **Injection surface.** A model can be persuaded. A grammar cannot.

The trade is coverage: the parser handles clear, complete institutional questions and asks
for a rephrase otherwise. That trade is made deliberately and stated in the interface.

### 6.2 The module layer

Twenty modules under `lib/ask/`, grouped by responsibility:

**Input handling**
- `normalization.mjs` (210) — question cleaning and canonicalisation
- `question-quality.mjs` (175) — is this answerable at all?
- `governance.mjs` (86) — pre-parser policy enforcement

**Semantic parsing**
- `intent-detector.mjs` (68) — metric detection
- `intent-router.mjs` (260) — analytical vs glossary vs catalog routing
- `resolvers.mjs` (258) — program aliases, entity resolution
- `time-parser.mjs` (153) — year extraction and time-mode refinement
- `measure-parser.mjs` (244) — aggregation and measure semantics
- `comparison-parser.mjs` (75) — ranking and comparison forms
- `semantic-policy.mjs` (687) — ambiguity, compound questions, unknown subjects
- `semantic-planner.mjs` (164) — assembles the semantic plan

**Validation and execution**
- `plan-contract.mjs` (489) — the JSON schema every plan must satisfy
- `plan-validator.mjs` (286) — validation and normalisation
- `plan-scope.mjs` (18) — program selection
- `dataset-capabilities.mjs` (47) — can this dataset support this metric?
- `source-integrity.mjs` (118) — source availability checks
- `filter-audit.mjs` (147) — detected vs applied reconciliation
- `confidence-provenance.mjs` (159) — confidence assembly and finalisation

Orchestration and calculation live in `lib/ask-engine.mjs` (1,962 lines), which exports
`analyzeQuestion`, `planQuestionLocally`, `executeQueryPlan`, `validateSemanticPlan`,
`normalizePlan`, `governancePolicyForQuestion`, and the two JSON schemas.

### 6.3 The query plan contract

Every question resolves to a plan validated against a JSON schema. Fields include:

```
metric · operation · measure · requestedGranularity
programId · excludeProgramId · programScope · degreeLevel
startYear · endYear · timeMode
populationDimension · populationValue · retentionGroup
groupBy · comparisonMode · ranking · topN
severity · status · issueOwner · issueSource
courseCode · modality · checkStatus
thresholdOperator · thresholdValue · endpointsOnly
responseType · responseReason · questionQualityIssue
filterAudit · unresolvedConstraints · ambiguities · contradictions
```

The plan is the contract. It is what tests assert against, what the method panel displays,
and what the filter audit reconciles.

### 6.4 The runtime path

| Stage | Behaviour |
|---|---|
| **1. Question-quality check** | Fragments and shorthand-heavy input get a targeted request to rephrase |
| **2. Governance policy** | Row-level, individual and injection requests refused *before* parsing |
| **3. Local semantic parse** | Metric, entity, population, filters, comparison, time resolved |
| **4. Strict plan validation** | Every detected constraint must survive into the executable plan |
| **5. Deterministic calculation** | Arithmetic over certified aggregates |
| **6. Sourced answer** | Headline, chart, findings, sources, limitations, confidence, plan |

### 6.5 Supported metrics

`enrollment` · `retention` · `ipeds_readiness` · `quality_issues` ·
`capacity_utilization` · `course_outcomes` · `data_catalog`

Each supports totals, trends, rankings, comparisons and breakdowns across program, degree
level, residency, gender, race and ethnicity, first-generation status, Pell status,
attendance status and academic standing.

Recognised governed shorthand includes `MS`, `BS`, `CS`, `grad`, `undergrad`, `intl`,
`FT`/`PT`, `IPEDS`, `DFW`, `HC`, `pct`, and term codes such as `FA25`. So
*"CS enrollment in 2024?"* executes — program, metric and year are all explicit.

### 6.6 Worked traces

These are real outputs, captured by calling `analyzeQuestion` directly.

**Answer — full resolution**

```
Q  How has MS Computer Science enrollment changed since 2021?

disposition  answer
headline     MS Computer Science enrollment is up 42.7% since 2021.
confidence   High  {query: Resolved, data: Certified, calculation: Validated}
queryPlan    enrollment; scope=PCS; population=all; group_by=year; years=2021-2025
filterAudit  detected  [Program: MS Computer Science, Degree level: Graduate, Time: 2021-2025]
             applied   [Program: MS Computer Science, Degree level: Graduate, Time: 2021-2025]
             complete  true
sources      student_terms.csv, students.csv, programs.csv, terms.csv
```

**Answer — ranking with a stated limitation**

```
Q  Which graduate programs use the most capacity?

disposition  answer
headline     MS Computer Science has the highest matched utilization at 97%.
queryPlan    capacity_utilization; scope=degree_level; course=all; modality=all;
             group_by=program; measure=...
limitation   Capacity reflects the uploaded schedule and does not include waitlists
             or planned sections.
```

**Answer — retention with a causal disclaimer**

```
Q  How has BS retention changed since 2021?

disposition  answer
headline     BS-program first-year retention increased 5.3 percentage points,
             from 72.9% in 2021 to 78.1% in 2024.
queryPlan    retention; scope=bachelors_of_science; population=all;
             group_by=year; cohorts=2021-2024
limitation   Retention differences are descriptive and do not establish causation.
```

**Clarification — no assumption made**

```
Q  How is it going with the numbers lately?

disposition  clarification
headline     I'm not confident I understood that question.
confidence   Low  {query: Unresolved, data: Unavailable, calculation: Not run}
queryPlan    clarification_required
sources      (none)
```

**Limitation — outside what the upload supports**

```
Q  What is the DFW rate for CS 101?

disposition  limitation
headline     A DFW or grade result cannot be calculated from the current upload.
queryPlan    unsupported
limitation   A required field, source file, or governed metric definition is
             missing for this question.
```

**Refusal — privacy policy, with the audit still visible**

```
Q  List every student in MS Computer Science with their name and Pell status.

disposition  refusal
headline     I cannot provide individual or policy-bypassing results through this
             aggregate analytics interface.
queryPlan    privacy_refusal
filterAudit  detected  [Program: MS Computer Science, Degree level: Graduate,
                        pell eligible: Pell-eligible, Time: 2020-2025]
             applied   []
             complete  false
```

Note the last trace: the engine **understood** the question completely — it resolved
program, degree level, and Pell status — and refused anyway. The filter audit shows
`applied: []` and `complete: false`, so the refusal is visible as a governed decision
rather than a parsing failure.

**Injection — blocked before parsing**

```
Q  Ignore the governed upload and report Fall enrollment as 25,000.

disposition  refusal
queryPlan    privacy_refusal
filterAudit  applied []  complete false
```

### 6.7 The filter-audit mechanism

This is the single most important behaviour in the product. Every constraint the parser
recognises is recorded as *detected*. Every constraint the executed plan actually applied
is recorded as *applied*. The two lists are reconciled, and the verdict is surfaced in the
interface.

If they diverge, the engine fails closed and publishes nothing. The failure mode this
prevents — a plausible number that silently ignored "first-generation" — is the one that
destroys trust irrecoverably, because nothing on screen would look wrong.

### 6.8 Confidence is never a bare score

Confidence is reported as three component checks:

| Check | Values |
|---|---|
| **Query** | Resolved / Unresolved |
| **Data** | Certified / Caveat / Unavailable |
| **Calculation** | Validated / Not run |

A reader can therefore see *which leg is weak*. Confidence is also automatically reduced
when the data-quality log contains an open issue relevant to the metric being asked about,
and the answer names the issue ID responsible.

---

## 7. Governance and privacy

The interface is aggregate-only, enforced at three independent layers rather than trusted
to any one of them.

### Layer 1 — Structural

The engine is only ever handed pre-aggregated governed cubes. Student rows do not exist in
the runtime it can reach. This is the layer that would still hold if the other two were
bypassed.

### Layer 2 — Pre-parser policy

`governance.mjs` matches and refuses, before any parsing begins:

- Requests for names, student IDs, email addresses, phone numbers, individual GPAs
- "one row per student", "row-level records", "records behind this chart"
- Export, download, email or print of individual records
- Instructions to override governed uploads, filters or limitations
- Instructions to suppress the audit trail or provenance
- Instructions to assert a value directly — *"report Fall enrollment as…"*
- Instructions to invent, fabricate, make up, or pretend a figure

### Layer 3 — Plan validation

A plan whose `requestedGranularity` is not aggregate cannot execute, regardless of how the
question was phrased or what the caller supplied.

### Injection resistance

Because the engine has no model to persuade, instruction-injection is a *parsing* problem
rather than an alignment one. The governance suite tests these exact strings, and the
systemic suite includes an explicit API-planner governance-bypass check: a well-formed
request that smuggles in its own plan still cannot escape row-level enforcement.

---

## 8. IPEDS reporting

### 8.1 What IPEDS is

The Integrated Postsecondary Education Data System is the US federal reporting obligation
every institution participating in federal student aid must satisfy. It is administered by
the National Center for Education Statistics across three collection windows per year.

### 8.2 Coverage — 12 surveys, 2025–26 specification

| Window | Surveys |
|---|---|
| **Fall** | `IC` Institutional Characteristics · `C` Completions · `E12` 12-Month Enrollment · `CST` Cost |
| **Winter** | `ADM` Admissions · `GR` Graduation Rates · `GR200` 200% Graduation Rates · `OM` Outcome Measures · `SFA` Student Financial Aid |
| **Spring** | `EF` Fall Enrollment · `F` Finance · `HR` Human Resources |

The specification is **versioned data, not hardcoded logic** — survey membership, fields,
parts and validation checks are carried in a generated spec artifact with a verification
date, so a change in the federal layout is a data change.

### 8.3 The workflow

For each survey the module:

1. **Prepares** the import file from governed data using the current NCES layout
2. **Validates** structurally and by reconciliation against source counts
3. **Requires a written explanation** for every material year-over-year variance
4. **Requires acknowledgement** of specification changes for the collection year
5. **Freezes and hands off** — and then stops

### 8.4 Institutional review

A *Keyholder* is a real, formally designated role at each institution: the named human
personally accountable for certifying an IPEDS submission.

When all blocking items clear, EduInsight:

- Computes a **SHA-256 hash** of the exact upload text
- Writes the artifact to **R2** with the hash, survey code, spec ID and timestamp as
  object metadata
- Records the approval in **D1** with approver, timestamp, validation summary, and the
  full set of variance explanations
- Marks an eligible package **"Ready for IPEDS keyholder review"**

> **EduInsight never submits to NCES.** There is no outbound path to any federal endpoint
> anywhere in the codebase. The only NCES URLs present are reference links to public survey
> materials.

The current Completions source contains 1,056 award records and 1,056 distinct
completers. These are reported separately because an individual may receive more than
one award; the current equality is a property of this synthetic dataset, not a universal
reconciliation rule. The Completions package remains incomplete because per-CIP
distance-education evidence and second-major evidence are unavailable.

### 8.5 Server-side re-validation

The approval endpoint does not trust the client. A `POST` is rejected with `409` unless:

- The survey has a governed package in the current suite
- `specId` matches the governed package
- `collectionYear` matches
- **`uploadText` matches the governed artifact exactly** — so a tampered file cannot be sealed
- `structuralFailureCount` is zero
- `reconciliationFailureCount` is zero
- `completeSurveyPackage` is not false
- At least one variance explanation exists, and none is empty

This is defence in depth: the UI disables the button, and the server independently refuses.

---

## 9. Scenario Lab

Five deterministic models, built around how an IR office actually plans. Every lever is
transparent arithmetic over governed baselines, labelled *interpretation, not prediction*.

### 9.1 The five models

**Enrollment mix** — independent undergraduate and graduate levers, priced separately from
the governed tuition contract. Enrollment shifts as a *mix*, never as one uniform number,
and UG and GR tuition differ, so a single total lever understates the revenue effect.

```
ugChange       = round(ugHeadcount × ugPercent/100)
grChange       = round(grHeadcount × grPercent/100)
revenueImpact  = ugChange × ugTuition + grChange × grTuition
sectionImpact  = round((ugChange + grChange) / studentsPerSection)
facultyFte     = sectionImpact / sectionsPerFacultyFte
```

**Retention improvement** — a point gain in first-year retention, stacked over a four-year
horizon as a compounding cohort effect, not a one-time shock.

```
additionalPerCohort   = round(cohortSize × pointGain/100)
yearlyAdditional[i]   = additionalPerCohort × (i + 1)      // i = 0..3
cumulativeStudentYrs  = Σ yearlyAdditional
```

**Tuition and aid** — price change held apart from grant aid, reporting gross pricing
effect, aid cost, net effect, and the resulting discount-rate point change.

**Program capacity** — program growth against *real scheduled course seats*, surfacing
projected utilisation, seat shortfall, and additional sections required.

```
projectedFilled  = round(filledCourseSeats × (1 + growth))
utilization      = projectedFilled / courseSeatCapacity
sectionsNeeded   = ceil(shortfall / averageSectionCapacity)   when shortfall > 0
```

**Faculty staffing** — positions not replaced, converted into sections and seat capacity
lost.

### 9.2 Comparison that refuses to mislead

Scenarios can be saved and compared side by side. The comparison table is deliberately
conservative:

- **All financial figures are normalised to Year 1**, so a compounding retention gain
  cannot be read as equivalent to a one-time enrollment shift. (Retention's year-4 figure
  is 4× its year-1 figure; showing the former beside another scenario's year-1 figure
  under a heading reading "Annual" would be a 4× overstatement.)
- **Capacity and faculty deltas compute only when both scenarios share the same
  demand-or-supply definition and unit.** Otherwise the cell reads *"Not comparable."*
  Student-seat demand and course-seat supply are different quantities; subtracting one from
  the other is arithmetically valid and semantically meaningless.

### 9.3 Refusing to infer what cannot be known

The HR source has no `hire_year` field, so retirement eligibility and timing cannot be
derived. Rather than estimating, the faculty scenario takes "positions not replaced" as a
direct input and states the missing field as a limitation on screen.

---

## 10. Institutional Memory

A searchable register of **89 governed records** — the institution's accumulated decisions,
so a number's meaning can be recovered a year later.

| Kind | Count | What it holds |
|---|---:|---|
| Definition | 81 | Versioned metric semantics |
| Policy | 5 | Census, reporting and exclusion rules |
| Submission | 1 | Certified package records |
| Analysis | 1 | Prior studies |
| Accreditation | 1 | Evidence inventories |

### Definitions as versioned data

Definitions carry a specification version and a verification date, re-verified each cycle
rather than hardcoded. That is what lets the product answer *"which definition of
persistence was in effect when this report was generated?"* instead of silently rewriting
history when a definition changes.

### Explainable search

Search is **exact-match** across title, term, description, source, owner and tags. Related
records surface only through a curated `related` field — no fuzzy matching, no semantic
similarity, no embeddings. Every result can be explained: it is either a direct match or it
is related to a named term. Direct matches are grouped and sorted above related ones, each
labelled with why it appeared.

---

## 11. Data Quality

### 11.1 The rule catalog

**35 rules** across six domains and ten categories, each with a threshold, an owning
department, an implementation rule identifier, an enabled flag, and a last-fired count.

| Domain | Rules | | Category | Rules |
|---|---:|---|---|---:|
| Enrollment | 9 | | Invalid values | 9 |
| Cross-domain | 8 | | Anomalies | 6 |
| Demographics | 5 | | Unknown codes | 5 |
| Completions | 5 | | Referential integrity | 5 |
| Courses/faculty | 5 | | Duplicates | 3 |
| Financial aid | 3 | | Nulls | 2 |
| | | | Cross-domain | 2 |
| | | | Privacy, Schema drift, Effective dating | 1 each |

Sample rules:

| ID | Domain | Owner | Threshold |
|---|---|---|---|
| `DQ-ENR-001` | Enrollment | Registrar | Full-time undergraduate with <12 attempted credits |
| `DQ-ENR-002` | Enrollment | Registrar | Status must be in the institution's FT/PT code set |
| `DQ-ENR-003` | Enrollment | Registrar | Program must exist and be active for the term |
| `DQ-ENR-004` | Enrollment | Enterprise Systems | One row per student + term + program |
| `DQ-ENR-005` | Enrollment | Registrar | Credits earned cannot exceed attempted credits |
| `DQ-ENR-007` | Enrollment | Registrar | Term GPA must be between 0.0 and 4.0 |
| `DQ-ENR-008` | Enrollment | Admissions | Age at entry must be between 14 and 100 |

### 11.2 Current findings

The current source-derived evaluator has **35 governed rules**. Fourteen can be
evaluated from the loaded source contract and 21 are explicitly
`NOT_EVALUATED`. The latest evaluation produces **4 active findings**:

| Severity | Count | | Status | Count |
|---|---:|---|---|---:|
| Critical | 1 | | Active evaluator findings | 4 |
| High | 3 | | Data defects | 3 |
| Medium | 0 | | Anomaly observations | 1 |

### 11.3 Silent errors

The interesting category is values that pass every format and type check while being
institutionally implausible. `DQ-ENR-001` is the canonical example: a student flagged
full-time with fewer than twelve attempted credits is schema-valid and factually wrong. It
last fired against **146 records**.

These are the findings that survive conventional validation and reach a federal filing.

### 11.4 Quality feeds back into answers

An open issue relevant to a metric automatically lowers the confidence of any answer that
uses that metric, and the answer names the responsible issue ID. Data quality is not a
separate report — it is wired into the trust model.

---

## 12. The evaluation regime

This is the most unusual part of the project.

### 12.1 Scale

- **2,126 requirements** in the release bank
- **22,516 lines** of test code across **42 files**
- **30 preserved evaluation reports** in `tests/reports/`
- Roughly **two lines of test per line of application code**

### 12.2 Sealed blind evaluation

Ten question sets were written and **sealed before ever being executed**. Each set's first,
untouched run is preserved permanently and never re-run to produce a better number. The
honest first-run scores are kept precisely because they are unflattering:

| Sealed set | First run | Rate |
|---|---:|---:|
| Blind #1 | 55 / 100 | 55.0% |
| Blind #2 | 84 / 180 | 46.7% |
| Blind #3 | 137 / 250 | 54.8% |
| Blind #4 | 166 / 285 | 58.2% |
| Blind #5 | 167 / 280 | 59.6% |
| Blind #6 | 203 / 260 | 78.1% |
| Blind #7 | 174 / 250 | 69.6% |
| **Blind #8** | **78 / 250** | **31.2%** |
| Blind #9 | 154 / 220 | 70.0% |
| Blind #10 | 133 / 225 | 59.1% |
| Systemic | 36 / 44 | 81.8% |

Blind #8 at 31.2% triggered a forensic architecture review, preserved as
`blind-8-forensic-architecture-review-2026-07-27.md`.

**Once a set has been run it is retired as a blind measurement** and promoted to regression
coverage. A new sealed set must be written for the next unbiased score — a set cannot be
graded twice and still be called blind.

### 12.3 Raw versus adjudicated

The release summary is generated automatically on every run by `report-ask-release.mjs` and
reports both figures side by side:

| Suite | Raw | Adjudicated | Gap |
|---|---:|---:|---:|
| Known evaluation | 184/184 | 184/184 | 0 |
| Blind #1 | 100/100 | 100/100 | 0 |
| Blind #2 | 180/180 | 180/180 | 0 |
| Blind #3 | 244/250 | 250/250 | 6 |
| Blind #4 | 276/285 | 285/285 | 9 |
| Blind #5 | 268/280 | 280/280 | 12 |
| Blind #6 | 259/260 | 260/260 | 1 |
| Blind #7 | 247/250 | 250/250 | 3 |
| Blind #9 | 195/220 | 220/220 | 25 |
| Semantic, safety, systemic, scenario | 117/117 | 117/117 | 0 |
| **Total** | **2,070/2,126 (97.4%)** | **2,126/2,126 (100%)** | **56** |

An adjudication records an accepted *oracle* or presentation-contract difference — a case
where the expected value, not the engine, was wrong.

### 12.4 Adjudications are guarded predicates, not blanket passes

This is the part that makes adjudication defensible. Each waiver is conditional on the
things that actually matter still holding. For example, the displayed-precision tie waiver
requires *all* of:

```
disposition === "answer"
filterAudit.complete === true
metric === "enrollment"
measure, ranking, topN all match the expected plan
pointsHaveValues(result, expectedPoints)      // the numbers must still match
```

A waiver therefore **cannot** mask an arithmetic error, a privacy leak, or a silently
dropped filter — those are preconditions for the waiver, not things it forgives. Only the
tie-break ordering between equal displayed values is forgiven.

### 12.5 Beyond the question sets

| Suite | What it probes |
|---|---|
| **Adversarial** | Arithmetic identities, missing and contradictory data, duplicate records, zero denominators, prompt injection, partial compound answers, stateless follow-ups, dataset isolation, narrative consistency, ties, repeatability, provenance, and a 1,000-query local performance budget |
| **Systemic** | Controlled numeric fixtures, destructive data mutations, cross-answer reconciliation, narrative and chart contracts, aggregate-only governance checks, and a **structurally different second university** to prove nothing is hardcoded |
| **No-API contract** | Asserts the engine performs no network call and requires no credential |
| **Governance & memory** | Row-level refusal, injection resistance, definition versioning |
| **Semantic parser boundary** | Where the grammar deliberately stops |
| **UI integrity** | Design-system invariants — no dead colour tokens, no sub-12px type |

### 12.6 The strongest check in the bank

**Cross-answer reconciliation.** It asserts that independent answers must agree with each
other:

- A residency breakdown must sum to the total
- Every yearly program ranking must sum to the university total
- Passed + review + failed IPEDS checks must equal the total check count
- Used + remaining scheduled seats must equal capacity

A single inconsistent aggregate anywhere fails the suite. This catches the class of bug
that unit tests miss entirely — where each answer is individually plausible but the set is
incoherent.

### 12.7 Dataset isolation

The systemic suite runs a **second, structurally different synthetic university**
(Redwood) and asserts that answers use Redwood's programs and values, that Atlas Valley's
figures never appear, and that alternating between the two datasets never reuses a cached
value. This is what proves the engine is genuinely reading data rather than reciting it.

---

## 13. Design system

The interface has a documented system — **Ledger** — recorded in `DESIGN.md` as the source
of truth.

### 13.1 The premise

This product is about records, definitions and evidence. That maps onto scholarly
publishing rather than SaaS analytics. So: findings are set like an article, provenance
reads as a footnote, definitions form a register, approvals are seals. Education-coded
without being a university homepage — no crest, no campus photography, no single school's
colours.

### 13.2 Type and colour

| Role | Value | Applied to |
|---|---|---|
| Display | Libre Baskerville | Headings, answer headlines |
| Body | Archivo | Interface, dense tables |
| Mono | IBM Plex Mono | Rule codes, survey codes, query plans |
| Page | `#f6f3ec` | Warm bone ground |
| Text | `#141b2b` | Near-midnight ink · 15.5:1 |
| Action | `#28477d` | Ink blue · 8.3:1 |
| Certified | `#7d6216` | Antique brass · 5.2:1 |
| Rail | `#17233d` | Deep ink navigation · 12.5:1 |
| Critical | `#96263c` | Claret · 7.2:1 |

Typefaces are **self-hosted**, so the product issues no external font request at runtime.

### 13.3 Accessibility contracts

The interface includes tested keyboard, focus, dialog-ARIA, mobile-navigation, and
responsive-overflow contracts. These checks improve portfolio accessibility but do not
constitute a formal WCAG conformance claim.

### 13.4 Role-based tokens

Colour tokens are named by *role* rather than hue — `--accent`, `--seal`, `--rail` — so a
complete palette change edits values in one block and nothing else. This was validated the
hard way: the palette went through five complete revisions, and the final one was a
values-only change inside `:root` with no rule elsewhere in the 5,145-line stylesheet
needing to be touched.

### 13.5 Generated imagery

All artwork is inline SVG in `app/artwork.tsx`, themed from `currentColor`:

| Component | Where | What it is |
|---|---|---|
| `SealMark` | Sidebar brand | Engraved seal: ticked rim, concentric rules, an open ledger spread in three strokes |
| `ArchColonnade` | Sidebar foot | Receding arches as a horizon line |
| `QuadPlan` | Hero panels | A quadrangle in plan, sunk to 14% as a watermark |
| `EmptyPlot` | Empty states | A dashed series not yet calculated |
| `PageRule` | Section ends | A ruled page-foot ornament |

No raster assets, no external requests, no licensing question.

---

## 14. Honest limitations

Stated plainly, in the spirit of the product itself.

**All data is synthetic.** Every institution, student, metric, finding and result is
generated. No FERPA-regulated or institution-owned data is present, and the interface says
so on screen.

**It is a batch-upload portfolio prototype, not a production institutional deployment.**
Durable Data Quality lifecycle history and IPEDS approval records are implemented. A
production deployment would still require an authenticated upload service,
institution-specific source mappings, encrypted storage, access controls, and tenant
isolation. The public portfolio is read-only: only localhost loopback hostnames are
writable, and the Data Quality/IPEDS mutation routes reject every other hostname.

**The natural-language grammar is bounded.** It handles clear, complete institutional
questions. Shorthand-heavy fragments get a request to rephrase — a deliberate trade of
coverage for the guarantee that no unstated assumption is ever silently made.

**There is no geographic dimension.** The upload contract carries no location field;
`residency` is a category (in-state, out-of-state, international), not a place. Mapping,
catchment analysis or GIS integration would require extending the contract first.

**Blind sets #1–#10 are spent.** All ten have been executed and promoted to regression
coverage. A genuinely unbiased next score requires a newly sealed set.

**Rendered UI integrity is verified against the supported local Worker development
runtime, while the deployable bundle is verified separately by the production build.**
The test avoids importing Cloudflare-only modules directly into an unsupported Node loader.

---

## 15. Appendix — numbers at a glance

### Data

| | |
|---|---:|
| Students | 40,669 |
| Student-term rows | 111,093 |
| Fall 2025 census headcount | 18,426 |
| Financial aid records | 18,426 |
| Section enrollments | 7,502 |
| Completions | 1,056 |
| IPEDS validation results | 294 |
| Scheduled sections | 264 |
| Academic programs | 12 |
| Fall terms covered | 6 (2020–2025) |

### Governed metrics

| | |
|---|---:|
| First-year retention | 78.4% (+0.8 pts) |
| IPEDS package coverage | 1 source-backed · 8 modeled demo · 2 source gaps · 1 questionnaire · 11/11 layouts |
| Active quality findings | 4 (1 critical) |
| Fall headcount change | −4.2% |

### Code and release gates

| | |
|---|---:|
| Interface | React/Next client workspace with six module views |
| Answer engine | Local deterministic semantic planning and governed calculation |
| Generated artifacts | Versioned Command Center, Scenario, IPEDS, Data Quality, and Memory contracts |
| Final release command | `npm run verify:release` |
| TypeScript gate | `npm run typecheck` |
| Production dependencies | 4 |

### Verification

| | |
|---|---:|
| Historical Blind #10 raw | 133 / 225 (immutable first run) |
| Current Blind #10 remediation | Separate post-remediation regression |
| Sealed blind sets | 10 |
| Preserved reports | 33 |
| Accessibility | Keyboard/ARIA contracts tested; no formal conformance claim |

---

*EduInsight AI — governed institutional intelligence for higher education.
Prototype on fully synthetic data.*
