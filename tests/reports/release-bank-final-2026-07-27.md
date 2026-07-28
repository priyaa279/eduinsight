# EduInsight known release-bank verification

- Verification date: 2026-07-27 (America/Los_Angeles)
- Final engine SHA-256: `4dbd845c19e5c287f127b2cdaefc9f2bfea3e50c45b42f56175f9b39f66ba628`
- Status: **PASS for the complete known/adjudicated release bank**
- Publishing: not performed
- Blind Set #8: not created or run

## Release-bank results

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
| Adversarial tests | 25/25 |
| Systemic invariants | 47/47 |
| **Total known/adjudicated requirements** | **1,861/1,861** |

Blind Set #6 has 259 raw passes plus one independently verified trend-contract conflict.
Blind Set #7 has 247 raw passes plus three independently verified oracle/contract conflicts.
These are reported as adjudicated regressions and are not represented as untouched blind scores.

## Build, rendered output, lint, and browser

- Production build: passed.
- Rendered HTML test: 1/1 passed.
- ESLint: exit code 0; 0 errors and 12 unused-variable warnings.
- Browser critical-flow validation:
  - supported multi-filter query rendered the governed value and all applied filters;
  - method and source provenance matched the structured response;
  - ambiguous input rendered a clarification without a fabricated metric;
  - unsupported input rendered a limitation without an unrelated chart;
  - privacy-sensitive input rendered a privacy refusal and disclosed no records;
  - repeated governed queries returned the same result;
  - the 390-pixel mobile viewport had no horizontal overflow;
  - the browser console contained no warnings or errors.

## Preserved untouched first-run evidence

| Blind set | Untouched score | Suite SHA-256 | Frozen engine SHA-256 |
|---|---:|---|---|
| #3 | 137/250 (54.8%) | `7811f1d3e9ca1834a5ad904d4fd24ba0ee3b4a8ab40a818ccb754138af10fa4d` | Not recorded in the original report |
| #4 | 166/285 (58.2%) | `704bb10994024598476da105a7a4e33e65ee8e989cb6f2f84c6d33b1252cb591` | `3b4fb42af893360fd79fffc9eac036e1fe546c08f026ff9f4d2c0071d0e445db` |
| #5 | 167/280 (59.6%) | `f90609146456d027cd335b65a5d5e61c07717210adec1099d29f12a5ef8e6f68` | `7f2f55e68d9c62e1064f615001f921073644e8fc8d64e3f9785302ca0978a113` |
| #6 | 203/260 (78.1%) | `958ee05571a68ff69e518a43680a1f64e87e9450361a0a0a3de229193c3edcef` | `26afd44e535efa5351b4f7f1b33853ad0d18d6f26932493f77ef9d6d426ac161` |
| #7 | 174/250 (69.6%) | `cc9647aa6c57f3b93470a07bf0b6a3f4fbf077d9583040a20f21eec16923f582` | `e3427ac5659ca2251828531691cf48da2b3909f8a22f2e71c23207c43cc53626` |

The untouched reports remain under `tests/reports/blind-*-first-run.md`. Their original scores must remain distinct from post-remediation regression results.

## Architecture checkpoint before another blind set

`lib/ask-engine.mjs` currently contains about 4,459 physical lines, 68 function declarations,
177 normalization replacement calls, 214 regular-expression test calls, and approximately
589 regular-expression literals.

The engine has a sound structured core: local planning produces explicit metric, operation,
time, program, population, grouping, ranking, response directive, and filter-audit fields;
execution is separated into governed domain answer functions; source-integrity, confidence,
privacy, and finalization checks run around that plan.

The main generalization risk is concentrated in question understanding. Normalization,
entity resolution, intent routing, operation inference, clarification rules, and plan
construction remain co-located in one large, regular-expression-heavy module. The untouched
Blind #3-#7 scores show that perfect known-regression performance is not yet proof of stable
unseen-language performance.

Before Blind Set #8, the recommended next milestone is an architecture review/refactor that:

1. Defines a typed intermediate analysis plan and validation contract.
2. Separates lexical normalization from semantic intent and entity resolution.
3. Records evidence and confidence for every detected metric, entity, filter, and time phrase.
4. Rejects or clarifies unresolved, conflicting, or partially applied constraints before execution.
5. Keeps regular expressions as bounded lexical adapters rather than the primary routing architecture.
6. Preserves all current numerical, privacy, provenance, confidence, and safe-failure regressions.

The engine is frozen at the SHA above pending approval for that architecture work. A fresh Blind
Set #8 should be constructed only after the architecture decision and should remain untouched
until its single first-run score is preserved.
