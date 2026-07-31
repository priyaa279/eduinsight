# PRODUCT — EduInsight AI

## What it is

A governed institutional-intelligence workspace for higher education.
Institutional Research offices and provosts ask questions about enrollment,
retention, data quality, IPEDS readiness, and capacity, and get answers that
show their working: the metric definition used, the sources, the filters
applied, the confidence checks, and the lineage.

All data in the prototype is synthetic. The product is **institution-agnostic** —
it is not built for one named school, and no institution name appears in the UI.

## Register

A working instrument for people who live in it, presented with the manners of
scholarly publishing. Dense, but not curt. Every screen should survive its
two-hundredth viewing.

Restraint reads as competence. The core claim is that this product will not
make things up; a UI that oversells undermines the claim.

## Users

| User | Needs |
|---|---|
| **IR analyst** (primary, daily) | Fast answers with defensible provenance. Reads dense tables all day. Will paste a number into a board report and must be able to cite the definition. |
| **Provost / leadership** (weekly) | The headline number and its direction, plus enough governance signal to trust it without redoing the analysis. |
| **Registrar / data owners** (as assigned) | Their own queue: what broke, how many records, which rule, whose job. |

## Voice

Plain, specific, calibrated. The most important sentences are the ones where it
declines to answer.

- "Census headcount is 4.2% below last fall, outside the expected band of ±2.5%."
- "No assumption was made. Clarify the requested metric or population to continue."
- Not: "Great question!", not "AI-powered insights", not "unlock your data."

State a limitation as flatly as a finding. Never dress an inability to answer
as a feature, and never soften it into vagueness.

## Anti-references

- **A consumer AI chat product.** No gradient orb, no typing dots, no
  conversational warmth. EduInsight is an analyst, not a companion.
- **A BI vendor screenshot.** No chart junk, no dial gauges, no rainbow
  categorical palettes on ordered data.
- **A university homepage.** No crest, no campus photography, no single
  school's colours.
- **A generic AI-generated dashboard.** See the Don't list in [DESIGN.md](DESIGN.md).

## The trust mechanic

Trust is built by making verification visible.

- Confidence always shows its component checks (query / data / calculation),
  never a bare score.
- Sources are named, and certified ones are marked in brass.
- Filters are audited on screen: detected versus applied.
- Failing closed is displayed as a result, not an error.
- IPEDS packages are frozen, hashed, and handed to a named human keyholder.
  **EduInsight never submits to NCES.**

## Honesty constraints

These are product rules, not style preferences:

- Never display a number that isn't derived from the governed data. If a figure
  cannot be computed, remove the tile rather than inventing a plausible value.
- Never draw a chart, ring, or bar whose geometry isn't bound to the value it
  claims to show.
- Never let a decorative visualisation appear beside a refusal or a
  clarification.

See [DESIGN.md](DESIGN.md) for the visual system that implements this.
