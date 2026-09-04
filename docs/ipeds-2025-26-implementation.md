# IPEDS reporting center — 2025–26 implementation record

## Verified survey scope

EduInsight loads its component catalog from `data/ipeds/specs/2025-26/survey-catalog.json` and validates generated keys against the versioned official NCES layouts in `data/ipeds/specs/2025-26/official/`.

The active catalog contains 12 components:

- Fall: IC, C, E12, and Cost I
- Winter: ADM, Cost II, GR, GR200, OM, and SFA
- Spring: EF, F, HR

Cost (`CST`) spans the Fall and Winter collection periods, so the interface labels it `Fall/Winter` rather than forcing the full component into only one period.

NCES publishes key-value import layouts for 11 of these components. Institutional Characteristics (`IC`) has no public 2025-26 import layout and remains questionnaire/review only. Academic Libraries (`AL`) is retained only as a retired-component record because it was discontinued beginning with the 2025-26 collection.

Authoritative references:

- https://surveys.nces.ed.gov/ipeds/public/survey-materials/index
- https://nces.ed.gov/ipeds/report-your-data/resource-software-providers
- https://nces.ed.gov/ipeds/use-the-data/annual-survey-forms-packages-archived
- https://nces.ed.gov/ipeds/report-your-data/overview-survey-components-data-cycle

## Shared import-file contract

Every official layout uses the same deterministic four-stage pattern:

1. Governed university source data
2. Prepared survey-specific contract
3. Aggregated NCES upload cells
4. Validated key-value `.txt` file plus a review CSV

Every package exposes the same eight validation checks: official keys, UNITID, survey section, survey part, nonnegative values, serialization, source reconciliation, and control-total reconciliation.

The application generates draft files for all 11 official layouts. A generated draft is not automatically submission-ready. Approval stays blocked whenever a required source domain or applicable survey part is missing.

The ingest pipeline also materializes the artifacts under `data/processed/ipeds/2025-26/`. Each component has an NCES key-value `.txt` file and a companion `_review.csv` file; the IPEDS Center exposes the same bytes through its download action.

## Current coverage

| Component | Import file | Current state |
|---|---|---|
| C | Generated | Source-backed and reconciled for supported award evidence; full package incomplete because distance-education and second-major evidence is unavailable |
| E12 | Generated | Modeled demo package; not source-backed for institutional keyholder review |
| EF | Generated | Modeled demo package; structurally complete demonstration artifact, not a source-backed package |
| SFA | Generated | Modeled demo package; not source-backed for institutional keyholder review |
| GR | Generated | Modeled demo package; not source-backed for institutional keyholder review |
| GR200 | Generated | Modeled demo package; not source-backed for institutional keyholder review |
| ADM | Generated | Modeled demo package; applicant funnels are demonstration values, not operational applicant records |
| CST | Generated | Modeled demo package; not source-backed for institutional keyholder review |
| OM | Generated | Source gap; completion after transfer requires National Student Clearinghouse or equivalent evidence |
| HR | Generated | Modeled demo package; not source-backed for institutional keyholder review |
| F | Generated | Source gap; audited general-ledger detail is unavailable |
| IC | Not applicable | Official public NCES catalog exposes no import layout |

Modeled demo packages demonstrate file construction and structural validation only. They must be replaced with governed university extracts before institutional keyholder review. Finance remains a source gap rather than a modeled source-backed package.

Missing survey parts are intentionally left blank rather than estimated when the required fact is outside the institution’s modeled sources. In particular, Outcome Measures completion after transfer remains blocked because it requires National Student Clearinghouse data.

The 2025-26 NCES layouts also clarify two scope points:

- CST Part F is for doctor’s-professional-practice charges; it is not a CIP/program-level cost schedule.
- HR contains new-hire and salary sections, but it does not contain a separations section or generic salary-band fields.

## Completions source grain and limitations

The current Completions source contains **1,056 award/completion records**. Its upload-cell reconciliation is performed at that award-record grain. The current synthetic file also contains **1,056 distinct completers**, but that equality is dataset-specific: one person may receive multiple awards, so award count and distinct completer count are separate governed measures.

Two source limitations remain surfaced rather than silently inferred:

- Distance-education status is unavailable per CIP and award level; the package remains incomplete rather than inventing a value.
- Second-major evidence is unavailable; the package remains incomplete rather than asserting that every award is a first major.

## Institutional review and approval workflow

“Approve package” does not submit anything to NCES. It requires:

1. a generated artifact;
2. zero structural and reconciliation failures;
3. a complete package with no explicit blockers;
4. written explanations for year-over-year review items;
5. annual-change acknowledgment.

At approval, the API verifies the artifact against the current governed package, freezes the text, calculates a SHA-256 hash, and records the filename, spec version, approver, timestamp, validation summary, explanations, and status.

The internal filename convention is:

`<UNITID>_<SURVEY_CODE>_<COLLECTION_YEAR>_<STATUS>.txt`

The file body follows the official NCES key-value layout. NCES remains the final validator and submission system.
