# Legacy Command Center presentation fixtures

This folder is retained only as historical design evidence from the original
static Command Center mockup. Its CSV files are **legacy presentation fixtures**,
not current governed inputs, and may contain retired labels or values.

The current Command Center source-of-truth path is:

1. governed files in `data/sample-university-upload/`;
2. source-derived Data Quality and IPEDS module artifacts;
3. `scripts/build-command-center.mjs`;
4. `app/data/command-center.generated.json` and
   `data/processed/command-center.json`.

The live builder does not read this directory. In particular, values such as a
91% IPEDS readiness score, 27 open issues, 684 affected enrollment records, or
claims that a package is ready for approval are obsolete mockup semantics and
must not be used as current EduInsight truth.

Do not add this directory to the current builder input contract. Historical CSV
contents remain preserved solely so earlier design work can be inspected.
