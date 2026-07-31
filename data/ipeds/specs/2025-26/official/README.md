# Official NCES IPEDS import layouts

These files are versioned copies of the official 2025-26 NCES key-value import specifications used by EduInsight's deterministic IPEDS generators.

- Survey-material catalog: `https://surveys.nces.ed.gov/ipeds/public/survey-materials/index`
- Catalog search API: `POST https://surveys.nces.ed.gov/ipeds/api/surveys/materials/search`
- Import-spec API: `GET https://surveys.nces.ed.gov/ipeds/api/import-spec/{layoutId}`
- Retrieved: 2026-07-30

| Component | Layout ID |
|---|---:|
| Cost I (`CST`) | 1 |
| Human Resources (`HR`) | 7 |
| Graduation Rates (`GR`) | 11 |
| Student Financial Aid (`SFA`) | 17 |
| 12-Month Enrollment (`E12`) | 21 |
| Fall Enrollment (`EF`) | 22 |
| Finance — GASB (`F`) | 25 |
| Completions (`C`) | 27 |
| 200% Graduation Rates (`GR200`) | 31 |
| Admissions (`ADM`) | 35 |
| Outcome Measures (`OM`) | 36 |

The official public catalog does not expose a 2025-26 import layout for Institutional Characteristics (`IC`); EduInsight therefore does not fabricate an IC upload file. Academic Libraries (`AL`) was discontinued for the 2025-26 collection.
