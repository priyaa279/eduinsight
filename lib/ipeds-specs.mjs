import fs from "node:fs";

function readVersionedJson(name) {
  return JSON.parse(
    fs.readFileSync(
      new URL(`../data/ipeds/specs/2025-26/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
}

export function loadIpedsSpecs() {
  const catalog = readVersionedJson("survey-catalog");
  const annualChanges = readVersionedJson("annual-changes");
  const completions = readVersionedJson("completions");
  const fallEnrollment = readVersionedJson("fall-enrollment");
  return {
    collectionYear: catalog.collectionYear,
    catalogVersion: catalog.catalogVersion,
    verifiedAt: catalog.verifiedAt,
    sourceUrl: catalog.sourceUrl,
    changesUrl: catalog.changesUrl,
    annualVerificationRequired: catalog.annualVerificationRequired,
    surveys: catalog.surveys,
    retired: catalog.retired,
    annualChanges,
    specifications: {
      C: completions,
      EF: fallEnrollment,
    },
  };
}
