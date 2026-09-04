export const CURRENT_IPEDS_REVIEW_STATUS =
  "Ready for IPEDS keyholder review";

export async function readIpedsApprovalRows({
  db,
  initializeSchema = false,
  ensureSchema,
}) {
  if (!db) throw new Error("D1 binding DB is unavailable.");
  if (initializeSchema) await ensureSchema();
  return db
    .prepare(
      `SELECT id, survey_code AS surveyCode, collection_year AS collectionYear,
        spec_id AS specId, file_name AS fileName, sha256, approver,
        approved_at AS approvedAt, validation_summary AS validationSummary,
        explanations_json AS explanationsJson, status
       FROM ipeds_package_approvals
       ORDER BY created_at_epoch DESC
       LIMIT 25`,
    )
    .all();
}

export function approvalMatchesCurrentArtifact(body, governedPackage) {
  return Boolean(
    governedPackage &&
      governedPackage.completeSurveyPackage === true &&
      governedPackage.sourceReadiness === "source_backed" &&
      body.specId === governedPackage.specId &&
      body.collectionYear === governedPackage.collectionYear &&
      body.uploadText === governedPackage.uploadText &&
      governedPackage.structuralFailureCount === 0 &&
      governedPackage.reconciliationFailureCount === 0 &&
      Number(governedPackage.completenessFailureCount ?? 0) === 0,
  );
}
