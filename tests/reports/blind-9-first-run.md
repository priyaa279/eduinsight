# EduInsight Blind Set #9 — untouched first run

- Executed: 2026-07-28T18:43:08.809Z
- Suite bundle SHA-256: `c6f1cfa7fb05006911945e55618d96537697695c8e0a32d17936065067620e2a`
- Suite file SHA-256: `43617aea80a4cfc1e98868b05873c019008d7700c96949bad2f68f6d0952fffb`
- Oracle wrapper SHA-256: `acffcd4b85cc4385b6324646fc52fb8a6f2b43546709b551130f459c75a71601`
- Frozen boundary bundle SHA-256: `6dcf4f77a1ab9048d9ce3cbc9de354a10c0aaece22526c50fa7221e4e034a85f`
- Score: **154/220 (70%)**
- Reliability-gate result: **FAIL**
- Policy: the local parser, validators, governed dataset, privacy rules, release bank, suite, and oracle were sealed before execution.
- Remediation: none performed.
- Rerun: prohibited until user review; this report is write-once.

## Outcome classification

- Correct governed answers: 111/163 (68.1%)
- Supported numerical correctness: 113/152 (74.3%)
- Safe targeted clarifications: 10/14
- Safe rephrase requests: 6/6
- Governed limitations: 10/14
- Contradiction clarifications: 5/8
- Privacy refusals: 8/10 (80%)
- Wrong low/medium-confidence answers: 0
- Wrong high-confidence answers: 39
- Wrong metric/domain plans: 9
- Silent filter drops: 16
- Privacy leaks: 2
- Unsafe answers to safe-failure cases: 11
- Safe abstentions on supported questions: 8
- Crashes: 0
- Provenance mismatches: 4
- Presentation/chart mismatches: 49

## Reliability gates

| Gate | Result |
|---|---|
| Confidently wrong answers are zero | FAIL |
| Silent filter drops are zero | FAIL |
| Privacy-sensitive handling is 100% | FAIL |
| Privacy leaks are zero | FAIL |
| Crashes are zero | PASS |
| Clear supported questions are correct | FAIL |

## Category results

| Category | Passed | Total | Rate |
|---|---:|---:|---:|
| enrollment-core | 29 | 30 | 96.7% |
| enrollment-filters | 27 | 30 | 90% |
| enrollment-ranking-comparison | 9 | 25 | 36% |
| retention | 26 | 30 | 86.7% |
| capacity-ipeds-quality | 9 | 25 | 36% |
| provenance-definitions | 2 | 10 | 20% |
| ambiguity-incomplete | 16 | 20 | 80% |
| unsupported-contradictory | 14 | 20 | 70% |
| privacy-hostile | 13 | 15 | 86.7% |
| compact-academic-language | 9 | 15 | 60% |

## Frozen boundary hashes

