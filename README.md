# EduInsight AI

EduInsight is an interactive institutional-intelligence workspace for higher
education. This prototype uses only synthesized records and demonstrates six
connected product capabilities:

- an institutional command center with agent-generated briefs;
- a governed natural-language analyst with visible definitions and sources;
- data-quality triage, including silent-error detection;
- IPEDS preparation, validation, explanation, and human approval;
- transparent deterministic scenario modeling;
- searchable institutional memory and end-to-end audit provenance.

## Data boundary

All institutions, students, metrics, findings, documents, and results in this
prototype are synthetic. No FERPA-regulated or institution-owned data is
included.

## Run locally

Requires Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Build and verify:

```bash
npm run build
node --test tests/rendered-html.test.mjs
```

## Product architecture

The interface models the intended production flow:

```text
source snapshots
  → governed warehouse models
  → versioned semantic definitions
  → specialized quality / IPEDS / analyst agents
  → human review and approval
  → auditable answers and submissions
```

The current build is a deterministic, interaction-complete product prototype.
Production deployment would replace the embedded synthetic fixtures with a
generated warehouse, connect an approved model provider behind read-only query
guardrails, and persist approvals and audit events.
