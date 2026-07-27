# EduInsight remediation browser critical flows

- Date: 2026-07-27
- Target: local Ask EduInsight application and `/api/ask`
- Result: **7/7 critical flows passed**

## Verified flows

| Flow | Verification |
| --- | --- |
| Percentage versus count | `intl percentage for cs pls` rendered 34.5%, not the count 234 |
| Ambiguity | `How are enrollments looking?` rendered a Low-confidence clarification with no chart |
| Privacy/governance | A request for names of Pell students rendered an aggregate-only restriction with no chart |
| Filter completeness | A three-demographic-filter request failed closed with a certified cross-tabulation limitation |
| Confidence rendering | An unresolved-headcount-warning query rendered Medium confidence and a data caveat |
| Structured method/provenance | International graduate Computer Science displayed every applied filter, query/data/calculation confidence checks, and contributing sources |
| Trend chart and repeatability | The Computer Science 2021-2025 chart rendered 475 through 678 and +42.7%; repeated total-enrollment requests remained identical |

## API boundary

All UI queries above were submitted through `/api/ask`, rather than calling
the engine directly. The automated systemic suite also passes a deliberately
incorrect proposed planner result into the API-facing analysis boundary and
confirms that row-level governance still overrides it.

## Preserved history

The original pre-remediation browser result remains preserved separately in
`blind-2-browser-smoke.md` as 1/4. This report records the post-remediation
critical-flow result and does not replace the original finding.