| File | SHA-256 |
|---|---|
| `app/api/ask/route.ts` | `140eab61207eeab52b0a0555e25206576892c5f63d1f6cc06f76bcde18bff065` |
| `app/data/ask-eduinsight.generated.json` | `e9b817aeb98c6c3fafcf5547f323c77855f3e6c7bcdf06c251e787de472a6733` |
| `lib/ask-engine.mjs` | `f43fffe681162555359984905109394aa92e181bff5b2a22201afddc57e9bbab` |
| `lib/ask/comparison-parser.mjs` | `f8fd8b00c3f05c82462a231dcb72f89519ab0b07f1b3b1496705bf839992e850` |
| `lib/ask/confidence-provenance.mjs` | `b02f13115323aa698c27f61d95e67b9872d8ffec57829c5ff5c1efd13dd758eb` |
| `lib/ask/dataset-capabilities.mjs` | `d56efac6beee16ca0a8a2d12ffc518a98744dc5ee8d8c13216c29163a7f54729` |
| `lib/ask/filter-audit.mjs` | `3c03cbc66db4e48adb7c7940a47ee3a2f9aa0b8b883ff6a8a30ac53a280d03d2` |
| `lib/ask/governance.mjs` | `207b9fa03e7ddf23761adaf80575f31328a551af6ea53ad65e6f2a18f00c8ed0` |
| `lib/ask/intent-detector.mjs` | `c0d4394007d1361acf4cb3cca3f33cddaca05e02546ede96481a9726eb871c4d` |
| `lib/ask/measure-parser.mjs` | `bd091e8901d6fd99162356da66441d1854e78180556ef00c747d9c78bbeeaad5` |
| `lib/ask/normalization.mjs` | `3995ae0603610ef8cc358df4f046701cc32ed00de8b4e820430ef39a953d655a` |
| `lib/ask/plan-contract.mjs` | `43c7655f88da30b7e4fdc19e161b403c49bebbd2a51bf803c3eebbee33d07f22` |
| `lib/ask/planner-presentation.mjs` | `2ba58ca55425d27033cc1f8f666b595a2ec2e4031e15618e417d623a969edfd5` |
| `lib/ask/plan-scope.mjs` | `0e4029b5a02b548dd2dfa77a96a6baec669c2519abdfe6a5dbcdedd7084ca920` |
| `lib/ask/plan-validator.mjs` | `ab1acb6ce730d124156a3b9068e3c2f7713b1ab2768baafc6e66097c4927a505` |
| `lib/ask/question-quality.mjs` | `5cf79a46c1e8bf2ed9dca95a8f18074b026a080b4aa48fddaf828472cc7fd009` |
| `lib/ask/request-service.mjs` | `de5dd3a86e3409ffdb1475ce712e48a87cd82b6598eb8958ebc12c45359ea236` |
| `lib/ask/resolvers.mjs` | `b72cbf1303befb2d73c852576ef829bdd89d34a6ac612ef0c7946d128ffa7584` |
| `lib/ask/semantic-planner.mjs` | `c1cf2dd3e0a3a1a82ce271aaf6dd6a17faeb6accc4366b93218650bb9def1489` |
| `lib/ask/semantic-policy.mjs` | `5163cffdd1f4ed101b429d48f8f026e27980c1465e331e87069220cb57cb465b` |
| `lib/ask/source-integrity.mjs` | `89548e06ea546bd3e058a7ea6df62857b0797e75078dcd98ead87202040132be` |
| `lib/ask/time-parser.mjs` | `7fba0988ba3271bbaed87232070c74548667e94d9a65a89b08fb4decaf95017e` |
| `package.json` | `293ac2af6c114f3108a7756e2fa3b515f72b89e8901a68f33a3fea0ac9b748a2` |
| `tests/ask-engine.test.mjs` | `56ba4fe279daf0c5bcae40e3b56553ed11ef0248965556d959a35df7225f74cf` |
| `tests/ask-engine-adversarial.test.mjs` | `72aa95691ad66bc611f2075bdda2106aa0b75e6e2e58705332c3eb24d57644cf` |
| `tests/ask-engine-blind-2-evaluation.mjs` | `5acd1d80844a747d278402524d922ebcabab35c9d1c15536b3817e17b946bf21` |
| `tests/ask-engine-blind-3-evaluation.mjs` | `bf8685d43158e967748ec4d72cdcb9d0b13c7eabc6563f3f1f2657bd86929d66` |
| `tests/ask-engine-blind-3-regression.mjs` | `43c4f541ed4e7d371cc54244ee126c4a540d2f640983834afcdb5f00151e0bf8` |
| `tests/ask-engine-blind-4-evaluation.mjs` | `8d41440d7d2c67b46b078da74f5acb7d5e6c7d1f7ef74b6b9c578e309f529dff` |
| `tests/ask-engine-blind-4-regression.mjs` | `a4f517e96ecd6725c32d29f64bb9382485bc177b5f29cdf9dbd919d4e1c0f747` |
| `tests/ask-engine-blind-5-evaluation.mjs` | `0e8082d67cfdc77992b9bcb95d1fa8daf5aac2d708b738583e269430708d59f8` |
| `tests/ask-engine-blind-5-regression.mjs` | `c43e8b1a66fe1a1de07d6c6c912005942147779b753e44e7f65a662ddf1ea15b` |
| `tests/ask-engine-blind-6-evaluation.mjs` | `0d5522f13a44236d220dc5afd623bafd79a289ee59678e5acba3a7af1d9be62d` |
| `tests/ask-engine-blind-6-regression.mjs` | `33a3e355e6119a4c87378e91175535465bf44468fb2f682855413e54bd02f404` |
| `tests/ask-engine-blind-7-evaluation.mjs` | `1e743b421d0dc8e8f697c4c3bcaaedbe2b630c8e53f047c468f3670ec3d62ab0` |
| `tests/ask-engine-blind-7-regression.mjs` | `d616f8c1d54458658ede212e74d932de170e5bb19971c5b4519365ff2b1635aa` |
| `tests/ask-engine-blind-8-evaluation.mjs` | `04f2acfe729d034c7a0ff8f46c56ad21e55b65d02ccf7c3c3c4622165301a98f` |
| `tests/ask-engine-blind-8-preflight.mjs` | `85953f8b74cdf0072bbb76244f760e71b59cb5363c4609bd18c48a4c16c482af` |
| `tests/ask-engine-blind-8-suite.mjs` | `c4c7bd17c6b09aff02c101880e789fed7f2fe47f82ed74d5aac053ce9fbf54f3` |
| `tests/ask-engine-blind-evaluation.mjs` | `60e7f19e0617f0344ea37d1dcfaae16340560101e5ee71e345022adda2c4f168` |
| `tests/ask-engine-evaluation.mjs` | `96a9d38c96bbb1800cb3de704bae1b75d4d8a3c72b07e656425d3b1dc8e719e5` |
| `tests/ask-engine-systemic.test.mjs` | `bdfd12453a37a77ca70550063fcc8fe430277ae1df40ece613ea1cbab45af4f7` |
| `tests/blind-8-oracle.mjs` | `f7760f963914ede242398d8cc9719a5b427e48d4682a157670259b9eefaf057f` |
| `tests/helpers/no-api-contract.mjs` | `2bd351b5e0f326f318a9d5b69f56b77e3021df83c08d72825927455f4869a5ce` |
| `tests/no-api-local-contract.test.mjs` | `d950d65ae4d5c5c7505642777edf8c3a42bbe3da9083a3c80e97bce73fc65412` |
| `tests/planner-presentation.test.mjs` | `3daf14473c93f3c69bbe8b39f64ea57d2a74a991f31313d21c068822b5934c00` |
| `tests/rendered-html.test.mjs` | `b228af3cb5a4bb12f4f03a00bd3740c355305fe6c44afe6b74772fbcff7012cd` |
| `tests/semantic-parser-boundary.test.mjs` | `819831684da2b3583efa09cc539df44c5535be3c11eb5b492e201b22cd1c9a0d` |
| `tests/semantic-plan.test.mjs` | `f05331e5644f1ba09d973bef39fe41fcab856eb81bb83c9046fdf1e5b5d04056` |

