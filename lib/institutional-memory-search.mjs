import { memoryAliasesForRecord } from "./institutional-memory-contract.mjs";

const directTextFields = ["term", "title", "excerpt", "body", "source", "owner"];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsQuery(value, needle) {
  const text = String(value ?? "").toLowerCase();
  if (/^[a-z0-9]{2,4}$/.test(needle)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`).test(
      text,
    );
  }
  return text.includes(needle);
}

export function getMemorySearchMatch(record, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return { matches: true, reason: null, matchType: "all" };
  }

  const tags = Array.isArray(record?.tags) ? record.tags : [];
  const related = Array.isArray(record?.related) ? record.related : [];
  const aliases = memoryAliasesForRecord(record);
  const exactTermOrTitle = ["term", "title"].some(
    (field) => String(record[field] ?? "").trim().toLowerCase() === needle,
  );
  const exactAlias = aliases.some(
    (alias) => alias.trim().toLowerCase() === needle,
  );
  const exactTag = tags.some(
    (tag) => tag.trim().toLowerCase() === needle,
  );
  const directMatch =
    exactTermOrTitle ||
    exactAlias ||
    exactTag ||
    directTextFields.some((field) => containsQuery(record[field], needle)) ||
    aliases.some((alias) => containsQuery(alias, needle)) ||
    tags.some((tag) => containsQuery(tag, needle));

  if (directMatch) {
    return {
      matches: true,
      reason: "Direct match",
      matchType: "direct",
      priority: exactTermOrTitle || exactAlias ? 0 : exactTag ? 1 : 2,
    };
  }

  const relatedTerm = related.find((term) =>
    containsQuery(term, needle),
  );
  if (relatedTerm) {
    return {
      matches: true,
      reason: `Related to: ${relatedTerm}`,
      matchType: "related",
      priority: 3,
    };
  }

  return { matches: false, reason: null, matchType: "none" };
}

const matchRank = {
  direct: 0,
  related: 1,
  all: 0,
  none: 2,
};

export function searchMemoryRecords(records, query) {
  return records
    .map((record, originalIndex) => ({
      record,
      match: getMemorySearchMatch(record, query),
      originalIndex,
    }))
    .filter(({ match }) => match.matches)
    .sort(
      (left, right) =>
        matchRank[left.match.matchType] - matchRank[right.match.matchType] ||
        (left.match.priority ?? 0) - (right.match.priority ?? 0) ||
        left.originalIndex - right.originalIndex,
    )
    .map(({ record, match }) => ({ record, match }));
}
