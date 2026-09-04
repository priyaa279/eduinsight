# Atlas Valley University sample upload

This folder is a complete synthetic batch upload for the EduInsight Command Center and IPEDS Center. It models the files a university would export from its SIS, catalog, schedule, financial-aid, HR, finance, admissions, IPEDS validation, and data-quality processes.

No real student data is included. Student identifiers and all records are deterministic synthetic examples.

## How the data reaches the Command Center

```text
Governed CSV source files plus IPEDS source marts
  -> required-file and required-column validation
  -> unique-key and referential-integrity validation
  -> cross-source reconciliation
  -> governed metric calculations
  -> data/processed/command-center.json
  -> app/data/command-center.generated.json
  -> React Command Center
```

To rebuild the Command Center from the files currently in this folder:

```powershell
npm run data:ingest
```

To regenerate this exact synthetic institution and then ingest it:

```powershell
npm run data:refresh
```

For a real institution, keep the file names and headers described in the upload-contract workbook, replace the synthetic rows with approved institutional exports, and run `npm run data:ingest`. The pipeline stops on missing files, missing columns, duplicate source keys, broken references, or an invalid IPEDS weight total. Data Quality findings are evaluated directly from these source rows during ingestion.

## Files

| File | Typical university source | Command Center use |
|---|---|---|
| `institution.csv` | Institutional configuration | Institution name, reporting boundary, timezone |
| `terms.csv` | SIS term calendar | Current census term and year-over-year comparison |
| `programs.csv` | Curriculum catalog | Program hierarchy, degree level, and CIP mapping |
| `financial_aid.csv` | Financial aid system | Pell eligibility, Pell-recipient status, and governed award amounts for SFA preparation |
| `students.csv` | SIS person/cohort export | First-time full-time cohort and retention denominator |
| `student_terms.csv` | SIS census enrollment snapshot | Headcount, retention outcomes, program demand, quality checks |
| `sections.csv` | SIS course schedule | Available program capacity |
| `section_enrollments.csv` | SIS registration export | Filled seats and utilization |
| `ipeds_validation_results.csv` | IPEDS validation workflow | Per-check status and governed validation evidence |
| `completions.csv` | SIS degree history | Governed completer population used to prepare the IPEDS COM upload |
| `ipeds_marts.json` | Governed extracts from admissions, HR, finance, cost, and cohort systems | Deterministic source contracts for the 2025-26 IPEDS import-file suite |
| `manifest.json` | EduInsight package manifest | Row counts, provenance, and synthetic-data declaration |

### Student entry-term contract

For this deterministic sample package, `students.entry_term_id` is the student's
first institutional entry term. A student is created once, may persist into later
terms, and retains that original value. The sample does not model re-entry,
multiple careers, or separate program-career entry dates. Therefore
`completions.award_date < terms.start_date` for that entry term is an impossible
timeline in this source contract. A production institution with re-entry or
multiple careers must supply the appropriate governed career/program entry field
before using DQ-COM-004 as a defect rule.

The IPEDS Center generates a structurally validated key-value `.txt` file and a human-readable review CSV for every official 2025-26 NCES import layout. A generated file can remain a governed draft: surveys with missing source coverage are visibly blocked from approval until the named source fields are supplied. Institutional Characteristics has no public 2025-26 import layout, so it remains questionnaire/review only; Academic Libraries is retired for this collection year.

## Current reconciled results

- Fall 2025 headcount: 18,426
- Year-over-year headcount change: -4.2%
- 2024 first-time full-time cohort retention: 78.4%
- Retention change: +0.8 percentage points
- IPEDS source readiness: 1 source-backed package, 8 modeled demo packages, 2 source gaps
- IPEDS questionnaire workflows: 1; official import layouts available: 11/11
- Source-derived active quality findings: 4, including 1 critical
- Data Quality rules executed: 14 (10 pass, 4 fail); 21 are not evaluated because required source fields are unavailable
- Full-time/credit mismatches independently found in `student_terms.csv`: 146
- Missing race/ethnicity among the current reportable census population: 119
- Completion dates before the governed entry-term start: 211
- Financial-aid rows without matching student-term enrollment: 0

Evaluator output is written to `data/processed/data-quality-results.json`; there is no source issue-log input competing with evaluator truth.

Production use would add authenticated encrypted upload, malware scanning, institutional retention policies, role-based access, and institution-specific semantic mappings. This repository currently implements the local batch contract and deterministic transformation layer.
