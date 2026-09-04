const CIP_FAMILY = "CIP";

const AWARD_LEVEL_LABELS = new Map([
  ["1a", "Postsecondary award, certificate, or diploma (less than 300 clock hours)"],
  ["1b", "Postsecondary award, certificate, or diploma (300–899 clock hours)"],
  ["2", "Postsecondary award, certificate, or diploma (900–1,799 clock hours)"],
  ["3", "Associate degree"],
  ["5", "Bachelor's degree"],
  ["7", "Master's degree"],
  ["17", "Doctor's degree — research/scholarship"],
]);
const RACE_ETHNICITY_LABELS = new Map([
  ["1", "U.S. nonresident"],
  ["2", "Hispanic or Latino"],
  ["3", "American Indian or Alaska Native"],
  ["4", "Asian"],
  ["5", "Black or African American"],
  ["6", "Native Hawaiian or Other Pacific Islander"],
  ["7", "White"],
  ["8", "Two or more races"],
  ["9", "Race/ethnicity unknown"],
]);
const RESIDENCY_LABELS = new Map([
  ["1", "In-state"],
  ["2", "Out-of-state"],
  ["3", "U.S. nonresident"],
]);

const CREDENTIAL_PREFIX =
  /^(?:(?:AA|AS|AAS|BA|BS|BBA|BFA|MA|MS|MBA|MPA|MEd|EdD|PhD)\s+|Master of\s+)/i;

function normalizeCode(code) {
  return String(code ?? "").trim();
}

function resolveGovernedCode(family, code, labels) {
  const rawCode = normalizeCode(code);
  const label = labels.get(rawCode);
  return {
    family,
    code: rawCode,
    label: label ?? rawCode,
    supportingLabel: label ? `${label} (${family} ${rawCode})` : `${family} ${rawCode}`,
    mapped: Boolean(label),
  };
}

export function resolveAwardLevelDisplay(code) {
  return resolveGovernedCode("AWLEVEL", code, AWARD_LEVEL_LABELS);
}

export function resolveRaceEthnicityDisplay(code) {
  return resolveGovernedCode("RACE", code, RACE_ETHNICITY_LABELS);
}

export function resolveResidencyDisplay(code) {
  return resolveGovernedCode("RESIDENCY", code, RESIDENCY_LABELS);
}

export function fieldOfStudyLabel(programName) {
  const value = String(programName ?? "").trim();
  return value.replace(CREDENTIAL_PREFIX, "").trim() || value;
}

export function createIpedsProgramDisplayCatalog(programs = []) {
  return programs.map((program) => ({
    programId: program.program_id ?? program.programId,
    programName: program.program_name ?? program.programName,
    degreeLevel: program.degree_level ?? program.degreeLevel,
    cipCode: normalizeCode(program.cip_code ?? program.cipCode),
    fieldOfStudyName: fieldOfStudyLabel(
      program.program_name ?? program.programName,
    ),
  }));
}

export function resolveCipDisplay(cipCode, programCatalog = []) {
  const code = normalizeCode(cipCode);
  const match = programCatalog.find(
    (program) => normalizeCode(program.cipCode ?? program.cip_code) === code,
  );

  if (!match) {
    const fallback = code ? `${CIP_FAMILY} ${code}` : "Unknown CIP code";
    return {
      family: CIP_FAMILY,
      code,
      label: fallback,
      primaryLabel: fallback,
      supportingLabel: fallback,
      mapped: false,
    };
  }

  const label =
    match.fieldOfStudyName ||
    fieldOfStudyLabel(match.programName ?? match.program_name);
  return {
    family: CIP_FAMILY,
    code,
    label,
    primaryLabel: label,
    supportingLabel: `${label} (${CIP_FAMILY} ${code})`,
    mapped: true,
  };
}

export function buildCipVarianceDisplay(cipCode, programCatalog = []) {
  const display = resolveCipDisplay(cipCode, programCatalog);
  return {
    edit: `${display.supportingLabel} historical range`,
    prompt: `${display.primaryLabel} completions increased beyond the expected historical range.`,
    supportingDetail: display.mapped
      ? `Verified growth in ${display.supportingLabel} reflects additional reportable awards and reconciles to governed program and completion source records.`
      : `${display.supportingLabel} is not mapped in the current governed program catalog; the official code is retained for institutional review.`,
    codeReference: display,
  };
}