## Failures

### 24. enrollment-core

Question: How did total Fall enrollment change between 2021 and 2025?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"2021","value":18120,"display":"18,120"},{"label":"2025","value":18426,"display":"18,426"}]; expected [{"label":"2021","value":18120},{"label":"2022","value":18715},{"label":"2023","value":19018},{"label":"2024","value":19234},{"label":"2025","value":18426}]
- Actual headline: Institution-wide enrollment changed by 306 students (+1.7%) between 2021 and 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: compare_years
- Actual applied filters: Time: 2021-2025

### 55. enrollment-filters

Question: Break down Fall 2024 enrollment by residency.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`

- Actual headline: International has the largest matched enrollment at 6,512 students.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: residency | Time: 2024-2024

### 58. enrollment-filters

Question: Compare full-time and part-time enrollment in Fall 2025.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `silent-filter-drop`, `wrong-high-confidence`

- plan.groupBy "none"; expected "attendance_status"
- numerical points [{"label":"2025","value":3657,"display":"3,657"}]; expected [{"label":"Part-time","value":3657},{"label":"Full-time","value":14769}]
- recognized constraints not fully applied: groupBy
- Actual headline: Part-time institution-wide enrollment is 3,657 students in 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: attendance status: Part-time | Time: 2025-2025

### 59. enrollment-filters

Question: Show the Fall 2025 enrollment breakdown by reported gender.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`

- Actual headline: Unknown has the largest matched enrollment at 4,697 students.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: gender | Time: 2025-2025

### 61. enrollment-ranking-comparison

Question: Which three programs enrolled the most students in Fall 2025?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"BA English","value":2018,"display":"2,018"},{"label":"BS Biology","value":2018,"display":"2,018"},{"label":"BBA Business Administration","value":2018,"display":"2,018"}]; expected [{"label":"BA English","value":2018},{"label":"BA Psychology","value":2018},{"label":"BBA Business Administration","value":2018}]
- Actual headline: BA English has the largest matched enrollment at 2,018 students; 7 programs tie at that value.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: program | Time: 2025-2025

### 62. enrollment-ranking-comparison

Question: List the five largest programs by Fall 2024 enrollment.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"BA English","value":2142,"display":"2,142"},{"label":"BS Biology","value":2142,"display":"2,142"},{"label":"BBA Business Administration","value":2142,"display":"2,142"},{"label":"BS Mathematics","value":2142,"display":"2,142"},{"label":"BS Education","value":2142,"display":"2,142"}]; expected [{"label":"BA English","value":2142},{"label":"BBA Business Administration","value":2142},{"label":"BS Biology","value":2142},{"label":"BS Criminal Justice","value":2142},{"label":"BS Education","value":2142}]
- Actual headline: BA English has the largest matched enrollment at 2,142 students; 6 programs tie at that value.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: program | Time: 2024-2024

### 64. enrollment-ranking-comparison

Question: What were the two largest graduate programs in Fall 2025?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `silent-filter-drop`, `wrong-high-confidence`

- plan.topN 10; expected 2
- numerical points [{"label":"MS Computer Science","value":678,"display":"678"},{"label":"MS Business Analytics","value":585,"display":"585"},{"label":"MS Nursing","value":540,"display":"540"},{"label":"Master of Public Administration","value":480,"display":"480"}]; expected [{"label":"MS Computer Science","value":678},{"label":"MS Business Analytics","value":585}]
- recognized constraints not fully applied: topN
- Actual headline: MS Computer Science has the largest matched enrollment at 678 students.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Degree level: Graduate | Group by: program | Time: 2025-2025

### 65. enrollment-ranking-comparison

Question: Rank the four largest undergraduate programs in Fall 2023.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"BA English","value":2156,"display":"2,156"},{"label":"BS Biology","value":2156,"display":"2,156"},{"label":"BBA Business Administration","value":2156,"display":"2,156"},{"label":"BS Mathematics","value":2156,"display":"2,156"}]; expected [{"label":"BA English","value":2156},{"label":"BA Psychology","value":2156},{"label":"BBA Business Administration","value":2156},{"label":"BS Biology","value":2156}]
- Actual headline: BA English has the largest matched enrollment at 2,156 students; 8 programs tie at that value.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Degree level: Undergraduate | Group by: program | Time: 2023-2023

### 66. enrollment-ranking-comparison

Question: Which program had the greatest enrollment in Fall 2022?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"BA English","value":2135,"display":"2,135"},{"label":"BS Biology","value":2135,"display":"2,135"},{"label":"BBA Business Administration","value":2135,"display":"2,135"},{"label":"BS Mathematics","value":2135,"display":"2,135"},{"label":"BS Education","value":2135,"display":"2,135"},{"label":"BS Criminal Justice","value":2135,"display":"2,135"},{"label":"BA Psychology","value":2135,"display":"2,135"},{"label":"General Studies","value":2135,"display":"2,135"}]; expected [{"label":"BA English","value":2135}]
- Actual headline: BA English has the largest matched enrollment at 2,135 students; 8 programs tie at that value.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: program | Time: 2022-2022

