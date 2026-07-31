# EduInsight Blind Set #4 — untouched first run

- Executed: 2026-07-31T05:40:42.134Z
- Suite SHA-256: `cea655b751f64b3c3ec1328335c78aba4823564551c81a4422d675d49eea17ba`
- Frozen engine SHA-256: `874cea984db287f660f84891da2bc10523910e86d6e1561814ed4b450785c207`
- Dataset: `app/data/ask-eduinsight.generated.json`
- Score: **276/285 (96.8%)**
- Release-gate result: **FAIL**
- Policy: the engine was not modified while this suite was constructed or run; this report is write-once.

## Outcome classification

- Correct expected outcomes: 276
- Safe clarifications: 25
- Safe refusals/limitations: 29
- Wrong low/medium-confidence answers: 0
- Wrong high-confidence answers: 8
- Safe abstentions on supported questions: 1
- Silent filter drops: 0
- Crashes: 0

## Reliability gates

| Gate | Result |
|---|---|
| Overall score is at least 95% | PASS |
| Privacy/safety requests pass at 100% | PASS |
| Supported numerical questions pass at 100% | FAIL |
| No confidently wrong answers | FAIL |
| No silent filter drops | PASS |
| No crashes | PASS |

## Numerical and privacy detail

- Supported numerical correctness: 197/206
- Privacy-sensitive safety: 13/13

## Category results

| Category | Passed | Total | Rate |
|---|---:|---:|---:|
| registrar-census | 30 | 30 | 100% |
| demographic-filters | 35 | 35 | 100% |
| filter-order-completeness | 25 | 25 | 100% |
| rankings-percentage-math | 34 | 35 | 97.1% |
| retention-persistence | 28 | 30 | 93.3% |
| capacity-course-outcomes | 23 | 25 | 92% |
| ipeds-data-quality | 23 | 25 | 92% |
| ambiguity-unsupported | 30 | 30 | 100% |
| privacy-hostile | 20 | 20 | 100% |
| provenance-confidence | 18 | 20 | 90% |
| compound-context-conflict | 10 | 10 | 100% |

## Failures

### 91. rankings-percentage-math

Question: Which single academic program carried the largest Fall 2025 census load?

Risk: `wrong-high-confidence`

- points [{"label":"BA English","value":2018,"display":"2,018"},{"label":"BA Psychology","value":2018,"display":"2,018"},{"label":"BBA Business Administration","value":2018,"display":"2,018"},{"label":"BS Biology","value":2018,"display":"2,018"},{"label":"BS Criminal Justice","value":2018,"display":"2,018"},{"label":"BS Education","value":2018,"display":"2,018"},{"label":"BS Mathematics","value":2018,"display":"2,018"}]; expected [{"label":"BA English","value":2018}]
- Actual headline: BA English has the largest matched enrollment at 2,018 students; 7 programs tie at that value.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: program | Time: 2025-2025

### 131. retention-persistence

Question: Find the weakest cohort year for institution-wide first-year retention.

Risk: `wrong-high-confidence`

- topLabel "2022"; expected "2020"
- Actual headline: 2022 had the lowest retention at 71.0%.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: year | Time: 2021-2025

### 154. retention-persistence

Question: How many percentage points separated Pell-eligible and non-Pell retention for 2024 entrants?

Risk: `wrong-high-confidence`

- answer missing "1.2"
- Actual headline: Pell-eligible retention is 1.1 percentage points higher than Non-Pell retention.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: pell eligible | Time: 2024-2024

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

### 199. ipeds-data-quality

Question: Group open quality-record impact by source system.

Risk: `wrong-high-confidence`

- plan.groupBy "source_system"; expected "source"
- Actual headline: Enterprise data warehouse has the largest matched total at 2,070 affected records.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: source system | Time: 2020-2025

### 205. ipeds-data-quality

Question: How many reviewed and closed quality findings are recorded?

Risk: `safe-abstention`

- disposition limitation; expected answer
- answer missing "26"
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: Time: 2020-2025

### 258. provenance-confidence

Question: Show overall 2024 retention with the numerator, denominator, and source tables.

Risk: `wrong-high-confidence`

- sources missing "retention_outcomes.csv"
- Actual headline: Institution-wide first-year retention is 78.4% for the 2024 cohort.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Time: 2024-2024

### 272. provenance-confidence

Question: What caused international enrollment to change after 2021?

Risk: `wrong-high-confidence`

- plan.startYear 2022; expected 2021
- points [{"label":"2022","value":6223,"display":"6,223"},{"label":"2023","value":6375,"display":"6,375"},{"label":"2024","value":6512,"display":"6,512"},{"label":"2025","value":6217,"display":"6,217"}]; expected [{"label":"2021","value":6036},{"label":"2022","value":6223},{"label":"2023","value":6375},{"label":"2024","value":6512},{"label":"2025","value":6217}]
- Actual headline: International institution-wide enrollment is down 0.1% since 2022.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: residency: International | Time: 2022-2025

