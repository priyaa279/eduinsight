const MEMORY_KINDS = Object.freeze([
  "Definition",
  "Policy",
  "Submission",
  "Analysis",
  "Accreditation",
]);

const EXPLICIT_ALIASES = Object.freeze({
  "definition-fall-headcount": [
    "Fall enrollment",
    "governed enrollment",
    "enrollment definition",
  ],
  "definition-retention": ["retention", "first year retention"],
  "definition-completion": ["completions"],
  "definition-capacity": [
    "course-seat utilization",
    "course seat utilization",
  ],
  "definition-fte-enrollment": ["FTE", "full-time equivalency"],
  "definition-credential-level": ["Award level"],
  "definition-collection-periods": [
    "Fall collection",
    "Winter collection",
    "Spring collection",
  ],
});

const ACTIVE_POLICY_STATUSES = new Set(["Approved", "Current"]);

export class MemoryCatalogValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "MemoryCatalogValidationError";
    this.code = "MEMORY_CATALOG_INVALID";
    this.errors = errors;
  }
}

export function normalizeMemoryReference(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function recordError(recordId, catalogVersion, field, code, message) {
  return { recordId, catalogVersion, field, code, message };
}

export function validateMemoryRecord(record, catalogVersion = "unknown") {
  const errors = [];
  const recordId =
    record && typeof record.id === "string" && record.id.trim()
      ? record.id.trim()
      : null;
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return [
      recordError(null, catalogVersion, null, "INVALID_RECORD", "Record must be an object."),
    ];
  }
  if (!recordId) {
    errors.push(
      recordError(null, catalogVersion, "id", "MISSING_ID", "Record ID is required."),
    );
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recordId)) {
    errors.push(
      recordError(
        recordId,
        catalogVersion,
        "id",
        "INVALID_ID",
        "Record ID must use lowercase letters, numbers, and single hyphen separators.",
      ),
    );
  }
  if (!MEMORY_KINDS.includes(record.kind)) {
    errors.push(
      recordError(
        recordId,
        catalogVersion,
        "kind",
        "INVALID_CATEGORY",
        `Category must be one of: ${MEMORY_KINDS.join(", ")}.`,
      ),
    );
  }
  for (const field of [
    "title",
    "excerpt",
    "body",
    "updated",
    "effective",
    "owner",
    "status",
    "source",
    "use",
  ]) {
    if (typeof record[field] !== "string" || !record[field].trim()) {
      errors.push(
        recordError(
          recordId,
          catalogVersion,
          field,
          "MISSING_REQUIRED_TEXT",
          `${field} must be a non-empty string.`,
        ),
      );
    }
  }
  if (record.kind === "Definition" &&
      (typeof record.term !== "string" || !record.term.trim())) {
    errors.push(
      recordError(
        recordId,
        catalogVersion,
        "term",
        "MISSING_DEFINITION_TERM",
        "Definition term is required.",
      ),
    );
  }
  for (const field of ["tags", "related"]) {
    if (!Array.isArray(record[field])) {
      errors.push(
        recordError(
          recordId,
          catalogVersion,
          field,
          `MALFORMED_${field.toUpperCase()}`,
          `${field} must be an array of non-empty strings.`,
        ),
      );
    } else if (
      record[field].some(
        (value) => typeof value !== "string" || !value.trim(),
      )
    ) {
      errors.push(
        recordError(
          recordId,
          catalogVersion,
          field,
          `MALFORMED_${field.toUpperCase()}_ENTRY`,
          `${field} entries must be non-empty strings.`,
        ),
      );
    }
  }
  if (
    record.sourceUrl !== null &&
    record.sourceUrl !== undefined &&
    (typeof record.sourceUrl !== "string" || !/^https?:\/\//i.test(record.sourceUrl))
  ) {
    errors.push(
      recordError(
        recordId,
        catalogVersion,
        "sourceUrl",
        "INVALID_SOURCE_URL",
        "sourceUrl must be null or an HTTP(S) URL.",
      ),
    );
  }
  return errors;
}

function assertCatalogSource(catalog, index) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new MemoryCatalogValidationError(
      `Institutional Memory source catalog ${index + 1} is unavailable or malformed.`,
      [{
        recordId: null,
        catalogVersion: null,
        field: null,
        code: "INVALID_CATALOG",
        message: "Catalog must be an object.",
      }],
    );
  }
  if (
    typeof catalog.catalogVersion !== "string" ||
    !catalog.catalogVersion.trim() ||
    typeof catalog.verifiedAt !== "string" ||
    !catalog.verifiedAt.trim() ||
    !Array.isArray(catalog.records)
  ) {
    throw new MemoryCatalogValidationError(
      `Institutional Memory source catalog ${index + 1} lacks required catalog metadata.`,
      [{
        recordId: null,
        catalogVersion: catalog.catalogVersion ?? null,
        field: null,
        code: "INVALID_CATALOG_METADATA",
        message: "catalogVersion, verifiedAt, and records are required.",
      }],
    );
  }
}

export function memoryAliasesForRecord(record) {
  return [
    ...new Set(
      [record?.term, record?.title, ...(EXPLICIT_ALIASES[record?.id] ?? [])]
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.trim()),
    ),
  ];
}

function aliasIndex(records) {
  const index = new Map();
  for (const record of records) {
    for (const alias of memoryAliasesForRecord(record)) {
      const normalized = normalizeMemoryReference(alias);
      const existing = index.get(normalized);
      if (existing && existing !== record.id) {
        index.set(normalized, null);
      } else if (!index.has(normalized)) {
        index.set(normalized, record.id);
      }
    }
  }
  return index;
}

