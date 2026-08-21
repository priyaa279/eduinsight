export const DATA_QUALITY_LIFECYCLE_STATUSES = Object.freeze([
  "Open",
  "In Review",
  "Resolved",
  "Suppressed",
]);

const IDENTITY_VERSION = "dq-finding:v1";

function requiredIdentityPart(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`A stable Data Quality finding identity requires ${label}.`);
  }
  return encodeURIComponent(value.trim().toUpperCase());
}

export function stableFindingIdentity(finding) {
  const ruleId = requiredIdentityPart(finding?.ruleId ?? finding?.rule, "ruleId");
  const issueId = requiredIdentityPart(finding?.issueId ?? finding?.id, "issueId");
  return `${IDENTITY_VERSION}:${ruleId}:${issueId}`;
}

export function isLifecycleStatus(value) {
  return DATA_QUALITY_LIFECYCLE_STATUSES.includes(value);
}

export function defaultLifecycleForFinding(finding) {
  const observedAt =
    typeof finding?.openedAt === "string" && finding.openedAt
      ? finding.openedAt
      : null;
  return {
    findingKey: stableFindingIdentity(finding),
    issueId: finding.issueId ?? finding.id,
    ruleId: finding.ruleId ?? finding.rule,
    status: "Open",
    notes: "",
    reviewerIdentity: null,
    reviewerDisplayName: null,
    createdAt: observedAt,
    updatedAt: observedAt,
    lastSeenEvaluationAt: observedAt,
    isActive: true,
    occurrenceCount: 1,
    previousStatus: null,
    reopenedAt: null,
  };
}

export function reconcileFindingLifecycles(activeFindings, lifecycleRecords) {
  const recordsByKey = new Map(
    lifecycleRecords.map((record) => [record.findingKey, record]),
  );
  const activeKeys = new Set();
  const findings = activeFindings.map((finding) => {
    const fallback = defaultLifecycleForFinding(finding);
    activeKeys.add(fallback.findingKey);
    const stored = recordsByKey.get(fallback.findingKey);
    return {
      ...finding,
      lifecycle: stored
        ? { ...fallback, ...stored, isActive: true }
        : fallback,
    };
  });
  const staleLifecycleRecords = lifecycleRecords
    .filter((record) => !activeKeys.has(record.findingKey))
    .map((record) => ({ ...record, isActive: false }));
  return { findings, staleLifecycleRecords };
}
