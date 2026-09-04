import { analyzeQuestion } from "../ask-engine.mjs";
import {
  capabilityAnswer,
  classifyQuestionIntent,
  definitionUnavailableAnswer,
  glossaryAnswer,
  partialAnswer,
  persistenceLimitationAnswer,
  selectChartType,
} from "./intent-router.mjs";
import { governancePolicyForQuestion } from "./governance.mjs";

export async function analyzeQuestionRequest(question, dataset) {
  const governance = governancePolicyForQuestion(question);
  if (governance.blocked) {
    const result = analyzeQuestion(question, dataset);
    return {
      ...result,
      answer: {
        ...result.answer,
        chartType: "none",
        intent: "analytical",
      },
      planner: "policy",
      intent: "analytical",
    };
  }
  const intent = classifyQuestionIntent(question, dataset);
  if (intent.type === "definition") {
    return {
      answer: glossaryAnswer(intent.glossary),
      plan: { responseType: "answer", filterAudit: { detected: [], applied: [], complete: true } },
      planner: "glossary",
      intent: intent.type,
    };
  }
  if (intent.type === "definition_unavailable") {
    return {
      answer: definitionUnavailableAnswer(intent.requestedTerm),
      plan: {
        responseType: "clarification",
        filterAudit: { detected: [], applied: [], complete: false },
      },
      planner: "glossary",
      intent: "definition",
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
  if (intent.type === "persistence_unsupported") {
    return {
      answer: persistenceLimitationAnswer(),
      plan: {
        metric: "unsupported",
        responseType: "clarification",
        responseReason: "Persistence is not a governed measure in the current upload.",
        filterAudit: { detected: [], applied: [], complete: false },
      },
      planner: "policy",
      intent: "analytical",
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