### 68. enrollment-ranking-comparison

Question: Which four programs enrolled the most international students in Fall 2025?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"BS Education","value":707,"display":"707"},{"label":"BA English","value":692,"display":"692"},{"label":"BBA Business Administration","value":689,"display":"689"},{"label":"BS Biology","value":684,"display":"684"}]; expected [{"label":"BS Education","value":707},{"label":"BA English","value":692},{"label":"BBA Business Administration","value":689},{"label":"BA Psychology","value":684}]
- Actual headline: BS Education has the largest matched enrollment at 707 students.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: residency: International | Group by: program | Time: 2025-2025

### 71. enrollment-ranking-comparison

Question: Rank the four undergraduate programs with the highest Pell-eligible percentage in Fall 2025.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"Pell-eligible","value":32.88731958124264,"display":"32.9%"}]; expected [{"label":"BS Biology","value":33.4},{"label":"BBA Business Administration","value":33.3},{"label":"BA Psychology","value":33.1},{"label":"BS Education","value":33}]
- Actual headline: Pell-eligible students represent 32.9% of the matched 2025 enrollment denominator.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: share
- Actual applied filters: Degree level: Undergraduate | pell eligible: Pell-eligible | Group by: program | Time: 2025-2025

### 72. enrollment-ranking-comparison

Question: Which program had the largest first-generation share in Fall 2024?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `silent-filter-drop`, `wrong-high-confidence`

- plan.measure "count"; expected "percentage"
- numerical points [{"label":"BA English","value":813,"display":"813"}]; expected [{"label":"BA English","value":38}]
- recognized constraints not fully applied: measure
- Actual headline: BA English has the largest matched enrollment at 813 students.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: first generation: First-generation | Group by: program | Time: 2024-2024

### 73. enrollment-ranking-comparison

Question: Which program had the smallest international percentage in Fall 2023?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `silent-filter-drop`, `wrong-high-confidence`

- plan.measure "count"; expected "percentage"
- numerical points [{"label":"MS Business Analytics","value":80,"display":"80"}]; expected [{"label":"MS Nursing","value":31.9}]
- recognized constraints not fully applied: measure
- Actual headline: MS Business Analytics has the lowest matched enrollment at 80 students.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: residency: International | Group by: program | Time: 2023-2023

### 74. enrollment-ranking-comparison

Question: Which three programs added the most students from 2021 to 2025?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `silent-filter-drop`, `wrong-high-confidence`

- plan.measure "count"; expected "absolute_change"
- numerical points [{"label":"BA English","value":2018,"display":"2,018"},{"label":"BS Biology","value":2018,"display":"2,018"},{"label":"BBA Business Administration","value":2018,"display":"2,018"}]; expected [{"label":"MS Business Analytics","value":390},{"label":"MS Computer Science","value":203},{"label":"MS Nursing","value":130}]
- recognized constraints not fully applied: measure
- Actual headline: BA English has the largest matched enrollment at 2,018 students; 7 programs tie at that value.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: program | Time: 2021-2025

### 76. enrollment-ranking-comparison

Question: Which program lost the most students from 2021 to 2025?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `silent-filter-drop`, `wrong-high-confidence`

- plan.ranking "highest"; expected "lowest"
- recognized constraints not fully applied: ranking
- Actual headline: BA English declined the most at −55 between 2021 and 2025; 5 programs tie at that value.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: program_change_absolute
- Actual applied filters: Group by: program | Time: 2021-2025

### 77. enrollment-ranking-comparison

Question: Which four programs had the lowest percentage growth from 2020 to 2025?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"MS Business Analytics","value":225,"display":"225.0%"},{"label":"MS Computer Science","value":61.42857142857143,"display":"61.4%"},{"label":"MS Nursing","value":38.46153846153847,"display":"38.5%"},{"label":"Master of Public Administration","value":6.666666666666667,"display":"6.7%"}]; expected [{"label":"BA English","value":0},{"label":"BA Psychology","value":0},{"label":"BBA Business Administration","value":0},{"label":"BS Biology","value":0}]
- Actual headline: MS Business Analytics changed the most at 225.0% between 2020 and 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: program_change_percent
- Actual applied filters: Group by: program | Time: 2020-2025

### 78. enrollment-ranking-comparison

Question: Which two graduate programs added the most students from 2022 to 2025?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `silent-filter-drop`, `wrong-high-confidence`

- plan.measure "count"; expected "absolute_change"
- numerical points [{"label":"MS Computer Science","value":678,"display":"678"},{"label":"MS Business Analytics","value":585,"display":"585"}]; expected [{"label":"MS Business Analytics","value":370},{"label":"MS Computer Science","value":168}]
- recognized constraints not fully applied: measure
- Actual headline: MS Computer Science has the largest matched enrollment at 678 students.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Degree level: Graduate | Group by: program | Time: 2022-2025

### 79. enrollment-ranking-comparison

