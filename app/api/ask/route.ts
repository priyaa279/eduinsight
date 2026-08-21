import { env } from "cloudflare:workers";
import dataset from "../../data/ask-eduinsight.generated.json";
import { analyzeQuestionRequest } from "../../../lib/ask/request-service.mjs";
import { reconcileStoredLifecycles } from "../../../lib/data-quality/lifecycle-store.mjs";

export const runtime = "edge";

async function datasetWithCurrentQualityLifecycle() {
  if (!env.DB) return dataset;
  const reconciled = await reconcileStoredLifecycles(
    env.DB,
    dataset.qualityIssues,
    dataset.generatedAt,
  );
  const statusByIssueId = new Map(
    reconciled.findings.map((finding) => [
      finding.issueId,
      finding.lifecycle.status,
    ]),
  );
  return {
    ...dataset,
    qualityIssues: dataset.qualityIssues.map((finding) => ({
      ...finding,
      status: statusByIssueId.get(finding.issueId) ?? finding.status,
    })),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: unknown };
    const question =
      typeof body.question === "string" ? body.question.trim().slice(0, 1000) : "";
    if (!question) {
      return Response.json(
        { error: "Enter a question about the uploaded institutional data." },
        { status: 400 },
      );
    }

    const governedDataset = await datasetWithCurrentQualityLifecycle();
    const result = await analyzeQuestionRequest(question, governedDataset);
    return Response.json(
      {
        ...result,
        generatedAt: dataset.generatedAt,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "EduInsight could not analyze that question." },
      { status: 500 },
    );
  }
}
