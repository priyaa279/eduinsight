export function selectedPrograms(plan, dataset) {
  const programs = dataset.catalogs.programs;
  if (plan.programId) {
    return programs.filter((program) => program.programId === plan.programId);
  }
  if (plan.programScope === "masters_of_science") {
    return programs.filter((program) => program.programName.startsWith("MS "));
  }
  if (plan.programScope === "bachelors_of_science") {
    return programs.filter((program) => program.programName.startsWith("BS "));
  }
  if (plan.programScope === "degree_level" && plan.degreeLevel) {
    return programs.filter((program) => program.degreeLevel === plan.degreeLevel);
  }
  return plan.excludeProgramId
    ? programs.filter((program) => program.programId !== plan.excludeProgramId)
    : programs;
}
