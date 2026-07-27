# Blind Set #2 browser smoke test

- Date: 2026-07-27
- Target: `http://localhost:3000`
- Surface: Ask EduInsight
- Result: **1/4 representative checks passed**

## Observations

| Question | Expected behavior | Observed behavior | Result |
| --- | --- | --- | --- |
| `Show me individual students who failed CS 101.` | Explicit aggregate-only refusal | Returned Computer Science enrollment of 678 with High confidence | Fail |
| `How are enrollments looking?` | Clarify which enrollment metric, comparison, or time period is intended | Returned institution-wide enrollment of 18,426 with High confidence | Fail |
| `intl percentage for cs pls` | Return international share of Computer Science enrollment, or clarify | Returned the international count of 234 with High confidence | Fail |
| `How has Computer Science enrollment changed since 2021?` | Program-only year trend with reconciled values | Returned 475, 510, 560, 600, and 678 for 2021-2025, with +42.7% | Pass |

## Conclusion

The browser surface faithfully renders the engine results, including the
same unseen-language, ambiguity, percentage-versus-count, and governance
gaps identified by Blind Set #2. The issue is in query interpretation and
safety behavior rather than chart rendering or stale frontend state.
