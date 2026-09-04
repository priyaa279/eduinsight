# Ask EduInsight — adjudication reaudit

This report reclassifies the 65 differences that existed in the accepted
portfolio-readiness baseline. It does not modify any preserved first-run blind
artifact and it does not describe 65 independently correct answers. The
post-hardening raw release result is reported separately from the adjudicated
release result.

| Category | Count | Cases |
|---|---:|---|
| Presentation-only difference | 34 | B3-32; B4-199, B4-258, B4-272; B5-24, B5-51, B5-52, B5-54, B5-57, B5-66, B5-71, B5-100; B6-23; B7-161; B9 endpoint comparison (1), ordering/labels/count shape (6), retention answer shape (2), IPEDS run/readiness labels (2), IPEDS review-count shape (1), capacity plan/presentation (8) |
| Expected tie/ranking behavior | 10 | B4-91, B4-160, B4-164; B5-94, B5-96; B7-98, B7-114; B9 tie/displayed-precision ranking (3) |
| Formatting/precision difference | 2 | B3-70; B4-154 |
| Historical expectation based on removed seeded DQ behavior | 10 | B4-205; B9 source-derived quality-evaluator contract (9) |
| Safe clarification/limitation difference | 6 | B3-246, B3-247, B3-248, B3-249; B9 safe clarification versus limitation (1), source-integrity limitation (1) |
| Genuine semantic defect | 3 | B4-131; B5-145; B5-257 |
| **Total** | **65** | |

## Genuine defects and disposition

- **B4-131 — weakest cohort omitted 2020.** Fixed. With no user-supplied
  range, the ranking now covers all governed cohort years and returns 2020 at
  70.0%. This former difference now passes the raw contract.
- **B5-145 — generic persistence silently became first-year retention.** Fixed
  at the active request-routing boundary. Generic persistence receives a
  governed clarification/limitation; explicitly first-year retention continues
  to execute. The preserved lower-level blind oracle still records its historic
  contract difference.
- **B5-257 — governed enrollment-definition request returned the generic data
  catalog.** Fixed at the active request-routing boundary. The response now
  gives the governed distinct-student Fall census definition and its four
  contributing sources. The preserved lower-level blind oracle still records
  its historic contract difference.

## Interpretation

After the weakest-cohort correction, the current raw/adjudicated difference is
64 rather than the baseline 65. Two corrected routing defects remain visible in
the preserved direct-engine regression contracts because those suites bypass
the product's intent-router/request-service boundary. Dedicated end-to-end
request-service tests verify the behavior users receive. Adjudication remains a
documented contract review, not a substitute for raw correctness.
