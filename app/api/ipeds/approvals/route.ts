import { env } from "cloudflare:workers";
import generatedSuite from "../../../data/ipeds-suite.generated.json";
import {
  isPublicDemoReadOnly,
  publicDemoReadOnlyResponse,
} from "../../../../lib/public-demo-mode.mjs";
import {
  approvalMatchesCurrentArtifact,
  CURRENT_IPEDS_REVIEW_STATUS,
  readIpedsApprovalRows,
} from "../../../../lib/ipeds-approval-store.mjs";

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

type IpedsApprovalRow = {
  id: string;
  surveyCode: string;
  collectionYear: string;
  specId: string;
  fileName: string;
  sha256: string;
  approver: string;
  approvedAt: string;
  validationSummary: string;
  explanationsJson: string;
  status: string;
};

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

function parseExplanations(value: unknown) {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, explanation]) =>
          typeof explanation === "string" && explanation.trim(),
      ),
    );
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  try {
    const publicRead = isPublicDemoReadOnly(request);
    const result = await readIpedsApprovalRows({
      db: env.DB,
      initializeSchema: !publicRead,
      ensureSchema,
    });
    const approvals = (result.results as IpedsApprovalRow[]).map((row) => ({
      ...row,
      explanations: parseExplanations(row.explanationsJson),
      explanationsJson: undefined,
    }));
    return Response.json(
      { approvals },
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
  if (isPublicDemoReadOnly(request)) return publicDemoReadOnlyResponse();
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
    const governedPackage = (
      generatedSuite.packages as Record<
        string,
        {
          specId: string;
          collectionYear: string;
          uploadText: string;
          structuralFailureCount: number;
          reconciliationFailureCount: number;
          completenessFailureCount?: number;
          completeSurveyPackage?: boolean;
          sourceReadiness?: string;
        }
      >
    )[body.surveyCode as string];
    if (!governedPackage) {
      return Response.json(
        {
          error: "This survey does not have an official import-layout package.",
        },
        { status: 409 },
      );
    }
    if (!approvalMatchesCurrentArtifact(body, governedPackage)) {
      return Response.json(
        {
          error:
            "Only a current source-backed, reconciled, structurally valid package can be marked ready for IPEDS keyholder review.",
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
    if (!env.DB) throw new Error("D1 binding DB is unavailable.");
    const database = env.DB;
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
    await database.prepare(
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
        "0 structural, completeness, or reconciliation failures",
        JSON.stringify(explanations),
        CURRENT_IPEDS_REVIEW_STATUS,
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
          status: CURRENT_IPEDS_REVIEW_STATUS,
          explanations,
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
