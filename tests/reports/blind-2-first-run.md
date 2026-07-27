# EduInsight Blind Set #2 — preserved first run

- Date: 2026-07-27
- Cases: 180
- Command: `npm run eval:blind2`
- Sealed file SHA-256:
  `16C0C92C6B826B5080BF38AAE17B5D59E26250DB57B3EE6BF1E990414F337734`
- Untouched result: **84/180 passed (46.7%)**
- Policy: the suite was sealed and syntax-checked before its first execution.
  No engine implementation changes were made between sealing and this run.

## Category results

| Category | Passed |
| --- | ---: |
| Messy staff language | 6/30 |
| Equivalent-question consistency | 9/20 |
| Filter permutations | 17/20 |
| Multi-filter safety | 17/20 |
| Temporal and ranking language | 3/20 |
| Unsupported and governance safety | 10/20 |
| Narrative and chart contracts | 10/20 |
| Provenance and confidence | 12/15 |
| Ambiguity and context | 0/15 |

## Failed case IDs

- Messy staff language:
  2–17, 19, 20, 22, 24, 25, 27, 28, 29.
- Equivalent-question consistency:
  32, 33, 34, 35, 37, 38, 43, 44, 45, 48, 49.
- Filter permutations:
  63, 66, 69.
- Multi-filter safety:
  77, 80, 87.
- Temporal and ranking language:
  91, 93, 95, 97–110.
- Unsupported and governance safety:
  111, 112, 113, 115, 116, 117, 118, 126, 128, 130.
- Narrative and chart contracts:
  131, 132, 133, 134, 143–147, 150.
- Provenance and confidence:
  160, 162, 165.
- Ambiguity and context:
  166–180.

## Primary failure modes

1. Abbreviations and colloquial words such as `UG`, `FT`, `PT`, `kids`,
   `probs`, `almost full`, `seats left`, and `yr over yr` are frequently
   ignored.
2. Equivalent questions can return the right number while resolving a
   different time mode or query-plan signature.
3. Filters such as gender + residency or first-generation + academic status
   can be silently dropped instead of producing a cross-tab limitation.
4. Phrases such as `beginning in`, `prior to`, `later than`, `side by side`,
   `fastest percentage growth`, and `no greater than` are not consistently
   mapped to their mathematical operators.
5. Several row-level requests return aggregate results instead of explicitly
   enforcing aggregate-only governance.
6. Vague questions often return a confident number or a generic limitation
   rather than asking a clarifying question.
7. Chart requests using `plot`, `series`, `breakdown`, `split`, or `next to
   each other` do not reliably select the requested dimension.

This suite is no longer blind after this first run. It should be promoted to
regression coverage only after the score and failures have been reported.
