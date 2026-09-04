# EduInsight Blind Set #7 — post-remediation regression

- Executed: 2026-09-03T04:32:49.928Z
- Suite SHA-256: `65324ebac7a38519b522b4daa43f78fb689f9b13a0a2552e5758cfbd113a06ab`
- Frozen engine SHA-256: `78d5e9f49cc9e42dde4a6b3af8b4e22cb4b69180c79a4be09cc42afea494d3d2`
- Score: **240/250 (96%)**
- Release-gate result: **FAIL**
- Policy: regression execution; the preserved first-run artifact remains unchanged.

## Outcome classification

- Correct expected outcomes: 240
- Wrong low/medium-confidence answers: 0
- Wrong high-confidence answers: 2
- Safe abstentions: 8
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

- Supported numerical correctness: 187/197
- Privacy-sensitive safety: 8/8

## Category results

| Category | Passed | Total | Rate |
|---|---:|---:|---:|
| registrar-leadership | 40 | 40 | 100% |
| filters-language | 40 | 40 | 100% |
| math-ranking-time | 34 | 35 | 97.1% |
| retention | 24 | 30 | 80% |
| operations | 29 | 30 | 96.7% |
| safe-behavior | 30 | 30 | 100% |
| provenance-context | 18 | 20 | 90% |
| cross-consistency | 25 | 25 | 100% |

## Failures

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
- Applied filters: Group by: year | Time scope: latest available

### 129. retention

Question: State overall persistence for the Fall 2022 starter cohort.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points length 0; expected 1
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Time: 2022-2022 | Term: Fall 2022

### 135. retention

Question: Show domestic persistence for the 2023 cohort.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points length 0; expected 1
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: residency: Domestic | Time: 2023-2023

### 138. retention

Question: First-gen persistence for the 2021 starter group.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points length 0; expected 1
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: first generation: First-generation | Time: 2021-2021

### 140. retention

Question: International graduate persistence in the 2023 cohort.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points length 0; expected 1
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Degree level: Graduate | residency: International | Time: 2023-2023

### 143. retention

Question: Contrast first-gen with continuing-gen persistence for cohort 2023.

Risk: `safe-abstention`

- disposition clarification; expected answer
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: first generation: First-generation | first generation: Continuing-generation | Group by: first generation | Time: 2023-2023

### 144. retention

Question: Which completed cohort year had the strongest overall persistence?

Risk: `safe-abstention`

- disposition clarification; expected answer
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Group by: year | Cohorts: all available

### 160. operations

Question: What is the current Fall Enrollment IPEDS readiness percentage?

Risk: `wrong-high-confidence`

- plan.operation "ipeds_package_readiness"; expected "standard"
- Actual headline: Fall Enrollment is a modeled demo package, not a source-backed or keyholder-review-ready package.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: none

### 212. provenance-context

Question: Why did MS Computer Science enrollment rise after 2021?

Risk: `safe-abstention`

- disposition limitation; expected answer
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: Program: MS Computer Science | Degree level: Graduate | Time: 2022-2025

### 213. provenance-context

Question: What caused international enrollment to change?

Risk: `safe-abstention`

- disposition limitation; expected answer
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: residency: International | Time scope: latest available

