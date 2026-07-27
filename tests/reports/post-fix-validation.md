# EduInsight post-fix validation

- Date: 2026-07-27
- Known regression suite: **184/184**
- Former blind suite: **100/100**
- Adversarial/invariant suite: **25/25**
- Focused engine and rendered-HTML tests: **19/19**
- Browser smoke checks: **6/6**
- Production build: passed
- Lint: 0 errors, 6 unrelated unused-variable warnings

The preserved first-run blind score remains 55/100 in
`blind-first-run.md`. After that score was reported, the cases were promoted
to regression coverage and the engine was corrected. One oracle was also
corrected: “Pell retention versus everyone else” now compares Pell-eligible
students with the mutually exclusive non-Pell population, rather than with a
full cohort that still includes Pell-eligible students.

## Corrected behaviors

- Common abbreviations, misspellings, program synonyms, two-digit years, and
  “last fall” resolve without dropping filters.
- Negations and exclusions preserve their operator.
- Inclusive, exclusive, and exact capacity boundaries are calculated correctly.
- Unknown programs, dimensions, and out-of-range dates fail safely.
- Compound questions and context-dependent follow-ups request clarification.
- Duplicate aggregates, missing mappings, impossible retention records,
  enrollment above capacity, and zero denominators block publication.
- Relevant open anomalies reduce confidence and appear in the answer.
- Hostile instructions cannot override governed calculations or provenance.
