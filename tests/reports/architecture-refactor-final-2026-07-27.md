# Ask EduInsight architecture refactor verification

- Verification date: 2026-07-27 (America/Los_Angeles)
- Status: **PASS**
- Baseline engine SHA-256: `4dbd845c19e5c287f127b2cdaefc9f2bfea3e50c45b42f56175f9b39f66ba628`
- Refactored execution-engine SHA-256: `33e144a092d574c93a429f177a67e1d6dafdc5e2161acaedf1d5f0d506c9e660`
- Publishing: not performed
- Blind Set #8: not created or run

## Outcome

Ask EduInsight now constructs and validates a structured semantic plan before governed
calculation. Language normalization, intent detection, entity resolution, time parsing,
measure parsing, comparison parsing, filter auditing, privacy/governance, validation,
source integrity, and confidence/provenance are separate modules.

No governed metric definition or calculation formula was intentionally changed. The complete
known/adjudicated release bank remains green, and ten direct semantic-plan requirements were
added without changing existing test expectations.

## Old and new architecture

Before:

```text
Question
  -> one 4,459-line module containing normalization, resolution, routing,
     plan construction, execution, confidence, and answer formatting
  -> result
```

After:

```text
Question
  -> normalization
  -> intent/domain detection
  -> entity/dimension resolution
  -> time + measure + comparison parsing
  -> ambiguity/privacy/governance policy
  -> structured semantic plan
  -> filter-completeness and plan validation
  -> governed execution
  -> source-integrity + confidence/provenance
  -> answer/chart response
```

The original monolith was about 4,459 physical lines. `lib/ask-engine.mjs` is now 1,903
lines, a reduction of 2,556 lines (57.3%) in that file. The extracted implementation totals
4,574 lines across the execution engine and 15 focused modules; the additional lines are
module boundaries, explicit contracts, validation, and fail-closed behavior.

## Module map

| Module | Lines | Approx. regex literals | Responsibility |
|---|---:|---:|---|
| `lib/ask-engine.mjs` | 1,903 | 13 | Governed execution and answer construction |
| `lib/ask/normalization.mjs` | 211 | 169 | Narrow lexical normalization and spelling/format variants |
| `lib/ask/intent-detector.mjs` | 55 | 8 | Governed domain/intent detection |
| `lib/ask/resolvers.mjs` | 255 | 69 | Programs, dimensions, population, course, modality, and top-N resolution |
| `lib/ask/time-parser.mjs` | 154 | 18 | Years, ranges, endpoints, and trend modes |
| `lib/ask/measure-parser.mjs` | 246 | 29 | Count, percentage, rate, utilization, and change semantics |
| `lib/ask/comparison-parser.mjs` | 69 | 7 | Comparison, ranking, and grouping semantics |
| `lib/ask/filter-audit.mjs` | 62 | 1 | Detected-versus-applied constraint audit |
| `lib/ask/semantic-policy.mjs` | 664 | 259 | Reusable ambiguity, contradiction, unsupported, and semantic-operation policy |
| `lib/ask/governance.mjs` | 72 | 18 | Privacy, prompt-injection, and aggregate-only governance |
| `lib/ask/semantic-planner.mjs` | 115 | 0 | Structured plan orchestration |
| `lib/ask/plan-contract.mjs` | 255 | 0 | Query-plan and semantic-plan schemas/enums |
| `lib/ask/plan-validator.mjs` | 215 | 4 | Plan normalization, validation, and fail-closed fallback |
| `lib/ask/plan-scope.mjs` | 19 | 0 | Scope labels used by execution/provenance |
| `lib/ask/source-integrity.mjs` | 119 | 0 | Source completeness, quality, and reconciliation checks |
| `lib/ask/confidence-provenance.mjs` | 160 | 4 | Query/data/calculation confidence and traceability |
| **Total** | **4,574** | **599** | |

The approximate total regex-literal count moved from about 589 to 599. Regex was not treated
as a zero-count goal. It is now concentrated primarily in lexical normalization and bounded
semantic-policy adapters: 428 of 599 literals (71.5%) are in those two modules. The semantic
planner, plan contract, plan scope, and source-integrity modules contain no regex literals.

