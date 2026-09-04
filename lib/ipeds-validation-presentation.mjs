/**
 * Derives workflow presentation from the immutable validation result records.
 * This helper does not calculate or alter any IPEDS validation outcome.
 *
 * @param {Array<{ status: string }>} validations
 * @param {boolean} completed
 * @param {boolean} [executionError=false]
 * @returns {{
 *   state: "pending" | "passed" | "failed" | "error",
 *   label: string,
 *   summary: string,
 *   ariaLabel: string,
 *   totalCount: number,
 *   passedCount: number,
 *   failedCount: number,
 * }}
 */
export function summarizeValidationWorkflow(
  validations,
  completed,
  executionError = false,
) {
  const totalCount = validations.length;
  const passedCount = validations.filter(
    (validation) => validation.status === "Passed",
  ).length;
  const failedCount = totalCount - passedCount;

  if (executionError) {
    return {
      state: "error",
      label: "Validation could not run",
      summary: "Validation error",
      ariaLabel: "Validation could not run.",
      totalCount,
      passedCount: 0,
      failedCount: 0,
    };
  }

  if (!completed) {
    return {
      state: "pending",
      label: "Validation",
      summary: `${totalCount} checks not run`,
      ariaLabel: `Validation not run; ${totalCount} checks not run`,
      totalCount,
      passedCount,
      failedCount,
    };
  }

  if (failedCount === 0) {
    return {
      state: "passed",
      label: "Validation completed",
      summary: `${passedCount} passed`,
      ariaLabel: `Validation completed with all ${passedCount} checks passed.`,
      totalCount,
      passedCount,
      failedCount,
    };
  }

  return {
    state: "failed",
    label: "Validation completed",
    summary: `${passedCount} passed · ${failedCount} failed`,
    ariaLabel: `Validation completed with ${passedCount} passed and ${failedCount} failed.`,
    totalCount,
    passedCount,
    failedCount,
  };
}

/**
 * Maps existing workflow facts to presentation-only progression states.
 * Eligibility remains an input from the governed approval contract.
 *
 * @param {{
 *   generated: boolean,
 *   validationState: "pending" | "passed" | "failed" | "error",
 *   hasBlockers: boolean,
 *   eligible: boolean,
 *   approved: boolean,
 * }} input
 */
export function summarizeReviewWorkflow(input) {
  const prepared = input.generated ? "completed" : "current";
  const validation =
    input.validationState === "error"
      ? "error"
      : input.validationState === "failed"
      ? "warning"
      : input.validationState === "passed"
        ? "completed"
        : input.generated
          ? "current"
          : "pending";
  const review = input.approved
    ? "completed"
    : input.eligible
      ? "current"
      : input.hasBlockers
        ? "blocked"
        : "pending";

  return { prepared, validation, review };
}
