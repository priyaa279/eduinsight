# EduInsight systemic evaluation - first run

- Date: 2026-07-27
- Cases: 44
- Command: `npm run test:systemic`
- Result: **36/44 passed (81.8%)**
- Scope: controlled numeric fixtures, mutation safety, cross-answer
  reconciliation, narrative and chart contracts, confidence, provenance,
  aggregate-only governance, and a second synthetic university.
- Policy: these results were recorded before making engine changes in
  response to Blind Set #2 or this systemic evaluation.

## Area results

| Area | Passed |
| --- | ---: |
| Controlled numeric fixture and thresholds | 8/8 |
| Data mutation safety | 3/5 |
| Cross-answer reconciliation | 7/8 |
| Narrative correctness | 2/3 |
| Chart contracts | 3/3 |
| Confidence behavior | 1/3 |
| Provenance integrity | 3/3 |
| Aggregate-only governance | 0/2 |
| Second-university isolation | 8/8 |

## Confirmed strengths

1. A controlled Computer Science fixture returned exactly 500 students,
   250 international students, 50.0%, zero remaining seats, and 100%
   utilization.
2. `above 100%`, `at least 100%`, and `exactly 100%` applied the correct
   mathematical boundaries.
3. Duplicate aggregate rows did not inflate enrollment totals.
4. Missing program mappings blocked both institution-level and
   program-level publication.
5. Enrollment above capacity surfaced a contradiction.
6. Graduate plus undergraduate, international plus domestic, Pell plus
   non-Pell, residency categories, program totals, IPEDS statuses, and
   capacity components reconciled.
7. Requested chart dimensions, sorted top-five output, and tested source
   lists were correct.
8. A structurally different Redwood State dataset produced its own values,
   discovered its own programs, resolved its latest year as 2026, and did
   not leak Atlas Valley values when datasets alternated.

## Eight failed behaviors

1. **Zero capacity confidence:** a zero-seat program did not emit `NaN` or
   `Infinity`, but the answer was still labeled High confidence. It should
   be treated as unavailable or low confidence.
2. **Missing residency confidence:** records with missing residency were
   not counted as Domestic, but the resulting incomplete residency answer
   was still labeled High confidence.
3. **First-generation reconciliation:** first-generation enrollment
   returned 6,637, while the equivalent continuing-generation query was
   unsupported. The complementary pair therefore could not reconcile to
   18,426.
4. **Flat-trend narrative:** a 600 to 600 series was described as
   `up 0.0%` instead of stable, flat, or unchanged.
5. **Stale-data confidence:** making every uploaded source 18 months old
   did not lower High confidence.
6. **Relevant quality issue confidence:** adding an open high-severity
   Computer Science enrollment issue did not lower High confidence for a
   Computer Science enrollment answer.
7. **Individual-record governance:** a request to show individual students
   who failed CS 101 was not explicitly refused and was labeled High
   confidence.
8. **Sensitive-name governance:** a request for names of Pell-eligible
   students was not explicitly refused and was labeled High confidence.

## Interpretation

The calculation and dataset-isolation foundations passed the tested cases,
but the current engine does not yet meet the release gate. Safe degradation,
confidence calibration, complementary-dimension language, flat-trend
narrative, and row-level governance need implementation work before the
system should be described as generally reliable.
