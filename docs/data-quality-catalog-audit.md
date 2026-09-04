# EduInsight data-quality catalog audit

Audit date: 2026-07-29  
Reference: `ask-dq-ipeds-spec.md`, section 2  
Live source package: `data/sample-university-upload`

## Covered by the live implementation

| Specification check | Live implementation | Notes |
|---|---|---|
| Full-time status vs attempted credits | `UG_FT_CREDIT_THRESHOLD` | Record-level samples are derived from `student_terms.csv`. |
| Race/ethnicity blank | `DEMOGRAPHIC_COMPLETENESS` | Record-level samples are derived from `students.csv`. |
| Enrollment status code validity | `ENROLLMENT_STATUS_VALID` | Executed from `student_terms.csv`. |
| Program active-date validation | `ACTIVE_PROGRAM_REFERENCE` | Executed from student-term and program rows. |
| Duplicate enrollment rows | `DUPLICATE_ENROLLMENT` | Uses the governed student + term + program grain. |
| Age at entry | `AGE_AT_ENTRY_RANGE` | Derived from birth year and governed entry-term start. |
| Term reference | `TERM_REFERENCE` | Executed from student-term and term keys. |
| Completion enrollment history | `COMPLETION_WITH_ENROLLMENT` | Executed from completion and student-term rows. |
| Completion CIP format | `CIP_FORMAT_VALID` | Executed from completion-to-program joins. |
| Completion timeline | `COMPLETION_TIMELINE` | Uses the documented synthetic single-career first-entry contract. |
| Aid without enrollment | `AID_WITHOUT_ENROLLMENT` | Row-level financial-aid evidence is evaluated from `financial_aid.csv`. |
| Section over capacity | `SECTION_OVER_CAPACITY` | Executed from section capacity and enrolled registration rows. |
| Year-over-year headcount variance | `YOY_HEADCOUNT_VARIANCE` | Implemented as the existing Fall census variance finding. |
| Referential integrity | `REFERENTIAL_INTEGRITY` | Twelve declared current source relationships are evaluated. |

## Covered under a different name or layer

| Specification check | Existing coverage | Gap |
|---|---|---|
| Program/CIP validity | Program foreign keys + COM `CIP_FORMAT_VALID` validation | Taxonomy membership beyond numeric `xx.xxxx` formatting still requires an authoritative CIP reference table. |
| Award-level validity | COM `AWLEVEL_VALID` validation | Enforced during IPEDS package construction, not yet as a recurring warehouse DQ scan. |
| Duplicate completion rows | Unique `completion_id` plus COM reconciliation | A dedicated student + program + award-date duplicate rule remains pending. |
| Enrollment row uniqueness | `DUPLICATE_ENROLLMENT` | The evaluator now uses student + term + program as the composite key. |

## Cataloged but not yet implemented

The Rule Catalog now exposes these checks as disabled rather than implying that they run:

- Credits earned versus attempted
- Negative credit values
- Term GPA range
- Race, sex/gender, and residency code-set validation
- Small-cell privacy screening
- Aid amount range and Pell reconciliation
- Empty active section, missing faculty, faculty FTE, and schedule conflicts
- General coded-column schema drift
- Table row-count anomaly
- Completion-count and aid-total anomaly detection
- Historical CIP effective dating
- Potential duplicate identity matching

Unavailable rules remain `NOT_EVALUATED` with a structured capability reason. They are not treated as passes or active findings.

## Display verification

- Every finding row includes a durable lifecycle chip: Open, In Review, Resolved, or Suppressed.
- The detail panel uses the generated `sampleRows` field.
- Aggregate anomalies are labeled as observations and do not report the magnitude as defective records.
