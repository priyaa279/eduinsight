import dataset from "../../data/ask-eduinsight.generated.json";
import {
  analyzeQuestion,
  queryPlanSchema,
} from "../../../lib/ask-engine.mjs";

export const runtime = "edge";

function extractResponseText(response: Record<string, unknown>) {
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return "";
  for (const item of response.output) {
    if (!item || typeof item !== "object" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (
        content &&
        typeof content === "object" &&
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }
  return "";
}

async function planWithOpenAI(question: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const programCatalog = dataset.catalogs.programs
    .map(
      (program) =>
        `${program.programId}: ${program.programName} (${program.degreeLevel})`,
    )
    .join("\n");
  const instructions = `You are the semantic planning layer for EduInsight, a governed higher-education analytics application.

Convert the user's question into exactly one query plan. Do not calculate a result and do not invent a metric.

Available governed metrics:
- enrollment: distinct Fall census headcount by year, program, college, degree level, residency, gender, race/ethnicity, first-generation status, Pell status, full/part-time status, and academic standing
- retention: following-Fall retention for FTFT cohorts by cohort year, program, college, degree level, residency, gender, race/ethnicity, first-generation status, and Pell status
- ipeds_readiness: weighted IPEDS Fall Enrollment readiness, validation-run trend, and current check status
- quality_issues: open, resolved, or all findings by severity, owner, source system, status, issue count, or affected-record count
- capacity_utilization: scheduled seats, filled registrations, utilization, and available seats by program, course, or modality
- course_outcomes: DFW rates by program, course, or modality when final_grade values are present
- data_catalog: questions asking what data, sources, or capabilities are available
- unsupported: anything outside those facts

Program catalog:
${programCatalog}

Important resolution rules:
- Select a specific programId only when the question names that program or an unambiguous alias.
- "MS enrollment" or "MS retention" without a named subject means programScope=masters_of_science, degreeLevel=Graduate, and programId=null.
- "BS enrollment" or "BS retention" without a named subject means programScope=bachelors_of_science, degreeLevel=Undergraduate, and programId=null.
- "Graduate enrollment" or "graduate retention" means programScope=degree_level, degreeLevel=Graduate, and programId=null.
- Map a named demographic or status filter to populationDimension and populationValue. Use populationDimension=all and populationValue=null when no such filter is requested.
- Use groupBy only for the dimension the user asks to compare, rank, or break down. Use groupBy=none for a single total.
- Use timeMode=trend for "since", "changed", "trend", "from", "between", or "over time"; single for one named year; otherwise latest.
- For retention questions explicitly comparing one population with the full matched cohort, use comparisonMode=groups. Use trend for a cohort-year trend, ranking for highest/lowest, and snapshot otherwise.
- Use ranking=highest or lowest only when requested; otherwise none.
- Use measure=affected_records only for record-impact questions, available_seats only for open-seat questions, utilization for capacity percentages, dfw_rate for outcomes, retention_rate for retention, readiness for readiness, and count otherwise.
- Residency values are ${dataset.catalogs.residencies.join(", ")}. Gender values are ${dataset.catalogs.genders.join(", ")}. Race/ethnicity values are ${dataset.catalogs.raceEthnicities.join(", ")}.
- Course codes are ${dataset.catalogs.courses.join(", ")}. Modalities are ${dataset.catalogs.modalities.join(", ")}.
- If the requested field or metric is absent, select unsupported or the closest correct governed metric so the deterministic executor can return an explicit source limitation. Never silently drop a requested filter.
- Never carry a program from an earlier question into the current question.
- Use only years ${dataset.catalogs.years.join(", ")}.
- The language model plans; the application performs every calculation deterministically after validating the plan.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      store: false,
      instructions,
      input: question,
      max_output_tokens: 1200,
      text: {
        format: {
          type: "json_schema",
          name: "eduinsight_query_plan",
          strict: true,
          schema: queryPlanSchema(dataset),
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI planner returned ${response.status}: ${message.slice(0, 240)}`);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const text = extractResponseText(payload);
  if (!text) throw new Error("OpenAI planner returned no structured text.");
  return JSON.parse(text);
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

    let proposedPlan = null;
    let planner = "local";
    let plannerWarning: string | null = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        proposedPlan = await planWithOpenAI(question);
        planner = "openai";
      } catch (error) {
        planner = "local_fallback";
        plannerWarning =
          error instanceof Error
            ? "The language planner was unavailable, so the governed local planner was used."
            : "The governed local planner was used.";
      }
    }

    const result = analyzeQuestion(question, dataset, proposedPlan);
    return Response.json(
      {
        ...result,
        planner,
        plannerWarning,
        model: planner === "openai" ? process.env.OPENAI_MODEL || "gpt-5.6" : null,
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
