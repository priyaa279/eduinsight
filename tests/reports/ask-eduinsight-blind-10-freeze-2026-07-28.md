# Ask EduInsight — Blind Set #10 freeze record

Date: 2026-07-28
Status: local frozen candidate; not published

## Product contract

This freeze uses the local deterministic execution path:

```text
question-quality check
  -> local semantic parser
  -> strict governed-plan validation
  -> deterministic governed calculation
  -> sourced answer
```

No external language-model API, API key, credit, or token-based service is part
of the runtime.

## Frozen boundary hashes

Bundle hashes use SHA-256 over a UTF-8 manifest containing sorted
`relative/path=file_sha256` lines.

| Boundary | Files | SHA-256 |
|---|---:|---|
| Ask engine, local parser/validators, UI/API contract, package/docs | 26 | `0afa66658223e50e622900719e917c01eefe10df8eff4b93d1b22bfd4f52647a` |
| Governed generated data and source upload | 23 | `77bd1d0ac346ca04232581e6d40f30bca516b89009822c8b5c11da59477d3f51` |
| Known executable release bank, excluding future Blind #10 files | 32 | `a9e6ef815a5febf4a1ce61a3973fe762ba4e9383820ed9663a672b06012764c6` |

Key files:

- `lib/ask-engine.mjs`: `da9844e70e40dddd97a7108215d0ebe2f62a67c414139130b70082f596f0a459`
- `app/data/ask-eduinsight.generated.json`: `e9b817aeb98c6c3fafcf5547f323c77855f3e6c7bcdf06c251e787de472a6733`
- `package.json`: `6312f9ca2d505aab5aa8cdb6a6dd6cd16aa6372f10d985cf50a0c367914fa3ff`

The Git freeze commit and tag are recorded after this report is committed.

## Pre-freeze verification

- Complete known release bank: **2,113/2,113 adjudicated requirements**
- Blind #9 adjudicated regression: **220/220**
- Privacy refusals in Blind #9: **10/10**
- Remaining adjudicated wrong high-confidence defects: **0**
- Remaining adjudicated silent filter drops: **0**
- Remaining privacy leaks: **0**
- Remaining crashes: **0**
- Production build: passed
- Rendered workspace test: passed
- Lint: **0 errors**, 12 existing unused-variable warnings

## Blind #10 execution protocol

1. Commit and tag this exact local candidate.
2. Construct a new suite with no exact question collisions against the known
   executable test corpus.
3. Do not change the frozen implementation, governed data, privacy policy, or
   known release bank while constructing, sealing, or running Blind #10.
4. Seal the suite, oracle, preflight, and evaluation runner before execution.
5. Run the evaluation once.
6. Preserve the untouched score, classifications, hashes, and report.
7. Do not remediate or rerun before user review.

Finish gates for the untouched run:

- zero wrong high-confidence answers;
- zero silent filter drops;
- 100% privacy handling;
- zero crashes; and
- clear supported questions answered correctly, with safe clarification,
  limitation, or refusal for requests that should not execute.
