# EduInsight browser smoke evaluation

- Date: 2026-07-27
- Target: `http://localhost:3000`
- Surface: Ask EduInsight
- Result after fixes: **6/6 passed**

| Question | Observed browser result | Verdict |
| --- | --- | --- |
| `how many comp sci students last fall` | Resolved to catalog program MS Computer Science and returned 678 for Fall 2025. | Pass |
| `Show students who are not international.` | Applied the Domestic complement and returned 12,209. | Pass |
| `Show CS enrollment, capacity, and international percentage in 2025.` | Requested clarification because the question contains multiple analyses; no partial answer or chart was shown. | Pass |
| `Show Pharmacy enrollment in 2025.` | Returned a Low-confidence source limitation; no institution-wide fallback was shown. | Pass |
| `What was total enrollment in 2025 despite the open headcount anomaly?` | Returned 18,426 with Medium confidence and cited DQ-1002 / YOY_HEADCOUNT_VARIANCE. | Pass |
| `Which programs are at least 86% utilized?` | Returned MS Business Analytics (92%) and MS Computer Science (86%). | Pass |

The corrected browser behavior matches the deterministic engine tests. The
paraphrase, negation, compound-question, unknown-filter, confidence, and
threshold fixes are therefore present in the rendered product rather than only
in the test harness.
