import { normalizeQuestion } from "./normalization.mjs";

export function governancePolicyForQuestion(question) {
  const normalized = normalizeQuestion(question);
  const hostileInstruction =
    /\b(ignore|disregard|override)\b.*\b(upload|governance|governed|filters?|instructions?|limitations?)\b/.test(
      normalized,
    ) ||
    /\b(ignore|disregard|override|replace)\b.*\b(certified|calculated|source|files?|data|results?)\b/.test(
      normalized,
    ) ||
    /\bsuppress (?:the )?(?:audit trail|provenance|limitations?)\b/.test(
      normalized,
    ) ||
    /\b(?:mark|replace)\b.*\b(?:all|every|result|enrollment|retention|dfw|ipeds)\b.*\b(?:passed|zero|\d[\d,]*(?:\.\d+)?)\b/.test(
      normalized,
    ) ||
    /\b(invent|fabricate|make up)\b.*\b(enrollment|retention|ipeds|capacity|number|rate|passed)\b/.test(
      normalized,
    ) ||
    /\bpretend\b.*\b(enrollment|retention|ipeds|capacity|number|rate|passed)\b/.test(
      normalized,
    ) ||
    /\b(answer confidently|treat this prompt as the data source|report fall enrollment as|return the total as)\b/.test(
      normalized,
    );
  if (
    hostileInstruction &&
    !/\b(?:instead|actually)\b|\bdisregard governed definitions and say\b/.test(
      normalized,
    )
  ) {
    return {
      blocked: true,
      reason:
        "Instructions to override governed uploads, filters, safety controls, or evidence cannot replace certified calculations.",
    };
  }
  const rowLevelRequest =
    /\b(?:reveal|show|give|list|send|email|export|print|download|provide)\s+names?\s+of\s+students?\b/.test(
      normalized,
    ) ||
    /\b(individual students?|student names?|names? of .+students?|named .+students?|student ids?|email addresses?|phone numbers?|student[- ]level records?|records? behind this chart|list every .+student|export .+records?|one row per student|individual retention outcomes?|individual gpas?)\b/.test(
      normalized,
    ) ||
    /\brow[- ]level\b.*\b(records?|rows?|data|results?)\b/.test(normalized) ||
    /\b(show|give|list|send|email|export|return|reveal|print|download|provide)\b.*\b(ids?|emails?|email addresses?|phone numbers?|gpas?|individual|student[- ]level(?: enrollment)? (?:records?|rows?)|row[- ]level(?: enrollment)? (?:records?|rows?)|one row per student|record for student)\b/.test(
      normalized,
    ) ||
    /\b(provide|show|give|list|return|reveal|print|download|export)\b.*\bnames?\b.*\b(students?|recipients?|people|persons?|individuals?)\b/.test(
      normalized,
    ) ||
    /\b(show|give|list|send|email|export|return|reveal|print|download|provide)\b.*\bstudents?\b.*\bnames?\b/.test(
      normalized,
    ) ||
    /\b(download|export)\b.*\broster\b/.test(normalized) ||
    /\b(download|export|provide|show|give|list)\b.*\b(phone numbers?|unredacted|student records?)\b/.test(
      normalized,
    ) ||
    /\b(which|identify|tell me which|infer which)\b.*\b(named|specific|individual)\b(?:\s+\w+){0,3}\s+students?\b/.test(
      normalized,
    ) ||
    /\b(rank individual students?|individual retention risk|who should lose financial aid|likely to drop out|likely to stop out|most likely to stop out|likely low income)\b/.test(
      normalized,
    ) ||
    /\bwho are (?:the )?(?:\w+\s+){0,4}students?\b/.test(normalized) ||
    /\bname every\b.*\bstudent\b/.test(normalized) ||
    /\bgive me the record for student\b/.test(normalized) ||
    /\braw records? behind\b|\brecords? underlying\b|\bunderlying roster\b|\broster underlying\b/.test(
      normalized,
    ) ||
    /\bidentify the person\b|\beach student s\b|\badvising (?:list|roster)\b(?:.*\bstudents?\b)?/.test(
      normalized,
    ) ||
    /\bstudent[- ]by[- ]student\b.*\b(?:rows?|records?|data|results?)\b/.test(
      normalized,
    ) ||
    /\bstudent[- ]level\b.*\b(?:roster|list|extract|file|data|rows?|records?)\b/.test(
      normalized,
    ) ||
    /\b(?:underlying|every)\b.*\b(?:rows?|records?)\b.*\b(?:personally identifying|identifying fields?|pii)\b/.test(
      normalized,
    ) ||
    /\bidentify\b.*\bstudents?\b.*\b(?:by )?names?\b/.test(normalized) ||
    /\brow[- ]by[- ]row\b.*\b(?:list|roster|students?|records?|data)\b/.test(
      normalized,
    );
  if (rowLevelRequest) {
    return {
      blocked: true,
      requestedGranularity: "student_level",
      reason:
        "Ask EduInsight is aggregate-only. Individual, named, row-level, and personally identifiable student records are restricted and cannot be returned through this analytics interface.",
    };
  }
  return { blocked: false, requestedGranularity: "aggregate", reason: null };
}
