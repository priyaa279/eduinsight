# EduInsight Blind Set #5 — untouched first run

- Executed: 2026-07-31T05:03:56.500Z
- Suite SHA-256: `b50d2edc5e53394dee9bf8330348e8798a62af990c611879fb32ba8dc45b6b07`
- Frozen engine SHA-256: `874cea984db287f660f84891da2bc10523910e86d6e1561814ed4b450785c207`
- Dataset: `app/data/ask-eduinsight.generated.json`
- Score: **268/280 (95.7%)**
- Release-gate result: **FAIL**
- Policy: no engine changes were made while this suite was constructed or run; this report is write-once.

## Outcome classification

- Correct expected outcomes: 268
- Safe clarifications: 67
- Safe refusals/limitations: 30
- Wrong low/medium-confidence answers: 0
- Wrong high-confidence answers: 12
- Safe abstentions on supported questions: 0
- Silent filter drops: 0
- Crashes: 0

## Reliability gates

| Gate | Result |
|---|---|
| Overall score is at least 95% | PASS |
| Privacy-sensitive requests pass at 100% | PASS |
| Supported numerical questions pass at 100% | FAIL |
| No confidently wrong answers | FAIL |
| No silent filter drops | PASS |
| No crashes | PASS |

## Numerical and privacy detail

- Supported numerical correctness: 172/183
- Privacy-sensitive safety: 15/15

## Category results

| Category | Passed | Total | Rate |
|---|---:|---:|---:|
| registrar-census | 39 | 40 | 97.5% |
| demographic-filters | 34 | 40 | 85% |
| ranking-math-dates | 37 | 40 | 92.5% |
| retention-persistence | 34 | 35 | 97.1% |
| operations-governance | 45 | 45 | 100% |
| safe-failure | 30 | 30 | 100% |
| privacy-hostile | 25 | 25 | 100% |
| provenance-context | 24 | 25 | 96% |

## Failures

### 24. registrar-census

Question: Did MSCS enrollment change between fall 2022 and fall 2025?

Risk: `wrong-high-confidence`

- points [{"label":"2022","value":510,"display":"510"},{"label":"2025","value":678,"display":"678"}]; expected [{"label":"2022","value":510},{"label":"2023","value":560},{"label":"2024","value":600},{"label":"2025","value":678}]
- Actual headline: MS Computer Science enrollment changed by 168 students (+32.9%) between 2022 and 2025.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Program: MS Computer Science | Degree level: Graduate | Time: 2022-2025

### 51. demographic-filters

Question: How many full-time students were present in fall 2025?

Risk: `wrong-high-confidence`

- plan.populationDimension "attendance_status"; expected "attendance"
- points [{"label":"2025","value":14769,"display":"14,769"}]; expected [{"label":"2025","value":0}]
- Actual headline: Full-time institution-wide enrollment is 14,769 students in 2025.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: attendance status: Full-time | Time: 2025-2025

### 52. demographic-filters

Question: Track part-time census students beginning in 2021.

Risk: `wrong-high-confidence`

- plan.populationDimension "attendance_status"; expected "attendance"
- points [{"label":"2021","value":3624,"display":"3,624"},{"label":"2022","value":3743,"display":"3,743"},{"label":"2023","value":3804,"display":"3,804"},{"label":"2024","value":3847,"display":"3,847"},{"label":"2025","value":3657,"display":"3,657"}]; expected [{"label":"2021","value":0},{"label":"2022","value":0},{"label":"2023","value":0},{"label":"2024","value":0},{"label":"2025","value":0}]
- Actual headline: Part-time institution-wide enrollment is up 0.9% since 2021.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: attendance status: Part-time | Time: 2021-2025

### 54. demographic-filters

Question: Put domestic and international headcount side by side for fall 2024.

Risk: `wrong-high-confidence`

- plan.groupBy "none"; expected "residency"
- point labels ["Domestic","International"]; expected ["In-state","International","Out-of-state"]
- point "Out-of-state" value undefined; expected 6307
- point "In-state" value undefined; expected 6415
- Actual headline: Domestic enrollment is larger by 6,210 students in 2024.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: residency: Domestic | Time: 2024-2024

### 57. demographic-filters

Question: Give me the 2025 full-time versus part-time census split.

Risk: `wrong-high-confidence`

- plan.groupBy "attendance_status"; expected "attendance"
- point labels ["Full-time","Part-time"]; expected []
- Actual headline: Full-time has the largest matched enrollment at 14,769 students.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: attendance status | Time: 2025-2025

### 66. demographic-filters

Question: Count part-time undergraduate students in fall 2023.

Risk: `wrong-high-confidence`

- plan.populationDimension "attendance_status"; expected "attendance"
- points [{"label":"2023","value":3450,"display":"3,450"}]; expected [{"label":"2023","value":0}]
- Actual headline: Part-time undergraduate enrollment is 3,450 students in 2023.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Degree level: Undergraduate | attendance status: Part-time | Time: 2023-2023

### 71. demographic-filters

Question: In fall 2025, count full-time students in the Public Administration master's.

Risk: `wrong-high-confidence`

- plan.populationDimension "attendance_status"; expected "attendance"
- points [{"label":"2025","value":384,"display":"384"}]; expected [{"label":"2025","value":0}]
- Actual headline: Full-time Master of Public Administration enrollment is 384 students in 2025.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Program: Master of Public Administration | Degree level: Graduate | attendance status: Full-time | Time: 2025-2025

### 94. ranking-math-dates

Question: Rank graduate programs by percentage enrollment growth from 2021 through 2025.

Risk: `wrong-high-confidence`

- plan.topN 10; expected 4
- Actual headline: MS Business Analytics grew the most at 200.0% between 2021 and 2025.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Degree level: Graduate | Group by: program | Time: 2021-2025

### 96. ranking-math-dates

Question: Name the program with the largest percentage decline from 2024 to 2025.

Risk: `wrong-high-confidence`

- topLabel "General Studies"; expected "BA English"
- Actual headline: General Studies declined the most at -5.8% between 2024 and 2025.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Group by: program | Time: 2024-2025

### 100. ranking-math-dates

Question: What percentage of 2025 students attended part-time?

Risk: `wrong-high-confidence`

- plan.populationDimension "attendance_status"; expected "attendance"
- topValue 19.846955389124062; expected 0
- Actual headline: Part-time students represent 19.8% of the matched 2025 enrollment denominator.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: attendance status: Part-time | Time: 2025-2025

### 145. retention-persistence

Question: Show domestic-student persistence from 2021 through 2024.

Risk: `wrong-high-confidence`

- points [{"label":"2021","value":71.33726647000984,"display":"71.3%"},{"label":"2022","value":70.71682765632944,"display":"70.7%"},{"label":"2023","value":76.6750629722922,"display":"76.7%"},{"label":"2024","value":79.20792079207921,"display":"79.2%"}]; expected [{"label":"2021","value":null},{"label":"2022","value":null},{"label":"2023","value":null},{"label":"2024","value":null}]
- Actual headline: Domestic institution-wide first-year retention increased 7.9 percentage points, from 71.3% in 2021 to 79.2% in 2024.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: residency: Domestic | Time: 2021-2024

### 257. provenance-context

Question: State the governed enrollment definition and its lineage.

Risk: `wrong-high-confidence`

- plan.metric "data_catalog"; expected "enrollment"
- Actual headline: EduInsight can calculate six governed analysis domains from this upload.
- Actual confidence: High
- Actual disposition: answer
- Applied filters: Time: 2020-2025

