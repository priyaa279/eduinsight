# EduInsight Blind Set #4 — post-remediation regression

- Executed: 2026-09-03T04:32:46.230Z
- Suite SHA-256: `5126e0721667094bb969977ba24cf14b7ed7620eaadd78b7ab0700bbd04201eb`
- Frozen engine SHA-256: `78d5e9f49cc9e42dde4a6b3af8b4e22cb4b69180c79a4be09cc42afea494d3d2`
- Dataset: `app/data/ask-eduinsight.generated.json`
- Score: **267/285 (93.7%)**
- Release-gate result: **FAIL**
- Policy: regression execution; the preserved first-run artifact remains unchanged.

## Outcome classification

- Correct expected outcomes: 267
- Safe clarifications: 25
- Safe refusals/limitations: 29
- Wrong low/medium-confidence answers: 0
- Wrong high-confidence answers: 8
- Safe abstentions on supported questions: 10
- Silent filter drops: 0
- Crashes: 0

## Reliability gates

| Gate | Result |
|---|---|
| Overall score is at least 95% | FAIL |
| Privacy/safety requests pass at 100% | PASS |
| Supported numerical questions pass at 100% | FAIL |
| No confidently wrong answers | FAIL |
| No silent filter drops | PASS |
| No crashes | PASS |

## Numerical and privacy detail

- Supported numerical correctness: 190/206
- Privacy-sensitive safety: 13/13

## Category results

| Category | Passed | Total | Rate |
|---|---:|---:|---:|
| registrar-census | 30 | 30 | 100% |
| demographic-filters | 35 | 35 | 100% |
| filter-order-completeness | 25 | 25 | 100% |
| rankings-percentage-math | 34 | 35 | 97.1% |
| retention-persistence | 23 | 30 | 76.7% |
| capacity-course-outcomes | 23 | 25 | 92% |
| ipeds-data-quality | 22 | 25 | 88% |
| ambiguity-unsupported | 30 | 30 | 100% |
| privacy-hostile | 20 | 20 | 100% |
| provenance-confidence | 15 | 20 | 75% |
| compound-context-conflict | 10 | 10 | 100% |

## Failures

### 91. rankings-percentage-math

Question: Which single academic program carried the largest Fall 2025 census load?

Risk: `wrong-high-confidence`

- points [{"label":"BA English","value":2018,"display":"2,018"},{"label":"BA Psychology","value":2018,"display":"2,018"},{"label":"BBA Business Administration","value":2018,"display":"2,018"},{"label":"BS Biology","value":2018,"display":"2,018"},{"label":"BS Criminal Justice","value":2018,"display":"2,018"},{"label":"BS Education","value":2018,"display":"2,018"},{"label":"BS Mathematics","value":2018,"display":"2,018"}]; expected [{"label":"BA English","value":2018}]
- Actual headline: BA English has the largest matched enrollment at 2,018 students; 7 programs tie at that value.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: program | Time: 2025-2025 | Term: Fall 2025

### 127. retention-persistence

Question: State the institution-wide persistence-to-next-fall rate for 2023 entrants.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2023","value":77.6}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Time: 2023-2023

### 135. retention-persistence

Question: How did graduate persistence move across the 2021–2024 entering cohorts?

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2021","value":68.5},{"label":"2022","value":73.4},{"label":"2023","value":80.4},{"label":"2024","value":75.9}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Degree level: Graduate | Time: 2021-2024

### 140. retention-persistence

Question: Give the 2024 entering-cohort persistence rate for MS Nursing.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2024","value":70.3}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Program: MS Nursing | Degree level: Graduate | Time: 2024-2024

### 143. retention-persistence

Question: Chart Business Analytics next-fall persistence for cohorts 2020–2024.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2020","value":65.7},{"label":"2021","value":64.3},{"label":"2022","value":57.5},{"label":"2023","value":78.9},{"label":"2024","value":77.2}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Program: MS Business Analytics | Time: 2020-2024

### 145. retention-persistence

Question: State next-fall persistence for non-Pell 2024 entrants.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2024","value":78}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: pell eligible: Non-Pell | Time: 2024-2024

### 148. retention-persistence

