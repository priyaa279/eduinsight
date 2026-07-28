import { analyzeQuestion } from "../ask-engine.mjs";

export async function analyzeQuestionRequest(question, dataset) {
  const result = analyzeQuestion(question, dataset);
  return {
    ...result,
    planner: result.plan.responseType === "refusal" ? "policy" : "local",
  };
}
