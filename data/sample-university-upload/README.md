# Atlas Valley University sample upload

This folder is a complete synthetic batch upload for the EduInsight Command Center. It models the files a university would export from its SIS, catalog, schedule, IPEDS validation workflow, and data-quality process.

No real student data is included. Student identifiers and all records are deterministic synthetic examples.

## How the data reaches the Command Center

```text
Nine CSV source files
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

For a real institution, keep the file names and headers described in the upload-contract workbook, replace the synthetic rows with approved institutional exports, and run `npm run data:ingest`. The pipeline stops on missing files, missing columns, duplicate source keys, broken references, an invalid IPEDS weight total, or a mismatch between the SIS-derived full-time-credit exception count and the quality issue log.

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
| `ipeds_validation_results.csv` | IPEDS validation workflow | Submission-readiness score and validation brief |
| `data_quality_issue_log.csv` | Data-quality platform | Open issues, severity, week-over-week movement |
| `completions.csv` | SIS degree history | Governed completer population used to prepare the IPEDS COM upload |
| `manifest.json` | EduInsight package manifest | Row counts, provenance, and synthetic-data declaration |

## Current reconciled results

- Fall 2025 headcount: 18,426
- Year-over-year headcount change: -4.2%
- 2024 first-time full-time cohort retention: 78.4%
- Retention change: +0.8 percentage points
- IPEDS Fall Enrollment readiness: 91%
- Readiness change: +12 percentage points
- Open quality issues: 27, including 3 critical
- Week-over-week issue change: -9
- Full-time/credit mismatches independently found in `student_terms.csv`: 146

Production use would add authenticated encrypted upload, malware scanning, institutional retention policies, role-based access, and institution-specific semantic mappings. This repository currently implements the local batch contract and deterministic transformation layer.