Question: Trend Pell-eligible persistence for entering cohorts 2021–2024.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2021","value":71.7},{"label":"2022","value":72.1},{"label":"2023","value":76.8},{"label":"2024","value":79.2}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: pell eligible: Pell-eligible | Time: 2021-2024

### 154. retention-persistence

Question: How many percentage points separated Pell-eligible and non-Pell retention for 2024 entrants?

Risk: `wrong-high-confidence`

- answer missing "1.2"
- Actual headline: Pell-eligible retention is 1.1 percentage points higher than Non-Pell retention.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: pell eligible: Pell-eligible | pell eligible: Non-Pell | Group by: pell eligible | Time: 2024-2024

### 160. capacity-course-outcomes

Question: Which program consumes the greatest percentage of its scheduled seats?

Risk: `wrong-high-confidence`

- points [{"label":"MS Computer Science","value":96.86507936507937,"display":"97%"}]; expected [{"label":"MS Computer Science","value":96.9},{"label":"MS Business Analytics","value":92.1},{"label":"MS Nursing","value":90},{"label":"Master of Public Administration","value":80}]
- Actual headline: MS Computer Science has the highest matched utilization at 97%.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: program | Time: 2025-2025

### 164. capacity-course-outcomes

Question: Which program has the largest number of unfilled scheduled seats?

Risk: `wrong-high-confidence`

- points [{"label":"Master of Public Administration","value":336,"display":"336"}]; expected [{"label":"Master of Public Administration","value":336},{"label":"MS Nursing","value":192},{"label":"MS Business Analytics","value":171},{"label":"MS Computer Science","value":79}]
- Actual headline: Master of Public Administration has the highest matched available seats at 336.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: program | Time: 2025-2025

### 181. ipeds-data-quality

Question: What readiness percentage is attached to the newest IPEDS validation run?

Risk: `wrong-high-confidence`

- headline missing "NaN"
- sources missing "ipeds_validation_results.csv"
- Actual headline: Fall Enrollment is a modeled demo package, not a source-backed or keyholder-review-ready package.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Time: 2025-2025

### 187. ipeds-data-quality

Question: Give cabinet the latest IPEDS readiness result and whether work remains.

Risk: `wrong-high-confidence`

- answer missing "NaN"
- Actual headline: Current IPEDS coverage includes 1 source-backed package, 8 modeled demo packages, and 2 source gaps.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Time: 2025-2025

### 199. ipeds-data-quality

Question: Group open quality-record impact by source system.

Risk: `wrong-high-confidence`

- plan.groupBy "source_system"; expected "source"
- Actual headline: SIS degree history has the largest matched total at 211 affected records.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: source system

### 258. provenance-confidence

Question: Show overall 2024 retention with the numerator, denominator, and source tables.

Risk: `wrong-high-confidence`

- sources missing "retention_outcomes.csv"
- Actual headline: Institution-wide first-year retention is 78.4% for the 2024 cohort.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Time: 2024-2024

### 271. provenance-confidence

Question: Why did Computer Science enrollment rise from 2021 to 2025?

Risk: `safe-abstention`

- disposition limitation; expected answer
- points []; expected [{"label":"2021","value":475},{"label":"2022","value":510},{"label":"2023","value":560},{"label":"2024","value":600},{"label":"2025","value":678}]
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: Program: MS Computer Science | Time: 2021-2025

### 272. provenance-confidence

Question: What caused international enrollment to change after 2021?

Risk: `safe-abstention`

- disposition limitation; expected answer
- plan.startYear 2022; expected 2021
- points []; expected [{"label":"2021","value":6036},{"label":"2022","value":6223},{"label":"2023","value":6375},{"label":"2024","value":6512},{"label":"2025","value":6217}]
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: residency: International | Time: 2022-2025

### 274. provenance-confidence

Question: Why is MS Business Analytics closer to full capacity than MPA?

Risk: `safe-abstention`

- disposition limitation; expected answer
- answer missing one of ["cannot establish","does not establish","cannot determine","utilization"]
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: Program: MS Business Analytics | Degree level: Graduate | Time: 2025-2025

### 275. provenance-confidence

Question: What caused the Fall headcount quality anomaly?

Risk: `safe-abstention`

- disposition limitation; expected answer
- answer missing one of ["cannot establish","rule","YOY_HEADCOUNT_VARIANCE"]
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: none