Question: Which three undergraduate programs grew fastest by percentage from 2021 to 2024?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"BS Education","value":3.3783783783783785,"display":"3.4%"},{"label":"BS Criminal Justice","value":3.3783783783783785,"display":"3.4%"},{"label":"BA Psychology","value":3.3301158301158305,"display":"3.3%"}]; expected [{"label":"BS Criminal Justice","value":3.4},{"label":"BS Education","value":3.4},{"label":"BA English","value":3.3}]
- Actual headline: BS Education changed the most at 3.4% between 2021 and 2024; 2 programs tie at that value.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: program_change_percent
- Actual applied filters: Degree level: Undergraduate | Group by: program | Time: 2021-2024

### 81. enrollment-ranking-comparison

Question: Which two programs had the lowest raw enrollment change from 2023 to 2025?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `silent-filter-drop`, `wrong-high-confidence`

- plan.measure "count"; expected "absolute_change"
- numerical points [{"label":"Master of Public Administration","value":480,"display":"480"},{"label":"MS Nursing","value":540,"display":"540"}]; expected [{"label":"General Studies","value":-139},{"label":"BA English","value":-138}]
- recognized constraints not fully applied: measure
- Actual headline: Master of Public Administration has the lowest matched enrollment at 480 students.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: program | Time: 2023-2025

### 85. enrollment-ranking-comparison

Question: Show Fall 2024 enrollment by residency category for comparison.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`

- Actual headline: International has the largest matched enrollment at 6,512 students.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: residency | Time: 2024-2024

### 112. retention

Question: Compare first-generation with continuing-generation retention for the 2024 cohort.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- plan.measure "percentage_point_difference"; expected "retention_rate"
- Actual headline: First-generation retention is 2.2 percentage points higher than Continuing-generation retention.
- Actual confidence: High
- Actual metric: retention
- Actual operation: retention_generation_comparison
- Actual applied filters: Group by: first generation | Time: 2024-2024

### 113. retention

Question: Compare Pell-eligible and non-Pell retention for the 2023 cohort.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `wrong-high-confidence`

- plan.measure "percentage_point_difference"; expected "retention_rate"
- Actual headline: Pell-eligible retention is 1.3 percentage points lower than Non-Pell retention.
- Actual confidence: High
- Actual metric: retention
- Actual operation: retention_pell_comparison
- Actual applied filters: Group by: pell eligible | Time: 2023-2023

### 114. retention

Question: Show retention by residency for the 2024 entering cohort.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`

- Actual headline: In-state has the highest matched first-year retention at 79.4%.
- Actual confidence: High
- Actual metric: retention
- Actual operation: standard
- Actual applied filters: Group by: residency | Time: 2024-2024

### 115. retention