The ten-literal increase supports generalized parsing/validation introduced during the
refactor; it does not consist of exact full-question exceptions. Future language work should
reduce the remaining 259-regex semantic-policy concentration instead of expanding it.

## Structured semantic-plan contract

The internal schema requires the following categories before execution:

- domain/metric and measure;
- program, degree-level, population, retention, course, and modality scope;
- start/end year and time mode;
- grouping, comparison mode, ranking, top-N, and threshold;
- explicit semantic operation;
- response directive: answer, clarification, limitation, or refusal;
- normalized question and response reason;
- detected/applied filter audit with a completeness flag.

Representative parsed plan:

```json
{
  "metric": "enrollment",
  "programId": null,
  "programScope": "degree_level",
  "degreeLevel": "Graduate",
  "startYear": 2021,
  "endYear": 2025,
  "timeMode": "trend",
  "populationDimension": "all",
  "populationValue": null,
  "groupBy": "program",
  "comparisonMode": "trend",
  "ranking": "highest",
  "measure": "percentage_growth",
  "operation": "program_change_percent",
  "topN": 3,
  "responseType": "answer",
  "filterAudit": {
    "detected": [
      "Degree level: Graduate",
      "Time: 2021-2025"
    ],
    "applied": [
      "Degree level: Graduate",
      "Group by: program",
      "Time: 2021-2025"
    ],
    "complete": true
  }
}
```

If the plan is invalid or a recognized filter cannot be represented, an answer plan is
converted to a governed limitation. It is not executed with a silently reduced scope.

## Direct semantic-plan tests

`tests/semantic-plan.test.mjs` separates English interpretation from calculation and verifies:

1. explicit percentage-growth ranking fields;
2. four different growth-ranking phrasings produce the same semantic plan;
3. three different filter orders produce the same population;
4. count and percentage remain distinct;
5. Pell/non-Pell retention keeps subgroup and cohort semantics;
6. unsupported, ambiguous, and private requests are classified before execution;
7. unsupported cross-tabs fail closed with an incomplete filter audit;
8. the internal schema includes derived semantic fields;
9. supported plans pass contract validation;
10. executing an already-parsed plan independently produces the correct ranked result.

Result: **10/10 passed**.

## Behavior changes

The following reusable semantic behavior was added:

- `which 3` resolves the requested top-N value;
- `fastest`, `sharpest`, and `steepest` participate in ranking semantics;
- program + trend + percentage/growth-rate + change resolves to
  `program_change_percent`;
- incomplete recognized filter sets fail closed before calculation.

Consequently, these phrasings now produce the same plan:

- “Which 3 graduate programs grew the fastest percentage-wise since 2021?”
- “Give the top 3 graduate programs by biggest percentage increase from 2021.”
- “Rank three graduate programs by largest growth rate since 2021.”
- “Top three graduate programs by percent growth from 2021.”

No existing expected result was modified to make the refactor pass. No oracle conflict was
created or re-adjudicated during this work.

## Complete validation results

| Suite | Result |
|---|---:|
| Core Ask EduInsight regression | 184/184 |
| Blind Set #1 regression | 100/100 |
| Blind Set #2 regression | 180/180 |
| Blind Set #3 adjudicated regression | 250/250 |
| Blind Set #4 adjudicated regression | 285/285 |
| Blind Set #5 adjudicated regression | 280/280 |
| Blind Set #6 adjudicated regression | 260/260 |
| Blind Set #7 adjudicated regression | 250/250 |
| New direct semantic-plan contract | 10/10 |
| Adversarial tests | 25/25 |
| Systemic invariants | 47/47 |
| **Total known/adjudicated requirements** | **1,871/1,871** |

Additional verification:

- production build: passed;
- rendered HTML: 1/1 passed;
- ESLint: exit code 0, 0 errors, 12 pre-existing unused-variable warnings;
- no new lint warning from the refactor.

## Browser critical flows

The local application at `http://localhost:3000/` passed these checks:

- the new percentage-growth ranking question rendered the correct top three values:
  MS Business Analytics 200.0%, MS Computer Science 42.7%, MS Nursing 31.7%;
- the UI headline and chart agreed with the structured response;
- provenance showed the validated operation, applied Graduate scope, program grouping,
  2021–2025 range, complete filter audit, and contributing certified sources;
