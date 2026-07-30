export function plannerModeLabel(planner) {
  if (planner === "policy") {
    return "local governed policy gate";
  }
  if (planner === "glossary") return "governed glossary lookup";
  if (planner === "catalog") return "governed capability catalog";
  if (planner === "partial") return "local partial-resolution builder";
  return "local deterministic planner";
}
