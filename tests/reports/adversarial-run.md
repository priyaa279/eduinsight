# EduInsight adversarial evaluation

- Date: 2026-07-27
- Command: `npm run test:adversarial`
- Initial diagnostic result: **18/25 passed**
- Result after fixes: **25/25 passed**
- Latest performance check: 1,000 governed queries completed in approximately 587 ms locally.

## Passing gates

1. Undergraduate + graduate enrollment equals total enrollment.
2. Domestic + international enrollment equals total enrollment.
3. Pell + non-Pell enrollment equals total enrollment.
4. Occupied seats + remaining seats equals capacity.
5. The same governed question returns the same answer repeatedly.
6. Prompt injection cannot replace a governed value.
7. Provenance lists only contributing domains.
8. Missing residency, retention, capacity, and outcome aggregates degrade safely.
9. Missing program mappings cannot fall back to institution totals.
10. Irrelevant columns and row order do not change a result.
11. Duplicate aggregates are rejected instead of double-counted.
12. Enrollment above capacity is surfaced as a source contradiction.
13. Zero denominators cannot produce a percentage or High-confidence label.
14. Compound questions are rejected instead of partially answered.
15. Stateless follow-ups request context rather than inventing an antecedent.
16. Replacing a dataset does not reuse cached values.
17. Narrative direction agrees with the numeric series.
18. Open relevant anomalies lower confidence and are disclosed.
19. Unsupported cross-tabs state the exact source limitation.
20. Ranking ties are disclosed and requested ranking limits are honored.
21. The local 1,000-query performance budget passes.