- a vague “best program” question rendered clarification and made no assumption;
- a request for Pell student names rendered an aggregate-only privacy refusal and disclosed
  no student records;
- an unsupported GPA question rendered a source limitation and no unrelated chart;
- submitting the same supported question twice returned an identical headline and values;
- a 390×844 viewport had no horizontal overflow
  (`documentElement.scrollWidth === documentElement.clientWidth === 375`);
- browser warning/error log: empty.

## Final engine and module hashes

| File | SHA-256 |
|---|---|
| `lib/ask-engine.mjs` | `33e144a092d574c93a429f177a67e1d6dafdc5e2161acaedf1d5f0d506c9e660` |
| `lib/ask/comparison-parser.mjs` | `f8fd8b00c3f05c82462a231dcb72f89519ab0b07f1b3b1496705bf839992e850` |
| `lib/ask/confidence-provenance.mjs` | `b02f13115323aa698c27f61d95e67b9872d8ffec57829c5ff5c1efd13dd758eb` |
| `lib/ask/filter-audit.mjs` | `3c03cbc66db4e48adb7c7940a47ee3a2f9aa0b8b883ff6a8a30ac53a280d03d2` |
| `lib/ask/governance.mjs` | `f153c50a508fe2a843f54f4fcbc3cf977e799bebffa67a2465a9f30c954bb0a6` |
| `lib/ask/intent-detector.mjs` | `7f7515841a922df0dfac6349337fd9c6b5246ac1b2f12e4186ccb1f138596d27` |
| `lib/ask/measure-parser.mjs` | `bd091e8901d6fd99162356da66441d1854e78180556ef00c747d9c78bbeeaad5` |
| `lib/ask/normalization.mjs` | `3995ae0603610ef8cc358df4f046701cc32ed00de8b4e820430ef39a953d655a` |
| `lib/ask/plan-contract.mjs` | `4cc695b0c5755aaf25b7a93f341e95f338e29eb9d214ca36d65392b1027f5cb8` |
| `lib/ask/plan-scope.mjs` | `0e4029b5a02b548dd2dfa77a96a6baec669c2519abdfe6a5dbcdedd7084ca920` |
| `lib/ask/plan-validator.mjs` | `3373f7c3ea0f460ab5392419be7043a44762198486d53357c31687e566232de5` |
| `lib/ask/resolvers.mjs` | `b72cbf1303befb2d73c852576ef829bdd89d34a6ac612ef0c7946d128ffa7584` |
| `lib/ask/semantic-planner.mjs` | `10764c6df7b853c1841e42246b02535b2ff5cff56fafa89acc9c81f6b48cba44` |
| `lib/ask/semantic-policy.mjs` | `a42588078c636a45023e5b3cb190287b49c5e18b1b958c53b0fe9badf2f39ff8` |
| `lib/ask/source-integrity.mjs` | `89548e06ea546bd3e058a7ea6df62857b0797e75078dcd98ead87202040132be` |
| `lib/ask/time-parser.mjs` | `7fba0988ba3271bbaed87232070c74548667e94d9a65a89b08fb4decaf95017e` |

## Preserved untouched first-run evidence

The first-run reports were not modified. Their current file hashes match the hashes recorded
before this refactor:

| Report | SHA-256 |
|---|---|
| `blind-2-first-run.md` | `4315aec86f212e643edf05aea9d8a638da062e441b54b785da0078c9a8bd78b1` |
| `blind-3-first-run.md` | `58d718920201d838c0122b8cc10bf2001c843afe334cba6731400d32e2d99fdd` |
| `blind-4-first-run.md` | `1a634eae713b5b753f559eec1bf91e652496f8a60aadd42faa10e0854c315164` |
| `blind-5-first-run.md` | `a0007b33517ed65f5c08df3850559aa5f859cbb8c27449cfb72820b9086c2ab1` |
| `blind-6-first-run.md` | `f9af084032a226c818069809ff72ea961794df126191154ae1698624967e4393` |
| `blind-7-first-run.md` | `d87d970b9df28f990fb057030e54df63b1ce421f6d956031236cd01c719bd9b5` |

This refactor is complete and frozen for review. The next evaluation milestone, if approved,
is a newly sealed Blind Set #8. It has deliberately not been created or run here.