Question: Show retention by reported gender for the 2022 cohort.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`

- Actual headline: Unknown has the highest matched first-year retention at 71.2%.
- Actual confidence: High
- Actual metric: retention
- Actual operation: standard
- Actual applied filters: Group by: gender | Time: 2022-2022

### 116. capacity-ipeds-quality

Question: What percentage of scheduled Computer Science capacity is currently occupied?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `silent-filter-drop`, `wrong-high-confidence`

- plan.ranking "none"; expected "highest"
- plan.topN 10; expected 1
- numerical points [{"label":"Computer Science","value":86,"display":"86%"}]; expected [{"label":"MS Computer Science","value":86}]
- recognized constraints not fully applied: ranking, topN
- Actual headline: Computer Science has the highest matched utilization at 86%.
- Actual confidence: High
- Actual metric: capacity_utilization
- Actual operation: standard
- Actual applied filters: Program: MS Computer Science | Time: 2025-2025

### 117. capacity-ipeds-quality

Question: Report MS Business Analytics capacity utilization.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `silent-filter-drop`, `wrong-high-confidence`

- plan.ranking "none"; expected "highest"
- plan.topN 10; expected 1
- recognized constraints not fully applied: ranking, topN
- Actual headline: MS Business Analytics has the highest matched utilization at 92%.
- Actual confidence: High
- Actual metric: capacity_utilization
- Actual operation: standard
- Actual applied filters: Program: MS Business Analytics | Degree level: Graduate | Time: 2025-2025

### 118. capacity-ipeds-quality

Question: How many scheduled seats remain in MS Nursing?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `silent-filter-drop`, `wrong-high-confidence`

- plan.ranking "none"; expected "highest"
- plan.topN 10; expected 1
- recognized constraints not fully applied: ranking, topN
- Actual headline: MS Nursing has the highest matched available seats at 220.
- Actual confidence: High
- Actual metric: capacity_utilization
- Actual operation: standard
- Actual applied filters: Program: MS Nursing | Degree level: Graduate | Time: 2025-2025

### 119. capacity-ipeds-quality

Question: How many seats are still available in Public Administration?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `wrong-metric-domain`, `presentation-contract-mismatch`, `provenance-mismatch`, `silent-filter-drop`, `wrong-high-confidence`

- plan.metric "enrollment"; expected "capacity_utilization"
- plan.measure "count"; expected "available_seats"
- plan.ranking "none"; expected "highest"
- plan.topN 10; expected 1
- numerical points [{"label":"2025","value":480,"display":"480"}]; expected [{"label":"Master of Public Administration","value":470}]
- sources ["programs.csv","student_terms.csv","students.csv","terms.csv"]; expected ["programs.csv","section_enrollments.csv","sections.csv"]
- recognized constraints not fully applied: measure, ranking, topN
- Actual headline: Public Administration enrollment is 480 students in 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Program: Master of Public Administration | Time: 2020-2025

### 120. capacity-ipeds-quality

Question: Rank all graduate programs by capacity utilization.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `silent-filter-drop`, `wrong-high-confidence`

- plan.topN 10; expected 4
- recognized constraints not fully applied: topN
- Actual headline: MS Business Analytics has the highest matched utilization at 92%.
- Actual confidence: High
- Actual metric: capacity_utilization
- Actual operation: standard
- Actual applied filters: Degree level: Graduate | Group by: program | Time: 2025-2025

### 122. capacity-ipeds-quality

Question: Which programs are above 85 percent capacity utilization?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `silent-filter-drop`, `wrong-high-confidence`

- plan.ranking "none"; expected "highest"
- plan.topN 10; expected 4
- recognized constraints not fully applied: ranking, topN
- Actual headline: 2 programs are above 85% capacity.
- Actual confidence: High
- Actual metric: capacity_utilization
- Actual operation: capacity_threshold
- Actual applied filters: Group by: program | Time: 2025-2025

### 123. capacity-ipeds-quality

Question: Which programs are at least 78 percent utilized?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `silent-filter-drop`, `wrong-high-confidence`

- plan.ranking "none"; expected "highest"
- plan.topN 10; expected 4
- recognized constraints not fully applied: ranking, topN
- Actual headline: 3 programs are at least 78% capacity.
- Actual confidence: High
- Actual metric: capacity_utilization
- Actual operation: capacity_threshold
- Actual applied filters: Group by: program | Time: 2025-2025

### 124. capacity-ipeds-quality

Question: Which programs are below 80 percent capacity?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `silent-filter-drop`, `wrong-high-confidence`

- plan.ranking "none"; expected "highest"
- plan.topN 10; expected 4
- recognized constraints not fully applied: ranking, topN
- Actual headline: 2 programs are below 80% capacity.
- Actual confidence: High
- Actual metric: capacity_utilization
- Actual operation: capacity_threshold
- Actual applied filters: Group by: program | Time: 2025-2025

### 126. capacity-ipeds-quality

Question: What is the current IPEDS Fall Enrollment readiness percentage?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"Run 6","value":91,"display":"91%"}]; expected [{"label":"Readiness","value":91}]
- Actual headline: Fall Enrollment is 91% submission-ready.
- Actual confidence: High
- Actual metric: ipeds_readiness
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 129. capacity-ipeds-quality

Question: How many IPEDS checks still need review before submission?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"Review","value":3,"display":"3"}]; expected [{"label":"EF-047","value":3},{"label":"EF-048","value":3},{"label":"EF-049","value":3}]
- Actual headline: 3 current validation checks are marked review.
- Actual confidence: High
- Actual metric: ipeds_readiness
- Actual operation: standard
- Actual applied filters: Group by: status | Time: 2020-2025

### 131. capacity-ipeds-quality

Question: How many data-quality issues are currently open?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"Critical","value":3,"display":"3"},{"label":"High","value":10,"display":"10"},{"label":"Medium","value":14,"display":"14"}]; expected [{"label":"Open","value":27}]
- Actual headline: Critical has the largest matched total at 3 issues.
- Actual confidence: High
- Actual metric: quality_issues
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 134. capacity-ipeds-quality

Question: Which five open data-quality findings affect the most records?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"High","value":1178,"display":"1,178"},{"label":"Medium","value":813,"display":"813"},{"label":"Critical","value":225,"display":"225"}]; expected [{"label":"DQ-1002","value":808},{"label":"DQ-1005","value":307},{"label":"DQ-1001","value":146},{"label":"DQ-1003","value":119},{"label":"DQ-1017","value":72}]
- Actual headline: High has the largest matched total at 1,178 affected records.
- Actual confidence: High
- Actual metric: quality_issues
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 137. capacity-ipeds-quality

Question: How many open data-quality issues belong to Financial Aid?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"High","value":2,"display":"2"},{"label":"Medium","value":4,"display":"4"}]; expected [{"label":"Financial Aid","value":6}]
- Actual headline: High has the largest matched total at 2 issues.
- Actual confidence: High
- Actual metric: quality_issues
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 138. capacity-ipeds-quality

Question: How many open issues are assigned to Institutional Research?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"High","value":1,"display":"1"}]; expected [{"label":"Institutional Research","value":1}]
- Actual headline: High has the largest matched total at 1 issues.
- Actual confidence: High
- Actual metric: quality_issues
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 139. capacity-ipeds-quality

Question: Which courses recorded the highest DFW percentages this year?

Expected disposition: `limitation`

Actual disposition: `clarification`

Flags: none

- disposition clarification; expected limitation
- plan.responseType "clarification"; expected "limitation"
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual metric: course_outcomes
- Actual operation: standard
- Actual applied filters: Group by: course | Time: 2020-2025

### 140. capacity-ipeds-quality

Question: How many DFW outcomes occurred in online courses?

Expected disposition: `limitation`

Actual disposition: `limitation`

Flags: none

- plan.responseType "answer"; expected "limitation"
- Actual headline: A DFW or grade result cannot be calculated from the current upload.
- Actual confidence: Low
- Actual metric: course_outcomes
- Actual operation: standard
- Actual applied filters: Time: 2025-2025

### 141. provenance-definitions

Question: What governed data subjects can these uploaded files answer?

Expected disposition: `answer`

Actual disposition: `clarification`

Flags: `wrong-metric-domain`, `safe-abstention`

- disposition clarification; expected answer
- plan.metric "unsupported"; expected "data_catalog"
- plan.responseType "clarification"; expected "answer"
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual metric: unsupported
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 142. provenance-definitions

Question: Which uploaded source files support institutional calculations?

Expected disposition: `answer`

Actual disposition: `clarification`

Flags: `wrong-metric-domain`, `presentation-contract-mismatch`, `safe-abstention`

- disposition clarification; expected answer
- plan.metric "unsupported"; expected "data_catalog"
- plan.responseType "clarification"; expected "answer"
- answer missing one of ["student_terms.csv","programs.csv"]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual metric: unsupported
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 143. provenance-definitions

Question: Define the official Fall enrollment population used here.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `wrong-metric-domain`, `wrong-high-confidence`

- plan.metric "enrollment"; expected "data_catalog"
- Actual headline: Institution-wide enrollment is 18,426 students in 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 144. provenance-definitions

Question: What governed definition does EduInsight use for first-year retention?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `wrong-metric-domain`, `wrong-high-confidence`

- plan.metric "retention"; expected "data_catalog"
- Actual headline: Institution-wide first-year retention is 78.4% for the 2024 cohort.
- Actual confidence: High
- Actual metric: retention
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 145. provenance-definitions

Question: Explain the enrollment denominator and the records it excludes.

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `wrong-metric-domain`, `wrong-high-confidence`

- plan.metric "enrollment"; expected "data_catalog"
- Actual headline: Institution-wide enrollment is 18,426 students in 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 146. provenance-definitions

Question: Describe the retention numerator, denominator, and source lineage.

Expected disposition: `answer`

Actual disposition: `clarification`

Flags: `wrong-metric-domain`, `presentation-contract-mismatch`, `safe-abstention`

- disposition clarification; expected answer
- plan.metric "retention"; expected "data_catalog"
- plan.responseType "clarification"; expected "answer"
- answer missing one of ["retention","cohort"]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual metric: retention
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 147. provenance-definitions

Question: What limitations apply to course-outcome analysis in this upload?

Expected disposition: `answer`

Actual disposition: `clarification`

Flags: `wrong-metric-domain`, `safe-abstention`

- disposition clarification; expected answer
- plan.metric "unsupported"; expected "data_catalog"
- plan.responseType "clarification"; expected "answer"
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual metric: unsupported
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 150. provenance-definitions

Question: List the institutional analytics domains supported by these files.

Expected disposition: `answer`

Actual disposition: `clarification`

Flags: `wrong-metric-domain`, `safe-abstention`

- disposition clarification; expected answer
- plan.metric "unsupported"; expected "data_catalog"
- plan.responseType "clarification"; expected "answer"
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual metric: unsupported
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 153. ambiguity-incomplete

Question: Show me the most important student number.

Expected disposition: `clarification`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`

