export function plannerModeLabel(planner) {
  if (planner === "policy") {
    return "local governed policy gate";
  }
  return "local deterministic planner";
}