export function resolveMemoryRelatedReference(records, sourceRecord, reference) {
  const targetId = aliasIndex(records).get(normalizeMemoryReference(reference));
  if (!targetId || targetId === sourceRecord?.id) return null;
  return records.find((record) => record.id === targetId) ?? null;
}

export function buildInstitutionalMemoryCatalog(
  sourceCatalogs,
  { isolateInvalidRecords = false } = {},
) {
  if (!Array.isArray(sourceCatalogs) || !sourceCatalogs.length) {
    throw new MemoryCatalogValidationError(
      "At least one Institutional Memory source catalog is required.",
      [{
        recordId: null,
        catalogVersion: null,
        field: null,
        code: "MISSING_CATALOG",
        message: "No source catalogs were supplied.",
      }],
    );
  }
  sourceCatalogs.forEach(assertCatalogSource);

  const candidates = sourceCatalogs.flatMap((catalog) =>
    catalog.records.map((record, sourceIndex) => ({
      record,
      sourceIndex,
      catalogVersion: catalog.catalogVersion,
    })),
  );
  const invalidCandidates = new Set();
  const errors = [];
  for (const candidate of candidates) {
    const candidateErrors = validateMemoryRecord(
      candidate.record,
      candidate.catalogVersion,
    );
    if (candidateErrors.length) invalidCandidates.add(candidate);
    errors.push(...candidateErrors);
  }
  const ids = new Map();
  for (const candidate of candidates) {
    const id = candidate.record?.id;
    if (typeof id !== "string" || !id.trim()) continue;
    const group = ids.get(id) ?? [];
    group.push(candidate);
    ids.set(id, group);
  }
  const duplicateIds = new Set();
  for (const [id, group] of ids) {
    if (group.length < 2) continue;
    duplicateIds.add(id);
    for (const candidate of group) {
      errors.push(
        recordError(
          id,
          candidate.catalogVersion,
          "id",
          "DUPLICATE_ID",
          `Duplicate record ID ${id} is rejected from the combined catalog.`,
        ),
      );
    }
  }

  let records = candidates
    .filter(
      (candidate) =>
        !invalidCandidates.has(candidate) &&
        !duplicateIds.has(candidate.record?.id),
    )
    .map(({ record, catalogVersion }) => ({
      ...record,
      catalogVersion,
    }));

  const relationErrors = [];
  for (const record of records) {
    for (const reference of record.related) {
      if (!resolveMemoryRelatedReference(records, record, reference)) {
        relationErrors.push(
          recordError(
            record.id,
            record.catalogVersion,
            "related",
            "UNRESOLVED_RELATED_REFERENCE",
            `Related reference “${reference}” does not resolve to one exact governed record.`,
          ),
        );
      }
    }
  }
  errors.push(...relationErrors);
  if (relationErrors.length) {
    const relationInvalidIds = new Set(relationErrors.map((error) => error.recordId));
    records = records.filter((record) => !relationInvalidIds.has(record.id));
  }

  if (errors.length && !isolateInvalidRecords) {
    throw new MemoryCatalogValidationError(
      `Institutional Memory validation rejected ${errors.length} issue${errors.length === 1 ? "" : "s"}.`,
      errors,
    );
  }

  const recordSource = new Map(
    candidates.map(({ record, catalogVersion }) => [record?.id, catalogVersion]),
  );
  const sourceCatalogMetadata = sourceCatalogs.map((catalog) => ({
    catalogVersion: catalog.catalogVersion,
    verifiedAt: catalog.verifiedAt,
    recordCount: catalog.records.length,
  }));
  const definitions = records
    .filter((record) => record.kind === "Definition")
    .map((record) => ({
      id: record.id,
      kind: record.kind,
      term: record.term,
      title: record.title,
      aliases: memoryAliasesForRecord(record),
      definition: record.body,
      excerpt: record.excerpt,
      institutionalUse: record.use,
      source: record.source,
      sourceUrl: record.sourceUrl ?? null,
      owner: record.owner,
      calculation: record.calculation ?? null,
      numerator: record.numerator ?? null,
      denominator: record.denominator ?? null,
      status: record.status,
      catalogVersion: recordSource.get(record.id),
    }));

  return {
    contractVersion: "institutional-memory.combined.v1",
    technicalValidation: {
      status: errors.length ? "passed_with_rejections" : "passed",
      schemaVersion: "institutional-memory-record.v1",
      validatedRecordCount: records.length,
      rejectedRecordCount: new Set(
        errors.map((error) => error.recordId).filter(Boolean),
      ).size,
      validationIssueCount: errors.length,
    },
    records,
    definitions,
    errors,
    sourceCatalogs: sourceCatalogMetadata,
    counts: {
      records: records.length,
      definitions: definitions.length,
      policies: records.filter((record) => record.kind === "Policy").length,
      submissions: records.filter((record) => record.kind === "Submission").length,
      analyses: records.filter((record) => record.kind === "Analysis").length,
      accreditation: records.filter((record) => record.kind === "Accreditation").length,
      sourceReferences: new Set(records.map((record) => record.source)).size,
      ownerReferences: new Set(records.map((record) => record.owner)).size,
    },
  };
}

export function isActiveMemoryPolicy(record) {
  return record?.kind === "Policy" && ACTIVE_POLICY_STATUSES.has(record.status);
}

export function memoryEffectivePeriodLabel(kind) {
  if (kind === "Submission") return "Reporting period";
  if (kind === "Analysis") return "Analysis period";
  if (kind === "Accreditation") return "Evidence period";
  return "Effective period";
}

export function selectVisibleMemoryRecord(records, selectedId) {
  if (!Array.isArray(records) || records.length === 0) return null;
  return records.find((record) => record.id === selectedId) ?? records[0];
}
