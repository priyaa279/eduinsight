# EduInsight model-parser verification

Date: 2026-07-27

Status: **Local contract verification passed; live OpenAI invocation not run
because `OPENAI_API_KEY` is not configured. Blind #9 remains blocked.**

No project files contain an API credential, no browser-public OpenAI environment
variable was found, Blind #9 was not created, and nothing was published.

## Changes verified

- Responses API semantic parsing is isolated behind the server-side request
  service.
- Privacy governance runs before any model call.
- Only the question, governed catalog metadata, capability flags, supported
  values, and a closed JSON schema are sent to the model boundary.
- Student-level records and aggregate fact rows are not added to the request.
- Model JSON is revalidated locally against the closed candidate schema.
- Candidate plans still pass deterministic catalog canonicalization, evidence
  reconciliation, semantic validation, filter conservation, source-integrity
  checks, deterministic execution, provenance, and confidence logic.
- Model calls have a bounded abort timeout.
- HTTP errors, timeouts, malformed JSON, schema-invalid output, incomplete
  output, and an unavailable key cannot execute an unvalidated model plan.
- Upstream diagnostics and credentials are not returned to the UI.
- The UI distinguishes model, local fallback, local-only, and pre-model policy
  modes.

## Separate path results

| Gate | Result |
|---|---:|
| Model-path contract tests with an injected Responses API transport | 8/8 |
| Fallback-path tests | 6/6 |
| Planner presentation states | 4/4 |
| Semantic plan tests | 10/10 |
| Candidate/parser boundary tests | 11/11 |
| Adversarial tests | 25/25 |
| Systemic/privacy/governance tests | 47/47 |
| Rendered HTML | 1/1 |
| Browser critical assertions | 7/7 |
| Build | Pass |
| Lint | 0 errors, 12 existing warnings |
| Secret/public-key/log exposure scan | Pass |
| Live configured OpenAI model path | **Skipped — key unavailable** |

The injected model-path tests assert that the Responses API transport was
called, the accepted plan has `parser=model`, a deterministic result was
calculated only after validation, and the returned API/UI object does not
contain the test credential. The fallback tests separately cover no key, HTTP
failure, timeout, malformed JSON, schema-invalid JSON, and incomplete output.

## Complete known release bank

The final `npm run test:ask-release` command exited successfully.

| Suite | Raw result | Adjudicated known requirement result |
|---|---:|---:|
| Original regression | 184/184 | 184/184 |
| Blind #1 regression | 100/100 | 100/100 |
| Blind #2 regression | 180/180 | 180/180 |
| Blind #3 regression | 244/250 | 250/250 |
| Blind #4 regression | 276/285 | 285/285 |
| Blind #5 regression | 268/280 | 280/280 |
| Blind #6 regression | 259/260 | 260/260 |
| Blind #7 regression | 247/250 | 250/250 |

The raw/adjudicated distinction is preserved. The adjudicated totals include
documented oracle, UX-contract, or test-contract conflicts; raw outputs were not
rewritten to claim perfect scores.

## Browser assertions

The current local build was exercised through the rendered application:

1. Computer Science trend returned 475, 510, 560, 600, and 678 for 2021–2025.
2. The method panel showed the validated plan, local planning mode, complete
   filter audit, confidence checks, sources, and limitations.
3. A request for names of Pell students was refused with no chart or disclosure.
4. “Which program is best?” returned clarification without selecting a metric.
5. International share returned 33.7%, with numerator 6,217 and denominator
   18,426.
6. The privacy method panel identified the pre-model policy gate.
7. The no-key percentage request identified the governed local planner.

## Required next condition

Run `npm run verify:model-live` in a server-side process with a valid
`OPENAI_API_KEY`. The script makes nine live calls across three representative
questions and requires:

- `planner=openai`;
- `plan.parser=model`;
- an accepted model plan;
- identical validated semantic-contract signatures across three repetitions.

Until that command passes, do not freeze the model/prompt/schema bundle and do
not create or run Blind #9.
