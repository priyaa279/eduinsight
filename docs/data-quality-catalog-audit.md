# EduInsight data-quality catalog audit

Audit date: 2026-07-29  
Reference: `ask-dq-ipeds-spec.md`, section 2  
Live source package: `data/sample-university-upload`

## Covered by the live implementation

| Specification check | Live implementation | Notes |
|---|---|---|
| Full-time status vs attempted credits | `UG_FT_CREDIT_THRESHOLD` | Record-level samples are derived from `student_terms.csv`. |
| Race/ethnicity blank | `DEMOGRAPHIC_COMPLETENESS` | Record-level samples are derived from `students.csv`. |
| Aid without enrollment | `AID_WITHOUT_ENROLLMENT` | The supplied source contains an aggregate finding; row-level aid records are not currently uploaded. |
| Year-over-year headcount variance | `YOY_HEADCOUNT_VARIANCE` | Implemented as the existing Fall census variance finding. |
| CIP effective dating | `CIP_EFFECTIVE_DATING` | Program catalog rows are shown for review. |
| Referential integrity | ingestion pipeline foreign-key checks | Eight current foreign-key paths are enforced across student, term, program, section, and completion sources. |

## Covered under a different name or layer

| Specification check | Existing coverage | Gap |
|---|---|---|
| Potential duplicate identities | `IDENTITY_COLLISION` finding | The current source supplies the aggregate finding, not identity-crosswalk rows. |
| Program/CIP validity | Program foreign keys + COM `CIP_FORMAT_VALID` validation | Taxonomy membership beyond numeric `xx.xxxx` formatting still requires an authoritative CIP reference table. |
| Award-level validity | COM `AWLEVEL_VALID` validation | Enforced during IPEDS package construction, not yet as a recurring warehouse DQ scan. |
| Duplicate completion rows | Unique `completion_id` plus COM reconciliation | A dedicated student + program + award-date duplicate rule remains pending. |
| Enrollment row uniqueness | Ingestion uniqueness on student + term | The source contract currently permits only one program per student-term, which is stricter than the requested student + term + program grain. |

## Cataloged but not yet implemented

The Rule Catalog now exposes these checks as disabled rather than implying that they run:

- Enrollment status code validity
- Program active-date validation
- Credits earned versus attempted
- Negative credit values
- Term GPA range
- Age-at-entry range
- Race, sex/gender, and residency code-set validation
- Small-cell privacy screening
- Completion timeline validation
- Aid amount range and Pell reconciliation
- Section capacity, empty active section, missing faculty, faculty FTE, and schedule conflicts
- General coded-column schema drift
- Table row-count anomaly
- Completion-count and aid-total anomaly detection

The existing synthetic `GOVERNANCE_RULE_*` findings are not treated as evidence that these named controls are implemented. They remain visible as source findings, but the catalog marks unimplemented specification checks as disabled.

## Display verification

- Every finding row includes a lifecycle chip: New, Investigating, Reviewed, Resolved, or Suppressed.
- The detail panel uses the generated `sampleRows` field.
- When a contributing source only supplies an aggregate finding, the UI says that row-level samples are unavailable instead of showing invented records.
