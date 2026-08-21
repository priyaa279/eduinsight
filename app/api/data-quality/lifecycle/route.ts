import { env } from "cloudflare:workers";
import commandCenter from "../../../data/command-center.generated.json";
import {
  isLifecycleStatus,
  stableFindingIdentity,
} from "../../../../lib/data-quality/lifecycle.mjs";
import {
  ensureLifecycleSchema,
  reconcileStoredLifecycles,
  synchronizeLifecycleRecords,
  updateLifecycleRecord,
} from "../../../../lib/data-quality/lifecycle-store.mjs";

export const runtime = "edge";

const REVIEWER_IDENTITY = "local-ir-admin";
const REVIEWER_DISPLAY_NAME = "Institutional Research";
const MAX_NOTES_LENGTH = 4000;

function currentFindings() {
  return commandCenter.qualityFindings;
}

export async function GET() {
  try {
    if (!env.DB) throw new Error("D1 binding DB is unavailable.");
    const reconciled = await reconcileStoredLifecycles(
      env.DB,
      currentFindings(),
      commandCenter.generatedAt,
    );
    return Response.json(reconciled, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Data Quality lifecycle records are unavailable." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      findingKey?: unknown;
      status?: unknown;
      notes?: unknown;
      expectedUpdatedAt?: unknown;
    };
    const findingKey =
      typeof body.findingKey === "string" ? body.findingKey.trim() : "";
    const status = typeof body.status === "string" ? body.status : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (!findingKey || !isLifecycleStatus(status)) {
      return Response.json(
        { error: "A current finding and valid lifecycle status are required." },
        { status: 400 },
      );
    }
    if (notes.length > MAX_NOTES_LENGTH) {
      return Response.json(
        { error: `Review notes cannot exceed ${MAX_NOTES_LENGTH} characters.` },
        { status: 400 },
      );
    }
    const finding = currentFindings().find(
      (candidate) => stableFindingIdentity(candidate) === findingKey,
    );
    if (!finding) {
      return Response.json(
        { error: "That finding is not active in the current evaluation." },
        { status: 409 },
      );
    }

    if (!env.DB) throw new Error("D1 binding DB is unavailable.");
    await ensureLifecycleSchema(env.DB);
    await synchronizeLifecycleRecords(
      env.DB,
      currentFindings(),
      commandCenter.generatedAt,
    );
    const existing = await env.DB.prepare(
      `SELECT updated_at AS updatedAt
       FROM data_quality_finding_lifecycle WHERE finding_key = ?`,
    )
      .bind(findingKey)
      .first<{ updatedAt: string }>();
    if (
      typeof body.expectedUpdatedAt === "string" &&
      existing?.updatedAt &&
      body.expectedUpdatedAt !== existing.updatedAt
    ) {
      return Response.json(
        { error: "This finding was updated elsewhere. Reload before saving." },
        { status: 409 },
      );
    }

    const row = await updateLifecycleRecord(env.DB, {
        findingKey,
        status,
        notes,
        reviewerIdentity: REVIEWER_IDENTITY,
        reviewerDisplayName: REVIEWER_DISPLAY_NAME,
        updatedAt: new Date().toISOString(),
      });
    return Response.json(
      { lifecycle: row },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "EduInsight could not persist the finding lifecycle." },
      { status: 503 },
    );
  }
}
