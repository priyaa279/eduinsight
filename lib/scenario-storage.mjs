export const SAVED_SCENARIOS_STORAGE_KEY =
  "eduinsight.saved-scenarios.v2";
export const SAVED_SCENARIO_SCHEMA_VERSION = 2;
export const SCENARIO_NAME_MAX_LENGTH = 80;

const SCENARIO_MODES = new Set([
  "enrollment",
  "retention",
  "pricing",
  "capacity",
  "faculty",
]);
const CAPACITY_KINDS = new Set([
  "student-seat-demand",
  "course-seat-demand",
  "course-seat-supply",
  "none",
]);
const CAPACITY_UNITS = new Set(["student seats", "course seats", null]);
const FACULTY_KINDS = new Set([
  "faculty-demand",
  "faculty-supply",
  "none",
]);
const FINANCIAL_DEFINITIONS = new Set([
  "gross-tuition",
  "gross-tuition-less-modeled-aid",
]);

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value, maximumLength = Number.POSITIVE_INFINITY) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximumLength
  );
}

function isIsoTimestamp(value) {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function inputsMatchMode(mode, inputs) {
  if (!isObject(inputs)) return false;
  if (mode === "enrollment") {
    return (
      isFiniteNumber(inputs.undergraduateChangePercent) &&
      isFiniteNumber(inputs.graduateChangePercent)
    );
  }
  if (mode === "retention") return isFiniteNumber(inputs.pointGain);
  if (mode === "pricing") {
    return (
      isFiniteNumber(inputs.undergraduatePriceChangePercent) &&
      isFiniteNumber(inputs.graduatePriceChangePercent) &&
      isFiniteNumber(inputs.additionalGrantPerPellEligible)
    );
  }
  if (mode === "capacity") {
    return isNonEmptyString(inputs.programId, 100) && isFiniteNumber(inputs.growthPercent);
  }
  if (mode === "faculty") return isFiniteNumber(inputs.positionsNotReplaced);
  return false;
}

function isMetric(metric) {
  return (
    isObject(metric) &&
    isNonEmptyString(metric.label, 200) &&
    isFiniteNumber(metric.value) &&
    typeof metric.display === "string"
  );
}

function isComparison(comparison) {
  if (!isObject(comparison)) return false;
  if (
    !isFiniteNumber(comparison.headcountImpact) ||
    !isFiniteNumber(comparison.annualRevenueImpact) ||
    !Number.isInteger(comparison.financialHorizonYears) ||
    comparison.financialHorizonYears <= 0 ||
    !isFiniteNumber(comparison.capacitySeatImpact) ||
    !CAPACITY_KINDS.has(comparison.capacityImpactKind) ||
    !CAPACITY_UNITS.has(comparison.capacityImpactUnit) ||
    !isFiniteNumber(comparison.facultyFteImpact) ||
    !FACULTY_KINDS.has(comparison.facultyImpactKind)
  ) {
    return false;
  }
  if (
    comparison.capacityImpactKind === "none" &&
    comparison.capacityImpactUnit !== null
  ) {
    return false;
  }
  if (
    comparison.capacityImpactKind !== "none" &&
    comparison.capacityImpactUnit === null
  ) {
    return false;
  }
  return true;
}

function isScenarioResult(result) {
  if (!isObject(result) || result.status === "unavailable") return false;
  if (
    !isNonEmptyString(result.title, 200) ||
    !isNonEmptyString(result.summary, 500) ||
    !Array.isArray(result.metrics) ||
    !result.metrics.every(isMetric) ||
    !isComparison(result.comparison) ||
    !isStringArray(result.assumptions) ||
    !isStringArray(result.sources)
  ) {
    return false;
  }
  if (
    result.series !== undefined &&
    (!Array.isArray(result.series) || !result.series.every(isFiniteNumber))
  ) {
    return false;
  }
  if (
    result.details !== undefined &&
    (!isObject(result.details) ||
      !isFiniteNumber(result.details.additionalGrantShareOfBaselineGrossTuitionPercent) ||
      !isFiniteNumber(result.details.coveredStudents) ||
      !isFiniteNumber(result.details.modeledGrantOffsetPerPellEligibleStudent))
  ) {
    return false;
  }
  if (
    result.supportingComparisons !== undefined &&
    (!Array.isArray(result.supportingComparisons) ||
      !result.supportingComparisons.every(
        (item) =>
          isObject(item) &&
          isNonEmptyString(item.label, 200) &&
          typeof item.display === "string",
      ))
  ) {
    return false;
  }
  if (
    result.program !== undefined &&
    (!isObject(result.program) ||
      !isNonEmptyString(result.program.programId, 100) ||
      !isNonEmptyString(result.program.name, 200) ||
      !(
        result.program.memoryRecordId === null ||
        typeof result.program.memoryRecordId === "string"
      ))
  ) {
    return false;
  }
  return true;
}

function resultMatchesMode(mode, inputs, result) {
  const comparison = result.comparison;
  if (comparison.financialHorizonYears !== 1) return false;
  if (mode === "enrollment" || mode === "retention") {
    if (
      comparison.capacityImpactKind !== "student-seat-demand" ||
      comparison.capacityImpactUnit !== "student seats" ||
      comparison.facultyImpactKind !== "faculty-demand"
    ) {
      return false;
    }
    return mode !== "retention" || Array.isArray(result.series);
  }
  if (mode === "pricing") {
    return (
      comparison.capacityImpactKind === "none" &&
      comparison.capacityImpactUnit === null &&
      comparison.facultyImpactKind === "none" &&
      isObject(result.details)
    );
  }
  if (mode === "capacity") {
    return (
      comparison.capacityImpactKind === "course-seat-demand" &&
      comparison.capacityImpactUnit === "course seats" &&
      comparison.facultyImpactKind === "faculty-demand" &&
      isObject(result.program) &&
      result.program.programId === inputs.programId
    );
  }
  return (
    mode === "faculty" &&
    comparison.capacityImpactKind === "course-seat-supply" &&
    comparison.capacityImpactUnit === "course seats" &&
    comparison.facultyImpactKind === "faculty-supply"
  );
}

export function financialDefinitionForMode(mode) {
  return mode === "pricing"
    ? "gross-tuition-less-modeled-aid"
    : "gross-tuition";
}

export function isSavedScenario(value) {
  if (!isObject(value)) return false;
  if (
    value.schemaVersion !== SAVED_SCENARIO_SCHEMA_VERSION ||
    !isNonEmptyString(value.id, 200) ||
    !isNonEmptyString(value.name, SCENARIO_NAME_MAX_LENGTH) ||
    !SCENARIO_MODES.has(value.mode) ||
    !isIsoTimestamp(value.savedAt) ||
    !FINANCIAL_DEFINITIONS.has(value.financialDefinition) ||
    value.financialDefinition !== financialDefinitionForMode(value.mode) ||
    !inputsMatchMode(value.mode, value.inputs) ||
    !isScenarioResult(value.result) ||
    !resultMatchesMode(value.mode, value.inputs, value.result)
  ) {
    return false;
  }
  return (
    value.assumptionSummary === undefined ||
    (typeof value.assumptionSummary === "string" &&
      value.assumptionSummary.length <= 300)
  );
}

export function loadSavedScenarioState(storage) {
  if (!storage) {
    return {
      scenarios: [],
      message: "Saved scenarios are unavailable in this browser session.",
    };
  }
  try {
    const serialized = storage.getItem(SAVED_SCENARIOS_STORAGE_KEY);
    if (serialized === null) return { scenarios: [], message: "" };
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return {
        scenarios: [],
        message: "Saved scenarios could not be loaded because their saved format is invalid or outdated.",
      };
    }
    const scenarios = parsed.filter(isSavedScenario);
    if (
      scenarios.length !== parsed.length &&
      typeof storage.setItem === "function"
    ) {
      try {
        storage.setItem(
          SAVED_SCENARIOS_STORAGE_KEY,
          JSON.stringify(scenarios),
        );
      } catch {
        // The invalid objects remain ignored even if browser cleanup is blocked.
      }
    }
    return {
      scenarios,
      message:
        scenarios.length === parsed.length
          ? ""
          : "Some saved scenarios were skipped because their saved format is invalid or outdated.",
    };
  } catch {
    return {
      scenarios: [],
      message: "Saved scenarios could not be loaded in this browser session.",
    };
  }
}

export function loadSavedScenarios(storage) {
  return loadSavedScenarioState(storage).scenarios;
}

export function persistSavedScenarios(storage, scenarios) {
  if (!storage) {
    return {
      ok: false,
      message: "Scenario could not be saved in this browser session.",
    };
  }
  if (!Array.isArray(scenarios) || !scenarios.every(isSavedScenario)) {
    return {
      ok: false,
      message: "Scenario could not be saved because its saved format is invalid.",
    };
  }
  try {
    storage.setItem(SAVED_SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
    return { ok: true, message: "" };
  } catch {
    return {
      ok: false,
      message: "Scenario could not be saved in this browser session.",
    };
  }
}
