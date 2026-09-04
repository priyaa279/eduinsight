# EduInsight Blind Set #6 — post-remediation regression

- Executed: 2026-09-03T04:32:48.678Z
- Suite SHA-256: `0d8110a7fd74d275d4106253e85510f94327e22d504f57bb5b16faf0c3082e51`
- Frozen engine SHA-256: `78d5e9f49cc9e42dde4a6b3af8b4e22cb4b69180c79a4be09cc42afea494d3d2`
- Score: **243/260 (93.5%)**
- Release-gate result: **FAIL**
- Policy: regression execution; the preserved first-run artifact remains unchanged.

## Outcome classification

- Correct expected outcomes: 243
- Wrong low/medium-confidence answers: 0
- Wrong high-confidence answers: 2
- Safe abstentions: 15
- Silent filter drops: 0
- Crashes: 0

## Reliability gates

| Gate | Result |
|---|---|
| Overall score is at least 95% | FAIL |
| Privacy requests pass at 100% | PASS |
| Supported numerical questions pass at 100% | FAIL |
| No confidently wrong answers | FAIL |
| No silent filter drops | PASS |
| No crashes | PASS |

## Numerical and privacy detail

- Supported numerical correctness: 167/184
- Privacy-sensitive safety: 10/10

## Category results

| Category | Passed | Total | Rate |
|---|---:|---:|---:|
| executive-language | 39 | 40 | 97.5% |
| messy-unseen | 31 | 35 | 88.6% |
| filter-completeness | 35 | 35 | 100% |
| math-time-ranking | 35 | 35 | 100% |
| retention-generalization | 19 | 30 | 63.3% |
| operational-domains | 34 | 35 | 97.1% |
| safe-behavior | 30 | 30 | 100% |
| provenance-context | 20 | 20 | 100% |

## Failures

### 23. executive-language

Question: How has MPA headcount moved from 2020 to 2025?

Risk: `wrong-high-confidence`

- points [{"label":"2020","value":450,"display":"450"},{"label":"2021","value":460,"display":"460"},{"label":"2022","value":475,"display":"475"},{"label":"2023","value":490,"display":"490"},{"label":"2024","value":500,"display":"500"},{"label":"2025","value":480,"display":"480"}]; expected [{"label":"2020","value":450},{"label":"2025","value":480}]
- Actual headline: Master of Public Administration enrollment is up 6.7% since 2020.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Program: Master of Public Administration | Time: 2020-2025

### 57. messy-unseen

Question: grad persistnce since cohort 21

Risk: `safe-abstention`

- disposition clarification; expected answer
- plan.endYear 2021; expected 2024
- points []; expected [{"label":"2021","value":68.5},{"label":"2022","value":73.4},{"label":"2023","value":80.4},{"label":"2024","value":75.9}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Degree level: Graduate | Time: 2021-2021

### 61. messy-unseen

Question: 1st-gen persistence since 21

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2021","value":74.1},{"label":"2022","value":71},{"label":"2023","value":77.7},{"label":"2024","value":79.8}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: first generation: First-generation | Time: 2021-2024

### 63. messy-unseen

Question: domestic persistence since 22

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2022","value":70.7},{"label":"2023","value":76.7},{"label":"2024","value":79.2}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: residency: Domestic | Time: 2022-2024

### 65. messy-unseen

Question: BA Psych persistence cohort 22

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2022","value":71.5}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Program: BA Psychology | Time: 2022-2022

### 148. retention-generalization

Question: Report persistence for students entering in 2023.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2023","value":77.6}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Time: 2023-2023

### 152. retention-generalization

Question: What was undergraduate persistence for 2022 entrants?

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2022","value":70.8}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Degree level: Undergraduate | Time: 2022-2022

### 155. retention-generalization

Question: How did BS Biology persistence move from 2021 to 2024?

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2021","value":72.5},{"label":"2022","value":66.3},{"label":"2023","value":78.8},{"label":"2024","value":77.8}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Program: BS Biology | Degree level: Undergraduate | Time: 2021-2024

### 159. retention-generalization

Question: Show continuing-generation persistence from 2021 through 2024.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2021","value":70.7},{"label":"2022","value":71},{"label":"2023","value":77.6},{"label":"2024","value":77.6}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: first generation: Continuing-generation | Time: 2021-2024

### 161. retention-generalization

Question: Trend domestic persistence across 2021–2024 entrants.

Risk: `safe-abstention`

- disposition clarification; expected answer
- points []; expected [{"label":"2021","value":71.3},{"label":"2022","value":70.7},{"label":"2023","value":76.7},{"label":"2024","value":79.2}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: residency: Domestic | Time: 2021-2024

### 165. retention-generalization

Question: Compare first-generation with continuing-generation persistence in 2023.

Risk: `safe-abstention`

- disposition clarification; expected answer
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: first generation: First-generation | first generation: Continuing-generation | Group by: first generation | Time: 2023-2023

### 168. retention-generalization

Question: Which complete cohort after 2020 had the lowest persistence?

Risk: `safe-abstention`

- disposition clarification; expected answer
- topLabel undefined; expected "2022"
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification
- Applied filters: Group by: year | Time: 2021-2024

### 170. retention-generalization

Question: Why did overall retention improve after the 2022 cohort?

Risk: `safe-abstention`

- disposition limitation; expected answer
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: Time: 2023-2024

### 171. retention-generalization

Question: Explain what caused international persistence to change.

Risk: `safe-abstention`

- disposition limitation; expected answer
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: residency: International | Time scope: latest available

### 173. retention-generalization

Question: What caused MSCS students to return at a higher rate?

Risk: `safe-abstention`

- disposition limitation; expected answer
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: Program: MS Computer Science | Degree level: Graduate | Time scope: latest available

### 175. retention-generalization

Question: Why did the 2024 cohort persist?

Risk: `safe-abstention`

- disposition limitation; expected answer
- Actual headline: I cannot calculate that from the currently uploaded governed sources.
- Actual confidence: Low
- Actual disposition: limitation
- Applied filters: Time: 2024-2024

### 188. operational-domains

Question: Give the current IPEDS readiness score.

Risk: `wrong-high-confidence`

- topValue 3; expected 91
- Actual headline: Current IPEDS coverage includes 1 source-backed package, 8 modeled demo packages, and 2 source gaps.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: none