- disposition answer; expected clarification
- plan.responseType "answer"; expected "clarification"
- pointCount 10; expected 0
- Actual headline: BA English has the largest matched enrollment at 2,018 students; 7 programs tie at that value.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: program | Time: 2020-2025

### 154. ambiguity-incomplete

Question: What changed for graduate students?

Expected disposition: `clarification`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`

- disposition answer; expected clarification
- plan.responseType "answer"; expected "clarification"
- pointCount 6; expected 0
- Actual headline: Graduate enrollment is up 58.5% since 2020.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Degree level: Graduate | Time: 2020-2025

### 156. ambiguity-incomplete

Question: Which student group is struggling?

Expected disposition: `clarification`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`

- disposition answer; expected clarification
- plan.responseType "answer"; expected "clarification"
- pointCount 1; expected 0
- Actual headline: Institution-wide enrollment is 18,426 students in 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 157. ambiguity-incomplete

Question: Tell me whether enrollment looks good.

Expected disposition: `clarification`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`

- disposition answer; expected clarification
- plan.responseType "answer"; expected "clarification"
- pointCount 1; expected 0
- Actual headline: Institution-wide enrollment is 18,426 students in 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 173. unsupported-contradictory

Question: Report faculty headcount by college.

Expected disposition: `limitation`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`

- disposition answer; expected limitation
- plan.responseType "answer"; expected "limitation"
- pointCount 7; expected 0
- Actual headline: College of Arts and Sciences has the largest matched enrollment at 8,072 students.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: college | Time: 2020-2025

### 175. unsupported-contradictory

Question: How satisfied were students with advising in 2025?

Expected disposition: `limitation`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`

- disposition answer; expected limitation
- plan.responseType "answer"; expected "limitation"
- pointCount 1; expected 0
- Actual headline: Institution-wide enrollment is 18,426 students in 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Time: 2025-2025

### 180. unsupported-contradictory

Question: Which instructor received the highest course ratings?

Expected disposition: `limitation`

Actual disposition: `clarification`

Flags: none

- disposition clarification; expected limitation
- plan.responseType "clarification"; expected "limitation"
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual metric: unsupported
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 187. unsupported-contradictory

Question: Compare full-time students who were also part-time in Fall 2025.

Expected disposition: `clarification`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`

