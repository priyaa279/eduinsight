import fs from "node:fs";

const uploadUrl = new URL("../../data/sample-university-upload/", import.meta.url);

export function parseGovernedCsv(fileName) {
  const text = fs.readFileSync(new URL(fileName, uploadUrl), "utf8");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (row.length || cell) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...dataRows] = rows.filter((candidate) =>
    candidate.some((value) => value !== ""),
  );
  return dataRows.map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    ),
  );
}

export function loadDataQualityContext() {
  const context = {
    generatedAt: "2025-10-14T09:42:00-07:00",
    institutions: parseGovernedCsv("institution.csv"),
    terms: parseGovernedCsv("terms.csv"),
    programs: parseGovernedCsv("programs.csv"),
    students: parseGovernedCsv("students.csv"),
    studentTerms: parseGovernedCsv("student_terms.csv"),
    sections: parseGovernedCsv("sections.csv"),
    sectionEnrollments: parseGovernedCsv("section_enrollments.csv"),
    completions: parseGovernedCsv("completions.csv"),
    financialAid: parseGovernedCsv("financial_aid.csv"),
  };
  const fallTerms = context.terms
    .filter((term) => term.season === "Fall")
    .sort((left, right) => left.term_id.localeCompare(right.term_id));
  context.currentTerm = fallTerms.find((term) => term.is_current === "1");
  context.priorTerm = fallTerms[fallTerms.indexOf(context.currentTerm) - 1];
  context.currentStudentTermRows = context.studentTerms.filter(
    (row) =>
      row.term_id === context.currentTerm.term_id &&
      row.census_enrolled === "1" &&
      row.reportable === "1",
  );
  return context;
}
