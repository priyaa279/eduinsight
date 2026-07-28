# EduInsight no-API contract verification

Date: 2026-07-28

## Product contract

Ask EduInsight now uses this active runtime path:

```text
question-quality check
  -> local semantic parser
  -> strict governed-plan validation
  -> deterministic calculation
  -> sourced answer
```

The runtime does not use an OpenAI API key, an external language model, API
credits, or token-based inference. The prior external semantic-parser client,
credential configuration, live-verification script, model-path tests, fallback
tests, and model-specific UI states were removed.

## Required behavior

- Clear, complete, supported English question: execute locally.
- Complete questions may use governed academic abbreviations such as MS, BS,
  CS, grad, undergrad, intl, FT/PT, IPEDS, DFW, HC, pct, and FA25.
- Compact requests execute when the governed metric, subject, and required time
  are explicit, such as `CS enrollment in 2024?`.
- Unresolved shorthand-heavy requests or incomplete fragments: ask for a
  full-English rephrase.
- Ambiguous metric, entity, or relative date: ask a targeted clarification.
- Contradictory filters: explain the conflict without executing.
- Unsupported domain: return a governed source limitation.
- Student-level, personally identifiable, or governance-bypassing request:
  refuse.
- Detected but unapplied constraint: fail closed with no number or chart.

## Verification results

The complete `npm run test:ask-release` command completed successfully:

- Core regression: 184/184.
- Blind #1 contract regression: 100/100.
- Blind #2 contract regression: 180/180.
- Blind #3 adjudicated regression: 250/250.
- Blind #4 no-API contract regression: 285/285.
- Blind #5 no-API contract regression: 280/280.
- Blind #6 adjudicated regression: 260/260.
- Blind #7 no-API contract regression: 250/250.
- Semantic-plan tests: 10/10.
- Local semantic-parser boundary tests: 5/5.
- No-API runtime contract tests: 14/14.
- Planner-presentation tests: 3/3.
- Adversarial tests: 25/25.
- Systemic invariants: 47/47.

The known release bank therefore satisfies 1,893/1,893 adjudicated contract
requirements. Original untouched first-run blind reports remain preserved.
Questions that are deliberately outside the new full-English grammar pass only
when they produce a safe clarification with no number, chart, source list, or
High-confidence label.

Additional verification:

- Ask-engine and server-render tests: 21/21.
- Production build: passed.
- Lint: 0 errors and 12 pre-existing unused-variable warnings.
- Browser critical flows: 7/7.
  - Clear, filtered Computer Science question rendered 234 students.
  - Method panel showed `local deterministic planner`.
  - Method panel confirmed every detected filter was applied.
  - Shorthand request rendered a clarification and no assumption.
  - Ambiguous relative date requested an exact Fall term or cohort year.
  - Unsupported faculty-salary request rendered a source limitation.
  - Sensitive student-name request rendered a privacy refusal.
  - Contradictory domestic/international filters rendered a clarification.
- Governed-abbreviation browser checks: 3/3.
  - `MS CS` rendered the governed MS Computer Science trend and all five
    reconciled yearly values.
  - `intl CS` plus `FA25` retained the program, residency, and term filters and
    rendered 234 students.
  - The incomplete `intl cs fall25` fragment still rendered a clarification,
    made no assumption, and did not reuse the prior answer.
- Compact-request browser checks: 2/2.
  - `CS enrollment in 2024?` rendered the governed Computer Science value of
    600, catalog lineage to MS Computer Science (PCS), local-planner provenance,
    and a complete filter audit.
  - `CS 2025` rendered a clarification, made no assumption, and did not reuse
    the preceding 2024 result because the metric was missing.

## Preserved evaluation state

Blind #8 artifacts remain unchanged:

- `tests/reports/blind-8-first-run.md`:
  `85D3E5F9CF46E3D9020DF7924F20BB4C3A5BB1A91736EEBC293FA71C6CC933FB`
- `tests/blind-8-seal.json`:
  `CB3EBAF2C2663904E3F92B25DBCCA11364C345032CF30AB159501EEEAABD9AF8`
- `tests/ask-engine-blind-8-suite.mjs`:
  `C4C7BD17C6B09AFF02C101880E789FED7F2FE47F82ED74D5AAC053CE9FBF54F3`
- `tests/blind-8-oracle.mjs`:
  `F7760F963914EDE242398D8CC9719A5B427E48D4682A157670259B9EEFAF057F`

Blind #9 was not created. Nothing was published.
