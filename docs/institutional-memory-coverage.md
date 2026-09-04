# Institutional Memory coverage

Verified: 2026-07-30

The live catalog contains 89 governed records, including 81 definitions. Definitions describe both:

1. metrics and dimensions backed by a current governed source; and
2. institutional concepts that are useful to an IR office but require an additional source or approved policy before EduInsight may calculate them.

Having a definition does not make a metric submission-ready. Each entry's status and reporting-use statement identify source or policy limitations.

## IPEDS generator coverage

| Component | Required governed definitions | Coverage | Current limitation |
| --- | --- | --- | --- |
| C | Completion, Completer, CIP code, AWLEVEL, distance-education status | Covered definitions; source-backed evidence is incomplete | Award records support the current source-backed cells. Per-CIP distance-education evidence and second-major evidence are unavailable, so the full package remains blocked. |
| E12 | 12-month enrollment, unduplicated headcount, instructional activity, student FTE, distance-education status, dual enrollment | Covered | Governed annual reporting period, instructional activity, and student-level categories must remain aligned. |
| EF | Fall headcount, retention, student-to-faculty ratio, race/ethnicity, and sex reporting categories | Covered | Uses the certified Fall census and current component rules. |
| SFA | Student Financial Aid, Pell recipient, average net price | Covered | Eligibility and aid receipt remain distinct populations. |
| GR | Graduation rate within 150% of normal time, adjusted cohort, normal time | Covered | Must use the GR cohort rather than completion counts or the retention cohort. |
| GR200 | Graduation rate within 200% of normal time, normal time | Covered | Uses the applicable GR cohort with the longer completion window. |
| OM | Outcome Measures | Partially governed | Local completion and enrollment outcomes are available; subsequent enrollment elsewhere requires Clearinghouse or equivalent data. |
| ADM | Admission rate and admissions yield | Defined; source required | The present applicant funnel is estimated. A production admissions-system extract is required before certification. |
| CST | Cost of attendance, tuition and required fees, average net price | Covered | Results must identify residency, living arrangement, level, and applicable aid cohort. |
| F | Total revenue, total expenses, net position | Defined; source required | The current summary is not an audited GASB-aligned general-ledger contract. |
| HR | Instructional staff, occupation, tenure, faculty headcount, faculty FTE, instructional-staff FTE | Covered for current generated mart | Production FTE remains policy-gated until appointment-to-FTE mappings are approved. |
| IC | Control, institution level, calendar system | Covered | These header values require annual keyholder verification because they control downstream survey applicability. |

The automated governance test contains this same component-to-definition contract. A component cannot be treated as covered if any required definition disappears.

## Higher-education and IR vocabulary added

- Academic structure: credit hour, clock/contact hour, instructional activity, academic term, academic year, calendar system, class standing, degree/certificate-seeking, non-degree/certificate-seeking, credential level, academic program, major, concentration, full-time status, and normal time.
- Enrollment and movement: duplicated and unduplicated headcount, student FTE, distance-education status, dual enrollment, U.S. nonresident, federal race/ethnicity and sex reporting categories, new student, continuing/returning student, transfer-in, transfer-out, stop-out, dropout, and persistence.
- Faculty and HR: instructional staff/instructional faculty, occupational category, tenure status, faculty headcount, faculty FTE, instructional-staff FTE, and student-to-faculty ratio.
- Finance and affordability: cost of attendance, tuition and required fees, average net price, tuition discount rate, total revenue, total expenses, and net position.
- Compliance and governance: accreditation, Title IV, and FERPA.

## Fail-closed limitations

- Graduate full-time status is not inferred. The current source validates the undergraduate 12-credit threshold, but the institution's graduate workload policy has not been supplied.
- Any-institution persistence, transfer-out, and dropout cannot be established from the local SIS alone. A Clearinghouse or equivalent subsequent-enrollment source is required.
- Admissions rates and yield are not certification-ready until actual applicant and decision records replace the estimated funnel.
- Finance totals are not certification-ready until they reconcile to the audited, applicable GASB financial statements.
- Tuition discount rate is not computed until a governed institutional-aid and gross-tuition revenue contract is approved.

## Primary references

- [NCES IPEDS survey components and collection cycle](https://nces.ed.gov/ipeds/report-your-data/overview-survey-components-data-cycle)
- [NCES IPEDS survey methodology](https://nces.ed.gov/ipeds/survey-components/ipeds-survey-methodology)
- [NCES IPEDS Cost component](https://nces.ed.gov/ipeds/survey-components/13)
- [NCES average institutional net price FAQ](https://nces.ed.gov/ipeds/report-your-data/faq-average-net-price)
- [Federal Student Aid full-time workload guidance](https://fsapartners.ed.gov/knowledge-center/fsa-handbook/2024-2025/vol1/ch1-school-determined-requirements)
- [U.S. Department of Education accreditation overview](https://www.ed.gov/laws-and-policy/higher-education-laws-and-policy/college-accreditation/overview-of-accreditation-united-states)
- [U.S. Department of Education FERPA regulations and guidance](https://studentprivacy.ed.gov/ferpa)
