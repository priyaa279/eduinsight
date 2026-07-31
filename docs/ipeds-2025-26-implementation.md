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

Every official layout uses the same deterministic three-stage pattern:

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
| C | Generated | Buildable; distance-education-per-CIP and second-major assumptions remain visible |
| E12 | Generated | Buildable from the annual enrollment mart |
| EF | Generated | Buildable; Parts A–H are represented |
| SFA | Generated | Buildable from the governed financial-aid mart |
| GR | Generated | Buildable from the governed cohort mart |
| GR200 | Generated | Buildable from the governed cohort mart |
| ADM | Generated | Complete modeled package; first-time and transfer funnels are estimated from governed enrolled headcount and visibly caveated |
| CST | Generated | Complete applicable package; official Part F is not applicable because Atlas Valley has no doctor’s-professional-practice program |
| OM | Generated | Partial; completion after transfer remains blocked on National Student Clearinghouse data |
| HR | Generated | Complete applicable package; official census, graduate-assistant, salary, and new-hire sections are included |
| F | Generated | Partial; selected controls are available, but full official GASB statement and Census schedules require audited general-ledger detail |
| IC | Not applicable | Official public NCES catalog exposes no import layout |

The admissions funnel is labeled as an estimate derived from enrolled headcount, not as applicant-tracking data. The finance mart is labeled as a modeled aggregate summary. Both demonstrate the import pipeline and must be replaced with governed university extracts before a real submission.

Missing survey parts are intentionally left blank rather than estimated when the required fact is outside the institution’s modeled sources. In particular, Outcome Measures completion after transfer remains blocked because it requires National Student Clearinghouse data.

The 2025-26 NCES layouts also clarify two scope points:

- CST Part F is for doctor’s-professional-practice charges; it is not a CIP/program-level cost schedule.
- HR contains new-hire and salary sections, but it does not contain a separations section or generic salary-band fields.

## Completions assumptions

The Completions file reconciles exactly to the distinct governed completer count. Two limitations remain surfaced rather than silently inferred:

- Distance-education status is not modeled per CIP; generated cells carry a conservative assumption and manual-review marker.
- Second majors are not modeled; `MajorNumber` remains 1.

## Approval and keyholder handoff

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
