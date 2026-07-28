import dataset from "../../data/ask-eduinsight.generated.json";
import { analyzeQuestionRequest } from "../../../lib/ask/request-service.mjs";

export const runtime = "edge";

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

    const result = await analyzeQuestionRequest(question, dataset);
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