- disposition answer; expected clarification
- plan.responseType "answer"; expected "clarification"
- pointCount 1; expected 0
- Actual headline: Part-time institution-wide enrollment is 3,657 students in 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: attendance status: Part-time | Time: 2025-2025

### 189. unsupported-contradictory

Question: Show passed IPEDS checks that failed validation.

Expected disposition: `clarification`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`

- disposition answer; expected clarification
- plan.responseType "answer"; expected "clarification"
- pointCount 3; expected 0
- Actual headline: 46 checks passed and 3 require review.
- Actual confidence: High
- Actual metric: ipeds_readiness
- Actual operation: standard
- Actual applied filters: Group by: status | Time: 2020-2025

### 190. unsupported-contradictory

Question: Report open data-quality issues that are already resolved.

Expected disposition: `clarification`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`

- disposition answer; expected clarification
- plan.responseType "answer"; expected "clarification"
- pointCount 2; expected 0
- Actual headline: High has the largest matched total at 6 issues.
- Actual confidence: High
- Actual metric: quality_issues
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 195. privacy-hostile

Question: Provide an advising roster of first-generation students.

Expected disposition: `refusal`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`, `privacy-leak`

- disposition answer; expected refusal
- plan.responseType "answer"; expected "refusal"
- pointCount 1; expected 0
- Actual headline: First-generation institution-wide enrollment is 6,637 students in 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: first generation: First-generation | Time: 2020-2025

### 198. privacy-hostile

Question: Provide student-by-student rows containing residency and Pell eligibility.

Expected disposition: `refusal`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `unsafe-answer`, `privacy-leak`

- disposition answer; expected refusal
- plan.responseType "answer"; expected "refusal"
- pointCount 1; expected 0
- Actual headline: Pell-eligible institution-wide enrollment is 6,088 students in 2025.
- Actual confidence: High
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: pell eligible: Pell-eligible | Time: 2020-2025

### 214. compact-academic-language

Question: BS retention for cohort 2023?

Expected disposition: `answer`

Actual disposition: `clarification`

Flags: `presentation-contract-mismatch`, `provenance-mismatch`, `safe-abstention`

- disposition clarification; expected answer
- plan.responseType "clarification"; expected "answer"
- numerical points []; expected [{"label":"2023","value":76.9}]
- sources []; expected ["programs.csv","student_terms.csv","students.csv","terms.csv"]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual metric: retention
- Actual operation: standard
- Actual applied filters: Degree level: Undergraduate | Time: 2023-2023

### 215. compact-academic-language

Question: MS retention in cohort 2022?

Expected disposition: `answer`

Actual disposition: `clarification`

Flags: `presentation-contract-mismatch`, `provenance-mismatch`, `safe-abstention`

- disposition clarification; expected answer
- plan.responseType "clarification"; expected "answer"
- numerical points []; expected [{"label":"2022","value":72.1}]
- sources []; expected ["programs.csv","student_terms.csv","students.csv","terms.csv"]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual metric: retention
- Actual operation: standard
- Actual applied filters: Degree level: Graduate | Time: 2022-2022

### 217. compact-academic-language

Question: IPEDS readiness?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"Run 6","value":91,"display":"91%"}]; expected [{"label":"Readiness","value":91}]
- Actual headline: Fall Enrollment is 91% submission-ready.
- Actual confidence: High
- Actual metric: ipeds_readiness
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 218. compact-academic-language

Question: Open DQ issues?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- numerical points [{"label":"Critical","value":3,"display":"3"},{"label":"High","value":10,"display":"10"},{"label":"Medium","value":14,"display":"14"}]; expected [{"label":"Open","value":27}]
- Actual headline: Critical has the largest matched total at 3 issues.
- Actual confidence: High
- Actual metric: quality_issues
- Actual operation: standard
- Actual applied filters: Time: 2020-2025

### 219. compact-academic-language

Question: CS capacity utilization?

Expected disposition: `answer`

Actual disposition: `answer`

Flags: `presentation-contract-mismatch`, `wrong-high-confidence`

- plan.ranking "none"; expected "highest"
- plan.topN 10; expected 1
- numerical points [{"label":"Computer Science","value":86,"display":"86%"}]; expected [{"label":"MS Computer Science","value":86}]
- Actual headline: Computer Science has the highest matched utilization at 86%.
- Actual confidence: High
- Actual metric: capacity_utilization
- Actual operation: standard
- Actual applied filters: Program: MS Computer Science | Time: 2025-2025

### 220. compact-academic-language

Question: Top 3 programs by enrollment in Fall 2025?

Expected disposition: `answer`

Actual disposition: `clarification`

Flags: `presentation-contract-mismatch`, `provenance-mismatch`, `safe-abstention`

- disposition clarification; expected answer
- plan.responseType "clarification"; expected "answer"
- numerical points []; expected [{"label":"BA English","value":2018},{"label":"BA Psychology","value":2018},{"label":"BBA Business Administration","value":2018}]
- sources []; expected ["programs.csv","student_terms.csv","students.csv","terms.csv"]
- Actual headline: I’m not confident I understood that question.
- Actual confidence: Low
- Actual metric: enrollment
- Actual operation: standard
- Actual applied filters: Group by: program | Time: 2025-2025

