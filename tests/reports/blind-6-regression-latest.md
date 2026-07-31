# EduInsight Blind Set #6 — untouched first run

- Executed: 2026-07-31T05:17:51.795Z
- Suite SHA-256: `4ba6a86b4270d07b32671425342b2104d36cf06642d263031857c9c6ffaceec5`
- Frozen engine SHA-256: `874cea984db287f660f84891da2bc10523910e86d6e1561814ed4b450785c207`
- Score: **259/260 (99.6%)**
- Release-gate result: **FAIL**
- Policy: the engine was frozen during suite construction and first execution; this report is write-once.

## Outcome classification

- Correct expected outcomes: 259
- Wrong low/medium-confidence answers: 0
- Wrong high-confidence answers: 1
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

- Supported numerical correctness: 183/184
- Privacy-sensitive safety: 10/10

## Category results

| Category | Passed | Total | Rate |
|---|---:|---:|---:|
| executive-language | 39 | 40 | 97.5% |
| messy-unseen | 35 | 35 | 100% |
| filter-completeness | 35 | 35 | 100% |
| math-time-ranking | 35 | 35 | 100% |
| retention-generalization | 30 | 30 | 100% |
| operational-domains | 35 | 35 | 100% |
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

