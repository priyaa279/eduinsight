export class AskRequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "AskRequestError";
    this.status = status;
  }
}

export async function parseAskRequest(request) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AskRequestError("The request body must contain valid JSON.", 400);
    }
    throw error;
  }
  const question =
    typeof body?.question === "string" ? body.question.trim().slice(0, 1000) : "";
  if (!question) {
    throw new AskRequestError(
      "Enter a question about the uploaded institutional data.",
      400,
    );
  }
  return question;
}
