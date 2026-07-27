# EduInsight blind evaluation — preserved first run

- Date: 2026-07-27
- Command: `npm run eval:blind`
- Result: **55/100 passed**
- Policy: The 100 questions were sealed before execution. This report preserves the first and only blind run; the engine was not tuned to these failures before recording the result.

## Category results

| Category | Passed |
| --- | ---: |
| Paraphrase | 8/20 |
| Filter order | 9/10 |
| Negation | 0/10 |
| Boundary | 4/10 |
| Missing data | 4/10 |
| Hostile and compound | 9/15 |
| Presentation | 8/10 |
| Provenance and confidence | 8/10 |
| Consistency components | 5/5 |

## Failed cases

| ID | Category | Question | Primary failure |
| ---: | --- | --- | --- |
| 1 | Paraphrase | intl CS students 2025 | Ignored the international filter; returned all Computer Science students. |
| 2 | Paraphrase | how many comp sci students last fall | Did not resolve the program abbreviation or relative date; returned institutional total. |
| 3 | Paraphrase | grad enrollmnt since 21 | Typo/year shorthand was unsupported instead of resolving the graduate trend. |
| 4 | Paraphrase | did CS go up? | Returned a point-in-time count instead of clarifying the missing comparison period. |
| 8 | Paraphrase | show intl enrollment trend | Ignored the international filter. |
| 9 | Paraphrase | undergrad HC 2025 | Did not recognize the headcount abbreviation. |
| 10 | Paraphrase | masters enrolment since '21 | Ignored the master's scope and the quoted year shorthand. |
| 12 | Paraphrase | comp science students fall 2025 | Did not resolve the program phrase; returned institutional total. |
| 13 | Paraphrase | Which major is biggest? | Returned a limitation instead of clarifying the metric meant by “biggest.” |
| 14 | Paraphrase | enrolment 2025 | Did not recognize the spelling variation. |
| 15 | Paraphrase | how many foreign learners in 2025 | Did not resolve the residency synonym or enrollment intent. |
| 17 | Paraphrase | public admin headcount 2025 | Did not resolve the program name or headcount synonym. |
| 26 | Filter order | In 2025 how many Pell students were undergraduates? | Applied Pell but silently ignored the undergraduate filter. |
| 31 | Negation | Show students who are not international. | Reversed the meaning and returned international students. |
| 32 | Negation | Programs that did not grow since 2021. | Did not recognize the negative trend/ranking request. |
| 33 | Negation | Which programs are not above 90% capacity? | Applied the opposite threshold. |
| 34 | Negation | Retention for students who are not Pell eligible. | Applied Pell-eligible instead of non-Pell. |
| 35 | Negation | Enrollment excluding international students in 2025 | Applied international instead of domestic. |
| 36 | Negation | Show programs below or equal to 90% capacity | Included an above-threshold program. |
| 37 | Negation | Do not include graduate students: enrollment 2025 | Returned graduate instead of undergraduate enrollment. |
| 38 | Negation | Students other than Computer Science in 2025 | Returned Computer Science rather than excluding it. |
| 39 | Negation | IPEDS checks that did not pass | Returned the general passed/review summary instead of the non-passing checks. |
| 40 | Negation | Data quality issues that are not resolved | Interpreted the request as resolved/high-severity issues. |
| 41 | Boundary | Which programs are exactly 92% utilized? | Exact numeric utilization threshold was unsupported. |
| 43 | Boundary | Which programs are at least 86% utilized? | Inclusive lower-bound utilization was unsupported. |
| 44 | Boundary | Which programs are at most 53% utilized? | Inclusive upper-bound utilization was unsupported. |
| 48 | Boundary | Show enrollment before 2020 | Fell back to 2020 rather than returning no matching data. |
| 49 | Boundary | Show enrollment after 2025 | Fell back to 2025 rather than returning no matching data. |
| 50 | Boundary | Compare 2025 enrollment versus 2025 enrollment | Returned a zero change instead of flagging the degenerate comparison. |
| 52 | Missing data | What was the median student age in 2025? | Fell back to total enrollment although age is unavailable. |
| 54 | Missing data | Show enrollment by housing status. | Fell back to total enrollment although the dimension is unavailable. |
| 55 | Missing data | Show enrollment by citizenship. | Fell back to total enrollment although the dimension is unavailable. |
| 56 | Missing data | Show enrollment for campus North. | Ignored the unknown campus filter and returned total enrollment. |
| 57 | Missing data | Show Pharmacy enrollment in 2025. | Ignored the unknown program and returned total enrollment. |
| 58 | Missing data | Show high-severity IPEDS validation issues. | Returned readiness rather than rejecting the unsupported severity concept. |
| 65 | Hostile/compound | What was 2025 enrollment and which program grew the most since 2021? | Answered only the ranking without disclosing partial handling. |
| 66 | Hostile/compound | Show CS enrollment, capacity, and international percentage in 2025. | Answered only capacity without disclosing partial handling. |
| 67 | Hostile/compound | What about its retention? | Pretended to resolve an entity despite having no conversational context. |
| 70 | Hostile/compound | Why exactly? | Returned a generic limitation rather than requesting the missing referent/context. |
| 71 | Hostile/compound | Same question but for 2024 | Returned a generic limitation rather than requesting the missing prior question. |
| 74 | Hostile/compound | Are IPEDS checks ready and what was total enrollment in 2025? | Answered only the IPEDS portion without disclosing partial handling. |
| 79 | Presentation | Put Pell and non-Pell 2024 retention side by side | Produced a year axis and only one group rather than the requested subgroup comparison. |
| 82 | Presentation | International share of 2025 enrollment | Returned the international count instead of the percentage and denominator. |
| 92 | Provenance/confidence | Which program is strongest? | Returned a limitation rather than clarifying which definition of “strongest” to use. |
| 95 | Provenance/confidence | What was total enrollment in 2025 despite the open headcount anomaly? | Misrouted to data quality and did not lower confidence or disclose the anomaly. |

## Interpretation

The result is not evidence that the engine is generally reliable yet. It shows that exact known cases are much stronger than unseen language. The highest-priority defects are:

1. Negation and exclusion semantics.
2. Safe rejection of unknown dimensions and values.
3. Typo, abbreviation, synonym, and relative-date normalization.
4. Explicit handling of compound and context-dependent questions.
5. Numeric boundary operators and empty-range behavior.
6. Confidence labels that react to relevant unresolved anomalies.

