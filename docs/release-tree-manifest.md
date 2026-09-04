# EduInsight final release-tree classification

This manifest classifies every path that was modified or untracked at the start
of the final release cleanup. Path groups are mutually exclusive. Historical
evidence remains separate from current runtime truth.

| Class | Count | Included paths | Release treatment |
| --- | ---: | --- | --- |
| A. Required release source | 52 | `.gitignore`; `package.json`; the six modified application/API/UI files under `app/` excluding generated data and the removed auth file; three current IPEDS specification files under `data/ipeds/specs/2025-26/`; all 37 modified/new `lib/` files; all three modified `scripts/` files; `types/cloudflare-workers.d.ts` | Include |
| B. Required test | 48 | Every modified/new `tests/*.mjs` file outside `tests/reports/` | Include |
| C. Required generated runtime artifact | 31 | Eight `app/data/*.json` artifacts; all 16 modified artifacts under `data/processed/`; seven current `tests/reports/*-latest.md` reports | Include; regenerate through governed build/test commands |
| D. Current documentation | 8 | `README.md`; `EDUINSIGHT-DOSSIER.md`; `data/command-center/README.md`; `data/sample-university-upload/README.md`; all four current `docs/*.md` files including this manifest | Include |
| E. Historical/frozen evidence | 5 | Four legacy presentation-fixture CSVs under `data/command-center/`; `tests/reports/ask-adjudication-reaudit-2026-08-21.md` | Include without rewriting historical meaning |
| F. Local runtime/cache | 2 removed | `.runtime/`; `tsconfig.tsbuildinfo` | Remove and ignore |
| G. Temporary audit output | 0 | None remained after classification | Exclude |
| H. Obsolete/unreferenced | 1 removed | `app/chatgpt-auth.ts` | Remove; it was unreferenced and contradicted the no-external-LLM contract |
| I. Needs review | 0 | None | — |

The four legacy Command Center CSVs are retained because their adjacent README
explicitly labels them historical presentation evidence and the current builder
does not read them. Current generated truth lives in `app/data/` and
`data/processed/`.

The required deployment source explicitly includes
`lib/ipeds-validation-presentation.mjs`,
`tests/ipeds-completions-action-flow.test.mjs`, and
`tests/ipeds-validation-workflow-state.test.mjs`; these current workflow files
must not be omitted merely because they began the release audit as untracked.

The final intended release set therefore includes all classes A–E, excludes
classes F–H as stated above, and contains no class-I ambiguity.
