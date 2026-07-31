# EduInsight Blind Set #3 — untouched first run

- Executed: 2026-07-31T03:45:58.744Z
- Suite SHA-256: `a8e40c04c8fbed99c9149d1ed660873c26a70af2645ceb61316da01e338cb6d9`
- Dataset: `app/data/ask-eduinsight.generated.json`
- Score: **244/250 (97.6%)**
- Policy: one execution only; no engine remediation or rerun occurred before this result was preserved.

## Category results

| Category | Passed | Total | Rate |
|---|---:|---:|---:|
| registrar-language | 30 | 30 | 100% |
| leadership-operations | 29 | 30 | 96.7% |
| aid-student-success | 24 | 25 | 96% |
| messy-language | 30 | 30 | 100% |
| filter-order | 25 | 25 | 100% |
| ambiguity-compound-context | 25 | 25 | 100% |
| governance-hostile | 25 | 25 | 100% |
| temporal-ranking-math | 30 | 30 | 100% |
| provenance-confidence | 20 | 20 | 100% |
| impossible-conflicting | 6 | 10 | 60% |

## Failure-risk breakdown

- Safe abstentions: 49
- Unsafe semantic answers: 2
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

### 70. aid-student-success

Question: How many percentage points separated Pell and non-Pell retention in 2024?

Risk: `unsafe-semantic`

- answer missing "1.2"
- Actual headline: Pell-eligible retention is 1.1 percentage points higher than Non-Pell retention.
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

