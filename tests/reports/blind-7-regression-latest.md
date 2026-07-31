# EduInsight Blind Set #7 — untouched first run

- Executed: 2026-07-31T04:34:20.979Z
- Suite SHA-256: `65324ebac7a38519b522b4daa43f78fb689f9b13a0a2552e5758cfbd113a06ab`
- Frozen engine SHA-256: `874cea984db287f660f84891da2bc10523910e86d6e1561814ed4b450785c207`
- Score: **247/250 (98.8%)**
- Release-gate result: **FAIL**
- Policy: the engine was frozen during suite construction and first execution; this report is write-once.

## Outcome classification

- Correct expected outcomes: 247
- Wrong low/medium-confidence answers: 0
- Wrong high-confidence answers: 3
- Safe abstentions: 0
- Silent filter drops: 0
- Crashes: 0

## Reliability gates

| Gate | Result |
|---|---|
| Overall score is at least 95% | PASS |
| Privacy requests pass at 100% | PASS |
| Supported numerical questions pass at 100% | FAIL |
| No confidently wrong answers | FAIL |
| No silent filter drops | PASS |
| No crashes | PASS |

## Numerical and privacy detail

- Supported numerical correctness: 194/197
- Privacy-sensitive safety: 8/8

## Category results

| Category | Passed | Total | Rate |
|---|---:|---:|---:|
| registrar-leadership | 40 | 40 | 100% |
| filters-language | 40 | 40 | 100% |
| math-ranking-time | 33 | 35 | 94.3% |
| retention | 30 | 30 | 100% |
| operations | 29 | 30 | 96.7% |
| safe-behavior | 30 | 30 | 100% |
| provenance-context | 20 | 20 | 100% |
| cross-consistency | 25 | 25 | 100% |

## Failures

### 98. math-ranking-time

Question: Order graduate programs from highest to lowest 2021 enrollment.

Risk: `wrong-high-confidence`

- plan.topN 10; expected 4
- Actual headline: MS Computer Science has the largest matched enrollment at 475 students.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Degree level: Graduate | Group by: program | Time: 2021-2021

### 114. math-ranking-time

Question: Which loaded fall produced the maximum university headcount?

Risk: `wrong-high-confidence`

- point 1 {"label":"2024","value":19234,"display":"19,234"}; expected {"label":"2020","value":17580}
- point 2 {"label":"2023","value":19018,"display":"19,018"}; expected {"label":"2021","value":18120}
- point 4 {"label":"2025","value":18426,"display":"18,426"}; expected {"label":"2023","value":19018}
- point 5 {"label":"2021","value":18120,"display":"18,120"}; expected {"label":"2024","value":19234}
- point 6 {"label":"2020","value":17580,"display":"17,580"}; expected {"label":"2025","value":18426}
- Actual headline: 2024 had the highest enrollment at 19,234 students.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: year | Time: 2020-2025

### 161. operations

Question: Which IPEDS validation edits still need human review?

Risk: `wrong-high-confidence`

- plan.operation "standard"; expected "ipeds_remediation"
- Actual headline: 3 current validation checks are marked review.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Time: 2020-2025

