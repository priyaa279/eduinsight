# EduInsight Blind Set #3 — post-remediation regression

- Executed: 2026-09-03T04:32:44.734Z
- Suite SHA-256: `034f4ec5fe6cf4ad98af10a7017c088d87d027ce690c4084da9072169487d30b`
- Dataset: `app/data/ask-eduinsight.generated.json`
- Score: **238/250 (95.2%)**
- Policy: regression execution; the preserved first-run artifact remains unchanged.

## Category results

| Category | Passed | Total | Rate |
|---|---:|---:|---:|
| registrar-language | 30 | 30 | 100% |
| leadership-operations | 26 | 30 | 86.7% |
| aid-student-success | 24 | 25 | 96% |
| messy-language | 28 | 30 | 93.3% |
| filter-order | 25 | 25 | 100% |
| ambiguity-compound-context | 25 | 25 | 100% |
| governance-hostile | 25 | 25 | 100% |
| temporal-ranking-math | 30 | 30 | 100% |
| provenance-confidence | 19 | 20 | 95% |
| impossible-conflicting | 6 | 10 | 60% |

## Failure-risk breakdown

- Safe abstentions: 52
- Unsafe semantic answers: 4
- Engine crashes: 0
- Presentation/provenance mismatches: 0
- Safe rejection-type mismatches: 4

## Failures

### 32. leadership-operations

Question: How much instructional seat room remains for Computer Science?

Risk: `unsafe-semantic`

- points [{"label":"Computer Science","value":79,"display":"79"}]; expected [{"label":"MS Computer Science","value":79}]
- Actual headline: Computer Science has the highest matched available seats at 79.
- Actual confidence: High
- Actual disposition: answer

### 41. leadership-operations

Question: What was the institution's first-to-second-fall persistence rate for the 2024 entering cohort?

Risk: `safe-abstention`

- points []; expected [{"label":"2024","value":78.4}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification

### 48. leadership-operations

Question: For 2024 entrants, compare first-generation persistence against continuing-generation persistence.

Risk: `safe-abstention`

- point labels []; expected ["Continuing-generation","First-generation"]
- point "First-generation" value undefined; expected 79.8
- point "Continuing-generation" value undefined; expected 77.6
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification

### 51. leadership-operations

Question: Give cabinet the current Fall Enrollment IPEDS readiness score.

Risk: `unsafe-semantic`

- headline missing "NaN%"
- Actual headline: Fall Enrollment is a modeled demo package, not a source-backed or keyholder-review-ready package.
- Actual confidence: High
- Actual disposition: answer

### 70. aid-student-success

Question: How many percentage points separated Pell and non-Pell retention in 2024?

Risk: `unsafe-semantic`

- answer missing "1.2"
- Actual headline: Pell-eligible retention is 1.1 percentage points higher than Non-Pell retention.
- Actual confidence: High
- Actual disposition: answer

### 93. messy-language

Question: 1st gen persistnce, cohort 24

Risk: `safe-abstention`

- points []; expected [{"label":"2024","value":79.8}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification

### 102. messy-language

Question: m.s. persistence cohort 2024

Risk: `safe-abstention`

- points []; expected [{"label":"2024","value":76.6}]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification

### 225. provenance-confidence

Question: Show current IPEDS readiness and cite only relevant validation evidence.

Risk: `unsafe-semantic`

- headline missing "91%"
- sources missing "ipeds_validation_results.csv"
- Actual headline: Current IPEDS coverage includes 1 source-backed package, 8 modeled demo packages, and 2 source gaps.
- Actual confidence: High
- Actual disposition: answer

### 246. impossible-conflicting

Question: Show undergraduate MS enrollment.

Risk: `safe-rejection-mismatch`

- disposition clarification; expected limitation
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification

### 247. impossible-conflicting

Question: Count BS graduate students in 2025.

Risk: `safe-rejection-mismatch`

- disposition clarification; expected limitation
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification

### 248. impossible-conflicting

Question: How many students were both domestic and international?

Risk: `safe-rejection-mismatch`

- disposition clarification; expected limitation
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification

### 249. impossible-conflicting

Question: Return only Pell and non-Pell students who are Pell eligible.

Risk: `safe-rejection-mismatch`

- disposition clarification; expected limitation
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual disposition: clarification

