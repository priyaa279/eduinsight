export const SAVED_SCENARIOS_STORAGE_KEY =
  "eduinsight.saved-scenarios.v2";

function isSavedScenario(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      typeof value.mode === "string" &&
      value.result &&
      typeof value.result === "object" &&
      value.result.comparison &&
      typeof value.result.comparison === "object",
  );
}

export function loadSavedScenarios(storage) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(
      storage.getItem(SAVED_SCENARIOS_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? parsed.filter(isSavedScenario) : [];
  } catch {
    return [];
  }
}

export function persistSavedScenarios(storage, scenarios) {
  if (!storage) return;
  try {
    storage.setItem(SAVED_SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
  } catch {
    // Scenario work remains available in root state if browser storage is full
    // or unavailable.
  }
}
