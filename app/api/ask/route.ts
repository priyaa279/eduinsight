import { env } from "cloudflare:workers";
import dataset from "../../data/ask-eduinsight.generated.json";
import { analyzeQuestionRequest } from "../../../lib/ask/request-service.mjs";
import { AskRequestError, parseAskRequest } from "../../../lib/ask/http-request.mjs";
import { withCurrentQualityLifecycle } from "../../../lib/data-quality/ask-lifecycle-overlay.mjs";
import { isPublicDemoReadOnly } from "../../../lib/public-demo-mode.mjs";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const question = await parseAskRequest(request);

    const governedDataset = await withCurrentQualityLifecycle(dataset, env.DB, {
      allowSynchronization: !isPublicDemoReadOnly(request),
    });
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
  } catch (error) {
    if (error instanceof AskRequestError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return Response.json(
      { error: "EduInsight could not analyze that question." },
      { status: 500 },
    );
  }
}
