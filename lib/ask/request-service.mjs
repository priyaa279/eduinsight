import { analyzeQuestion } from "../ask-engine.mjs";
import {
  capabilityAnswer,
  classifyQuestionIntent,
  glossaryAnswer,
  partialAnswer,
  selectChartType,
} from "./intent-router.mjs";

export async function analyzeQuestionRequest(question, dataset) {
  const intent = classifyQuestionIntent(question, dataset);
  if (intent.type === "definition") {
    return {
      answer: glossaryAnswer(intent.glossary),
      plan: { responseType: "answer", filterAudit: { detected: [], applied: [], complete: true } },
      planner: "glossary",
      intent: intent.type,
    };
  }
  if (intent.type === "capability") {
    return {
      answer: capabilityAnswer(dataset),
      plan: { responseType: "answer", filterAudit: { detected: [], applied: [], complete: true } },
      planner: "catalog",
      intent: intent.type,
    };
  }
  if (
    intent.type === "partial" &&
    !/\b(?:pretend|fabricate|make up|ignore (?:the )?(?:uploaded|governed|source) data)\b/i.test(
      question,
    )
  ) {
    const compactWords = String(question).trim().split(/\s+/).filter(Boolean);
    const qualityIssue = /\b(?:intl|fall\d{2}|grad|undergrad)\b/i.test(question)
      ? "shorthand"
      : compactWords.length < 4
        ? "incomplete_fragment"
        : "partial_resolution";
    return {
      answer: partialAnswer(intent.resolution),
      plan: {
        responseType: "clarification",
        questionQualityIssue: qualityIssue,
        filterAudit: { detected: [], applied: [], complete: true },
      },
      planner: "partial",
      intent: intent.type,
      resolution: intent.resolution,
    };
  }
  const result = analyzeQuestion(question, dataset);
  return {
    ...result,
    answer: {
      ...result.answer,
      chartType: selectChartType(result.answer),
      intent: "analytical",
    },
    planner: result.plan.responseType === "refusal" ? "policy" : "local",
    intent: "analytical",
  };
}
