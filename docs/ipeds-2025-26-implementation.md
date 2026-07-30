# IPEDS reporting center — 2025–26 implementation record

## Verified survey scope

EduInsight now loads the survey catalog from
`data/ipeds/specs/2025-26/survey-catalog.json`; the UI does not hardcode the
component list.

The active catalog contains 12 components:

- Fall: IC, C, E12, CST
- Winter: ADM, GR, GR200, OM, SFA
- Spring: EF, F, HR

Academic Libraries (AL) is retained only in the retired-component record because
NCES retired it beginning with the 2025–26 collection.

Authoritative references:

- https://nces.ed.gov/ipeds/report-your-data/archived-changes
- https://nces.ed.gov/ipeds/use-the-data/annual-survey-forms-packages-archived
- https://nces.ed.gov/ipeds/report-your-data/overview-survey-components-data-cycle

## Generator coverage

### Completions (C / COM)

Status: complete generator.

Pipeline:

1. Governed completion, student, and program rows
2. Prepared IPEDS-coded contract
3. Aggregated completion cells
4. Validated key-value text and human-readable review CSV

The upload total reconciles exactly to the distinct governed completer count.
Distance-education status and second majors remain explicit manual-review
assumptions.

### Fall Enrollment (EF / EF1)

Status: governed partial package.

Generated from the current warehouse:

- Part A — level, attendance status, race/ethnicity, and sex
- Part B — age, level, attendance status, and sex
- Part D — new non-degree undergraduate entrants
- Part H — unknown-sex totals by level

Blocked rather than fabricated:

- Part C — admission-state FIPS and recent-high-school-graduate fields missing
- Part E — official cohort inclusion/exclusion fields missing
- Part F — official student-to-faculty ratio missing
- Part G — distance-education status and location FIPS fields missing

The generated Parts A/H reconcile exactly to the governed Fall 2025 census.
Because the survey package is incomplete, the UI will not allow it to be marked
ready for keyholder upload.

Implementation references:

- https://alisonlanski.github.io/IPEDSuploadables/articles/setup_for_fallenrollment.html
- https://alisonlanski.github.io/IPEDSuploadables/articles/use_fallenrollment.html
- https://github.com/AlisonLanski/IPEDSuploadables/blob/master/R/make_ef1_part_A.R
- https://github.com/AlisonLanski/IPEDSuploadables/blob/master/R/make_ef1_part_B.R
- https://github.com/AlisonLanski/IPEDSuploadables/blob/master/R/make_ef1_part_D.R
- https://github.com/AlisonLanski/IPEDSuploadables/blob/master/R/make_ef1_part_H.R

## SFA prerequisite

`financial_aid.csv` now distinguishes:

- `pell_eligible`
- `pell_recipient`
- `pell_amount`

This closes the Pell-recipient modeling prerequisite, but no SFA generator is
enabled until the full official aid-category, amount, cohort, and reconciliation
contract is implemented.

## Annual-change controls

The current catalog, COM specification, EF specification, and annual diff are
versioned JSON records under `data/ipeds/specs/2025-26/`.

The UI:

- shows the active catalog version and verification date;
- displays the current annual changes;
- requires an explicit human acknowledgment before a package can be marked
  ready;
- keeps unsupported components visible with a precise missing-data reason.

Every new collection cycle must add a new version rather than overwrite the
prior version.

## Keyholder handoff semantics and persistence

“Mark ready for keyholder” does not claim to submit or lock a survey in NCES.
It:

1. requires generation, zero structural/reconciliation failures, written
   variance explanations, annual-change acknowledgment, and a complete package;
2. verifies at the API boundary that the artifact exactly matches the current
   governed COM package;
3. stores the frozen aggregated text artifact in R2;
4. records the filename, SHA-256, spec version, approver, timestamp, validation
   summary, explanations, and status in D1;
5. exposes the persisted record in the audit drawer after reload.

The institution-facing filename convention is:

`<UNITID>_<SURVEY_CODE>_<COLLECTION_YEAR>_<STATUS>.txt`

NCES validates the file content; EduInsight clearly labels the filename as an
internal recordkeeping convention.
