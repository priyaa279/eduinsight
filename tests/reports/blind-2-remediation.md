# EduInsight Blind Set #2 remediation

- Date: 2026-07-27
- Original untouched Blind Set #2 score: **84/180 (46.7%)**
- Post-remediation regression score: **180/180**
- Original sealed suite SHA-256:
  `16C0C92C6B826B5080BF38AAE17B5D59E26250DB57B3EE6BF1E990414F337734`
- Blind Set #3: **not created or run**

## Release-gate results

| Gate | Result |
| --- | ---: |
| Known Ask EduInsight regression | 184/184 |
| Previous blind set as regression | 100/100 |
| Blind Set #2 as post-remediation regression | 180/180 |
| Adversarial invariants | 25/25 |
| Systemic controlled-data and safety checks | 47/47 |
| Browser critical flows | 7/7 |
| Production build | Pass |
| Lint | 0 errors; 6 pre-existing warnings |

## Remediated behavior

1. Central language normalization handles supported abbreviations, common
   typos, institutional synonyms, colloquial time phrases, and cautious
   program aliases before semantic resolution.
2. Count, percentage, rate, percentage-point difference, growth, and
   utilization intent is represented before calculation.
3. The query plan records detected and applied filters. Unavailable
   cross-tabulations and incomplete filter application fail closed.
4. Vague, contextual, compound, and contradictory requests clarify instead
   of silently defaulting to enrollment.
5. Individual, named, row-level, and personally identifiable requests are
   blocked before external planning and again at deterministic execution.
6. Confidence now reflects query resolution, data freshness/completeness,
   relevant open quality issues, and calculation validity.
7. Zero denominators, unknown categories, stale uploads, mapping gaps, and
   schedule contradictions cannot receive an unqualified High label.
8. Flat, increasing, and decreasing narratives use consistent direction
   language.
9. The interface renders structured disposition, filter audit, confidence
   checks, sources, limitations, and no-chart clarification/limitation states.

## Interpretation

Every known defect from Blind Set #2, the systemic suite, and the original
browser smoke test is now covered and passing. This proves remediation of the
known cases, not generalization to unseen language. The next unbiased
reliability measurement remains a separately sealed Blind Set #3, which should
only be created when the team is ready for the next evaluation phase.
