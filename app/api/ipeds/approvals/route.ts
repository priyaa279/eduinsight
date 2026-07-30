import { env } from "cloudflare:workers";
import generatedCom from "../../../data/ipeds-com.generated.json";

export const runtime = "edge";

const createTableSql = `
  CREATE TABLE IF NOT EXISTS ipeds_package_approvals (
    id TEXT PRIMARY KEY,
    survey_code TEXT NOT NULL,
    collection_year TEXT NOT NULL,
    spec_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    object_key TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    approver TEXT NOT NULL,
    approved_at TEXT NOT NULL,
    validation_summary TEXT NOT NULL,
    explanations_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at_epoch INTEGER NOT NULL
  )
`;

const createIndexSql = `
  CREATE INDEX IF NOT EXISTS ipeds_package_approvals_created_idx
  ON ipeds_package_approvals (created_at_epoch DESC)
`;

async function ensureSchema() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable.");
  await env.DB.batch([
    env.DB.prepare(createTableSql),
    env.DB.prepare(createIndexSql),
  ]);
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET() {
  try {
    await ensureSchema();
    const result = await env.DB.prepare(
      `SELECT id, survey_code AS surveyCode, collection_year AS collectionYear,
        spec_id AS specId, file_name AS fileName, sha256, approver,
        approved_at AS approvedAt, validation_summary AS validationSummary,
        status
       FROM ipeds_package_approvals
       ORDER BY created_at_epoch DESC
       LIMIT 25`,
    ).all();
    return Response.json(
      { approvals: result.results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "IPEDS approval records are unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      surveyCode?: unknown;
      collectionYear?: unknown;
      specId?: unknown;
      fileName?: unknown;
      uploadText?: unknown;
      approver?: unknown;
      explanations?: unknown;
      validationFailureCount?: unknown;
      completeSurveyPackage?: unknown;
    };
    const requiredStrings = [
      body.surveyCode,
      body.collectionYear,
      body.specId,
      body.fileName,
      body.uploadText,
      body.approver,
    ];
    if (requiredStrings.some((value) => typeof value !== "string" || !value.trim())) {
      return Response.json(
        { error: "The approval request is incomplete." },
        { status: 400 },
      );
    }
    if (Number(body.validationFailureCount) !== 0) {
      return Response.json(
        { error: "A package with validation failures cannot be marked ready." },
        { status: 409 },
      );
    }
    if (body.completeSurveyPackage === false) {
      return Response.json(
        { error: "An incomplete survey package cannot be marked ready." },
        { status: 409 },
      );
    }
    if (body.surveyCode !== "C") {
      return Response.json(
        {
          error:
            "Only the complete Completions package can currently be marked ready. EF remains a partial package.",
        },
        { status: 409 },
      );
    }
    if (
      body.specId !== generatedCom.specId ||
      body.collectionYear !== generatedCom.collectionYear ||
      body.uploadText !== generatedCom.uploadText ||
      generatedCom.structuralFailureCount !== 0 ||
      generatedCom.reconciliationFailureCount !== 0
    ) {
      return Response.json(
        {
          error:
            "The submitted artifact does not match the current governed, validated Completions package.",
        },
        { status: 409 },
      );
    }
    const explanations =
      body.explanations && typeof body.explanations === "object"
        ? body.explanations
        : {};
    const explanationValues = Object.values(explanations as Record<string, unknown>);
    if (
      !explanationValues.length ||
      explanationValues.some(
        (value) => typeof value !== "string" || !value.trim(),
      )
    ) {
      return Response.json(
        { error: "Every material variance needs a written explanation." },
        { status: 409 },
      );
    }

    await ensureSchema();
    if (!env.ARTIFACTS) throw new Error("R2 binding ARTIFACTS is unavailable.");
    const uploadText = body.uploadText as string;
    const approvedAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(uploadText),
    );
    const sha256 = hex(digest);
    const objectKey = `ipeds/${body.collectionYear}/${body.surveyCode}/${id}/${body.fileName}`;
    await env.ARTIFACTS.put(objectKey, uploadText, {
      httpMetadata: { contentType: "text/plain;charset=utf-8" },
      customMetadata: {
        sha256,
        surveyCode: body.surveyCode as string,
        specId: body.specId as string,
        approvedAt,
      },
    });
    await env.DB.prepare(
      `INSERT INTO ipeds_package_approvals
        (id, survey_code, collection_year, spec_id, file_name, object_key,
         sha256, approver, approved_at, validation_summary, explanations_json,
         status, created_at_epoch)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        body.surveyCode,
        body.collectionYear,
        body.specId,
        body.fileName,
        objectKey,
        sha256,
        body.approver,
        approvedAt,
        "0 structural or reconciliation failures",
        JSON.stringify(explanations),
        "Ready for keyholder upload to NCES DCS",
        Date.now(),
      )
      .run();

    return Response.json(
      {
        approval: {
          id,
          surveyCode: body.surveyCode,
          collectionYear: body.collectionYear,
          specId: body.specId,
          fileName: body.fileName,
          sha256,
          approver: body.approver,
          approvedAt,
          status: "Ready for keyholder upload to NCES DCS",
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "EduInsight could not persist the IPEDS approval." },
      { status: 503 },
    );
  }
}
