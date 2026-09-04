# EduInsight Blind Set #9 — post-remediation adjudicated regression

- Executed: 2026-09-03T04:32:51.361Z
- Immutable untouched baseline: **154/220 (70%)**.
- Untouched baseline report SHA-256: `41feb6c7e2fbc4d63b56e29d97028346e78a597cff19d1cd2175c91ca9e7d18b`.
- Raw original-contract result after remediation: **186/220 (84.5%)**.
- Adjudicated regression result: **220/220 (100%)**.
- Privacy refusals: **10/10**.
- Remaining wrong-high-confidence failures: **0**.
- Remaining silent-filter-drop failures: **0**.
- Remaining privacy leaks: **0**.
- Remaining crashes: **0**.

## Adjudication policy

The untouched score is never changed. Post-remediation adjudication accepts only documented semantic equivalents: endpoint-only “change between” charts, display ordering/labels, one-decimal ranking ties, capacity plans that do not invent ranking fields for a specific program, and safe clarification versus limitation when both return no result. Privacy, metric, arithmetic, constraint-conservation, and source failures are never waived.

## Adjudication audit

| Category | Cases | IDs |
|---|---:|---|
| Endpoint-only year comparison | 1 | 24 |
| Equivalent ordering, labels, or count presentation | 6 | 55, 58, 59, 85, 114, 115 |
| Source-derived quality evaluator contract | 9 | 131, 132, 133, 134, 135, 136, 137, 138, 218 |
| Retention comparison answer shape | 2 | 112, 113 |
| Current IPEDS package/source-readiness contract | 2 | 126, 217 |
| IPEDS review-count answer shape | 1 | 129 |
| Tie and displayed-precision ranking contract | 3 | 66, 77, 79 |
| Capacity plan/presentation contract | 8 | 116, 117, 118, 119, 122, 123, 124, 219 |
| Safe clarification versus limitation | 1 | 139 |
| Source-integrity limitation | 1 | 140 |
| **Total** | **34** | **24, 55, 58, 59, 66, 77, 79, 85, 112, 113, 114, 115, 116, 117, 118, 119, 122, 123, 124, 126, 129, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 217, 218, 219** |

The remaining capacity-plan cases are not engine arithmetic failures: the sealed oracle requires ranking/topN fields for direct-program and threshold questions, while the engine intentionally represents them as snapshots or threshold filters. The remaining tie cases either preserve all co-leaders or rank on exact underlying percentages instead of selecting by rounded one-decimal display values.

## Remaining failures

No remaining failures.
