import {
  readStoredLifecycles,
  reconcileStoredLifecycles,
} from "./lifecycle-store.mjs";

export async function withCurrentQualityLifecycle(
  dataset,
  db,
  { allowSynchronization = false } = {},
) {
  if (!db) {
    return { ...dataset, qualityLifecyclePersistenceAvailable: false };
  }
  try {
    const reconciled = allowSynchronization
      ? await reconcileStoredLifecycles(
          db,
          dataset.qualityIssues,
          dataset.generatedAt,
        )
      : await readStoredLifecycles(
          db,
          dataset.qualityIssues,
          dataset.generatedAt,
        );
    const statusByFindingKey = new Map(
      reconciled.findings.map((finding) => [
        finding.lifecycle.findingKey,
        finding.lifecycle.status,
      ]),
    );
    return {
      ...dataset,
      qualityLifecyclePersistenceAvailable: true,
      qualityIssues: reconciled.findings.map((finding) => ({
        ...finding,
        status: statusByFindingKey.get(finding.lifecycle.findingKey),
      })),
    };
  } catch {
    return { ...dataset, qualityLifecyclePersistenceAvailable: false };
  }
}
