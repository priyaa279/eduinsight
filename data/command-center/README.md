# EduInsight Command Center data

This folder contains the synthetic fixtures represented on the EduInsight
Command Center screen.

## Important data boundary

The original screen did **not** use downloaded IPEDS records, university
records, FERPA-protected data, or an external API. Its values were embedded
directly in `app/page.tsx` as deterministic demo content.

These CSV files separate that content into auditable datasets:

| File | Command Center section |
|---|---|
| `institution_profile.csv` | Institution name, reporting period, and synthetic-environment status |
| `kpi_snapshot.csv` | Four KPI cards and their comparison inputs |
| `kpi_history.csv` | Historical/display sequences for the mini trend bars |
| `agent_brief.csv` | Three prioritized agent findings |
| `program_signals.csv` | Graduate program capacity and year-over-year growth |
| `agent_activity.csv` | Completed agent tasks shown on the screen |
| `metric_dictionary.csv` | Business definitions, formulas, owners, and intended production sources |
| `audit_provenance.csv` | Demonstration lineage for the Fall headcount result |
| `command_center_source_map.csv` | Mapping between implementation files, datasets, and visible screen regions |

## KPI calculations

- **Fall headcount:** `(18,426 - 19,234) / 19,234 = -4.2%`
- **First-year retention:** `78.4% - 77.6% = +0.8 percentage points`
- **IPEDS readiness:** `91.0% - 79.0% = +12.0 percentage points`
- **Open quality issues:** `27 - 36 = -9 issues`

The Excel workbook in `outputs/eduinsight-command-center/` keeps these
calculations as formulas so an analyst can change the inputs and audit the
results.

## Intended production replacement

In a production implementation, the synthetic files would be replaced by
certified warehouse models:

- `fct_student_term` for census enrollment;
- `fct_retention_cohort` for retention;
- `fct_ipeds_validation_run` for reporting readiness;
- `fct_data_quality_issue` for open exceptions;
- `fct_section_enrollment` joined to `dim_program` for capacity signals.

Those names describe the intended architecture only; those production tables do
not exist in this prototype yet.
