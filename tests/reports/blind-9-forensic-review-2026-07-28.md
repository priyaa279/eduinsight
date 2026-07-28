# EduInsight Blind Set #9 forensic review

Date: 2026-07-28  
Status: post-review remediation completed locally; no publication and no Blind #10

## Immutable untouched baseline

Blind Set #9 remains preserved exactly as first executed:

- Score: **154/220 (70%)**
- Wrong high-confidence answers: **39**
- Silent filter drops: **16**
- Privacy failures: **2**
- Crashes: **0**
- Suite bundle SHA-256: `c6f1cfa7fb05006911945e55618d96537697695c8e0a32d17936065067620e2a`
- Suite file SHA-256: `43617aea80a4cfc1e98868b05873c019008d7700c96949bad2f68f6d0952fffb`
- Oracle wrapper SHA-256: `acffcd4b85cc4385b6324646fc52fb8a6f2b43546709b551130f459c75a71601`
- Seal SHA-256: `3e2e5bf3e0c95047822ce94508cf8c0e3ee112730245320341d5bdcf03d4ebc6`
- First-run report SHA-256: `41feb6c7e2fbc4d63b56e29d97028346e78a597cff19d1cd2175c91ca9e7d18b`
- Frozen boundary bundle SHA-256: `6dcf4f77a1ab9048d9ce3cbc9de354a10c0aaece22526c50fa7221e4e034a85f`

The suite, oracle wrapper, seal, preflight, untouched evaluation runner, and first-run report were not edited during remediation. The post-remediation regression runner independently verifies their hashes before evaluating the current engine.

## Exhaustive earliest-root classification

Every one of the 66 untouched failures was assigned to one earliest root. A downstream wrong headline, confidence label, chart, or source mismatch was treated as a cascade when an earlier semantic defect already explained it.

| Root | Cases | Count |
|---|---|---:|
| Oracle/presentation-contract equivalence | 24, 55, 59, 61, 62, 65, 66, 68, 85, 112, 113, 114, 115, 116, 117, 118, 120, 122, 123, 124, 126, 129, 139, 140, 219 | 25 |
| Privacy/governance | 195, 198 | 2 |
| Constraint extraction / silent filter conservation | 58, 64 | 2 |
| Wrong metric/domain | 119 | 1 |
| Ranking, comparison, percentage, or change semantics | 71, 72, 73, 74, 76, 77, 78, 79, 81 | 9 |
| Provenance and governed definitions | 141, 142, 143, 144, 145, 146, 147, 150 | 8 |
| Capacity, IPEDS, or data-quality interpretation | 131, 134, 137, 138 | 4 |
| Compact academic language | 214, 215, 217, 218, 220 | 5 |
| Vague, unsupported, or contradictory safe failure | 153, 154, 156, 157, 173, 175, 180, 187, 189, 190 | 10 |
| **Total** |  | **66** |

## Oracle and presentation adjudications

The untouched result remains 154/220. The following contracts were not treated as engine-release defects:

- “change between” may validly render the two requested endpoints rather than every intervening year;
- unordered breakdown categories may be displayed in a different order when labels and values are identical;
- tied rankings may use the stable governed catalog order, provided the headline discloses the tie and never claims a unique winner;
- a specific-program capacity answer does not need artificial `ranking` or `topN` constraints;
- `Run 6 = 91%` and `Readiness = 91%` are the same latest IPEDS value;
- a single `Review = 3` point directly answers “how many checks,” while three check rows each carrying weight 3 answer a different presentation question;
- an ambiguous relative year for unavailable DFW data may safely clarify or return a source limitation, provided it returns no chart and Low confidence;
- the final source-integrity gate may convert an otherwise executable course-outcome plan into a governed limitation.

No adjudication waives privacy, metric/domain selection, arithmetic, population filters, date filters, threshold operators, source integrity, provenance, or a genuinely dropped constraint.

## Systemic remediation

The remediation changed reusable behavior rather than matching exact Blind #9 strings:

- aggregate-only privacy detection now blocks advising rosters and student-by-student rows;
- vague metrics, unsupported institutional domains, and mutually exclusive status filters fail closed;
- local academic abbreviations remain supported when metric, subject, and time are complete;
- program-level percentages work for governed demographic dimensions, not only residency;
- absolute versus percentage change and highest versus lowest direction are explicit plan semantics;
- requested ranking limits, attendance comparisons, available-seat measures, and capacity thresholds are conserved;
- a separate lexical constraint audit checks requested grouping, measure, ranking, limit, and threshold against the executable plan;
- governed data-catalog intent covers source inventories, enrollment definitions, retention numerator/denominator/lineage, and course-outcome limitations;
- data-quality counts, owner filters, and affected-record rankings use the requested aggregation;
- ranking headlines disclose ties, and flat changes use “unchanged” rather than “up 0.0%.”

## Post-remediation result

The separate runner `tests/ask-engine-blind-9-regression.mjs` reports:

- Raw original-contract result: **190/220 (86.4%)**
- Adjudicated regression result: **220/220 (100%)**
- Privacy: **10/10**
- Remaining wrong high-confidence defects after adjudication: **0**
- Remaining silent filter drops after adjudication: **0**
- Remaining privacy leaks: **0**
- Crashes: **0**

The raw 190/220 result is retained alongside the adjudicated result so presentation-contract differences remain visible. It does not replace the immutable first-run score.
