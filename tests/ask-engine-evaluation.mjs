import fs from "node:fs/promises";

import { analyzeQuestion } from "../lib/ask-engine.mjs";

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);
const capacityRows = dataset.capacity.map((row) => ({
  ...row,
  utilizationPercent: (row.filled / row.seats) * 100,
  availableSeats: row.seats - row.filled,
}));
const capacityByUtilization = capacityRows.toSorted(
  (left, right) => right.utilizationPercent - left.utilizationPercent,
);
const capacityByAvailableSeats = capacityRows.toSorted(
  (left, right) => right.availableSeats - left.availableSeats,
);
const computerScienceCapacity = capacityRows.find(
  (row) => row.programId === "PCS",
);

const cases = [];
const add = (category, question, expected) =>
  cases.push({ id: cases.length + 1, category, question, expected });

// Enrollment: basic
add("enrollment-basic", "What was total enrollment in Fall 2025?", {
  metric: "enrollment",
  values: [18426],
  labels: ["2025"],
});
add("enrollment-basic", "How has total enrollment changed since 2021?", {
  metric: "enrollment",
  groupBy: "none",
  timeMode: "trend",
  values: [18120, 18715, 19018, 19234, 18426],
  labels: ["2021", "2022", "2023", "2024", "2025"],
});
add("enrollment-basic", "What was graduate enrollment in 2025?", {
  metric: "enrollment",
  programScope: "degree_level",
  values: [2283],
});
add("enrollment-basic", "What was undergraduate enrollment in 2025?", {
  metric: "enrollment",
  programScope: "degree_level",
  values: [16143],
});
add("enrollment-basic", "How many students were enrolled in Computer Science in 2025?", {
  metric: "enrollment",
  programId: "PCS",
  values: [678],
  headlineIncludes: ["Computer Science"],
});
add("enrollment-basic", "How has Computer Science enrollment changed since 2021?", {
  metric: "enrollment",
  programId: "PCS",
  values: [475, 510, 560, 600, 678],
  headlineIncludes: ["Computer Science", "42.7%"],
  textIncludes: ["MS Computer Science (PCS)", "No other programs"],
});
add("enrollment-basic", "How has MS Computer Science enrollment changed since 2021?", {
  metric: "enrollment",
  programId: "PCS",
  values: [475, 510, 560, 600, 678],
  headlineIncludes: ["MS Computer Science", "42.7%"],
});
add("enrollment-basic", "Which program had the highest enrollment in 2025?", {
  metric: "enrollment",
  groupBy: "program",
  topValue: 2018,
  textIncludes: ["tie"],
});
add("enrollment-basic", "Which five programs had the largest enrollment in 2025?", {
  metric: "enrollment",
  groupBy: "program",
  pointCount: 5,
});
add("enrollment-basic", "Which programs lost enrollment between 2024 and 2025?", {
  metric: "enrollment",
  groupBy: "program",
  timeMode: "trend",
  headlineAny: ["lost", "declined", "decreased"],
});

// Enrollment: demographic filters and calculations
add("enrollment-demographics", "How many international students were enrolled in 2025?", {
  metric: "enrollment",
  populationValue: "International",
  values: [6217],
});
add("enrollment-demographics", "What percentage of students were international in 2025?", {
  metric: "enrollment",
  populationValue: "International",
  headlineIncludes: ["33.7%"],
});
add("enrollment-demographics", "How many domestic students were enrolled in Fall 2025?", {
  metric: "enrollment",
  values: [12209],
  textIncludes: ["Domestic"],
});
add("enrollment-demographics", "Show enrollment by residency in 2025.", {
  metric: "enrollment",
  groupBy: "residency",
  labels: ["International", "In-state", "Out-of-state"],
  values: [6217, 6182, 6027],
});
add("enrollment-demographics", "Which program has the most international students?", {
  metric: "enrollment",
  populationValue: "International",
  groupBy: "program",
  topLabel: "BS Education",
  topValue: 707,
});
add("enrollment-demographics", "Which graduate program has the highest percentage of international students?", {
  metric: "enrollment",
  programScope: "degree_level",
  groupBy: "program",
  topLabel: "Master of Public Administration",
  headlineIncludes: ["34.6%"],
});
add("enrollment-demographics", "How many Pell-eligible students were enrolled in 2025?", {
  metric: "enrollment",
  populationValue: "Pell-eligible",
  values: [6088],
});
add("enrollment-demographics", "Compare Pell and non-Pell enrollment in 2025.", {
  metric: "enrollment",
  groupBy: "pell_eligible",
  labels: ["Non-Pell", "Pell-eligible"],
  values: [12338, 6088],
});
add("enrollment-demographics", "Show enrollment by first-generation status.", {
  metric: "enrollment",
  groupBy: "first_generation",
  labels: ["Continuing-generation", "First-generation"],
  values: [11789, 6637],
});
add("enrollment-demographics", "How many first-generation graduate students were enrolled in 2025?", {
  metric: "enrollment",
  populationValue: "First-generation",
  programScope: "degree_level",
  values: [821],
});

// Multiple filters
add("multiple-filters", "How many international MS students were enrolled in 2025?", {
  metric: "enrollment",
  populationValue: "International",
  programScope: "masters_of_science",
  values: [600],
});
add("multiple-filters", "How many international Computer Science students were enrolled in 2025?", {
  metric: "enrollment",
  populationValue: "International",
  programId: "PCS",
  values: [234],
});
add("multiple-filters", "How many domestic Computer Science students were enrolled in 2025?", {
  metric: "enrollment",
  programId: "PCS",
  values: [444],
  textIncludes: ["Domestic"],
});
add("multiple-filters", "How many Pell-eligible undergraduate students were enrolled in 2025?", {
  metric: "enrollment",
  populationValue: "Pell-eligible",
  programScope: "degree_level",
  values: [5309],
});
add("multiple-filters", "How many first-generation Pell-eligible students were enrolled in 2025?", {
  disposition: "limitation",
});
add("multiple-filters", "Which graduate program had the most international students in 2025?", {
  metric: "enrollment",
  populationValue: "International",
  programScope: "degree_level",
  groupBy: "program",
  topLabel: "MS Computer Science",
  topValue: 234,
});
add("multiple-filters", "Which undergraduate program had the largest enrollment growth since 2021?", {
  metric: "enrollment",
  programScope: "degree_level",
  groupBy: "program",
  timeMode: "trend",
  textIncludes: ["−54", "tie"],
});

// Enrollment trends and comparisons
add("enrollment-trends", "Show total enrollment from 2021 to 2025.", {
  metric: "enrollment",
  labels: ["2021", "2022", "2023", "2024", "2025"],
  values: [18120, 18715, 19018, 19234, 18426],
});
add("enrollment-trends", "Show Computer Science enrollment from 2021 to 2025.", {
  metric: "enrollment",
  programId: "PCS",
  labels: ["2021", "2022", "2023", "2024", "2025"],
  values: [475, 510, 560, 600, 678],
});
add("enrollment-trends", "How has graduate enrollment changed since 2021?", {
  values: [1540, 1635, 1770, 2100, 2283],
});
add("enrollment-trends", "How has undergraduate enrollment changed since 2021?", {
  values: [16580, 17080, 17248, 17134, 16143],
});
add("enrollment-trends", "How has international enrollment changed since 2021?", {
  populationValue: "International",
  values: [6036, 6223, 6375, 6512, 6217],
});
add("enrollment-trends", "Has domestic enrollment increased or decreased since 2021?", {
  values: [12084, 12492, 12643, 12722, 12209],
  textIncludes: ["Domestic"],
});
add("enrollment-trends", "Which year had the highest enrollment?", {
  groupBy: "year",
  topLabel: "2024",
  topValue: 19234,
  headlineIncludes: ["highest"],
});
add("enrollment-trends", "What was the year-over-year enrollment change in 2025?", {
  headlineAny: ["−4.2%", "-4.2%", "808"],
});
add("enrollment-comparisons", "Compare undergraduate and graduate enrollment in 2025.", {
  labels: ["Undergraduate", "Graduate"],
  values: [16143, 2283],
  headlineAny: ["difference", "more", "larger"],
});
add("enrollment-comparisons", "Compare domestic and international enrollment in 2025.", {
  labels: ["Domestic", "International"],
  values: [12209, 6217],
  headlineAny: ["difference", "more", "larger"],
});
add("enrollment-comparisons", "Compare Computer Science enrollment in 2021 and 2025.", {
  programId: "PCS",
  labels: ["2021", "2025"],
  values: [475, 678],
});
add("enrollment-comparisons", "Compare MS Computer Science with the other graduate programs in 2025.", {
  labels: ["MS Computer Science", "Other graduate programs"],
  values: [678, 1605],
});
add("enrollment-comparisons", "Which grew faster since 2021: undergraduate or graduate enrollment?", {
  headlineIncludes: ["Graduate", "48.2%"],
});
add("enrollment-comparisons", "Which grew faster since 2021: domestic or international enrollment?", {
  headlineIncludes: ["International", "3.0%"],
});

// Retention
add("retention-basic", "What was overall first-year retention for the 2024 cohort?", {
  metric: "retention",
  values: [78.4],
  labels: ["2024"],
});
add("retention-basic", "How has retention changed since 2021?", {
  metric: "retention",
  labels: ["2021", "2022", "2023", "2024"],
  values: [72, 71, 77.6, 78.4],
});
add("retention-basic", "How has BS retention changed since 2021?", {
  values: [72.9, 68.9, 76.9, 78.1],
});
add("retention-basic", "How has MS retention changed since 2021?", {
  values: [68.8, 72.1, 82.5, 76.6],
});
add("retention-basic", "What was BS retention in 2024?", {
  values: [78.1],
});
add("retention-basic", "What was MS retention in 2024?", {
  values: [76.6],
});
add("retention-basic", "Which cohort year had the highest retention?", {
  topLabel: "2024",
  topValue: 78.4,
  headlineIncludes: ["highest"],
});
add("retention-basic", "Which cohort year had the lowest retention?", {
  topLabel: "2020",
  topValue: 70,
  headlineIncludes: ["lowest"],
});
add("retention-subgroups", "Compare first-generation and continuing-generation retention in 2024.", {
  groupBy: "first_generation",
  labels: ["First-generation", "Continuing-generation"],
  values: [79.8, 77.6],
});
add("retention-subgroups", "Compare Pell and non-Pell retention in 2024.", {
  groupBy: "pell_eligible",
  labels: ["Pell-eligible", "Non-Pell"],
  values: [79.2, 78],
});
add("retention-subgroups", "What was first-generation retention in 2024?", {
  populationValue: "First-generation",
  values: [79.8],
});
add("retention-subgroups", "What was Pell-eligible retention in 2024?", {
  populationValue: "Pell-eligible",
  values: [79.2],
});
add("retention-subgroups", "Which group had the lowest retention in 2024?", {
  headlineIncludes: ["Continuing-generation", "77.6%"],
});
add("retention-subgroups", "What is the retention gap between Pell and non-Pell students?", {
  headlineIncludes: ["1.1", "point"],
});
add("retention-subgroups", "What is the retention gap between first-generation and continuing-generation students?", {
  headlineIncludes: ["2.2", "point"],
});
add("retention-multiple", "What was first-generation BS retention in 2024?", {
  programScope: "bachelors_of_science",
  populationValue: "First-generation",
  values: [80.3],
});
add("retention-multiple", "What was Pell-eligible BS retention in 2024?", {
  programScope: "bachelors_of_science",
  populationValue: "Pell-eligible",
  values: [77.5],
});
add("retention-multiple", "Compare Pell and non-Pell retention among undergraduate students.", {
  programScope: "degree_level",
  labels: ["Pell-eligible", "Non-Pell"],
});
add("retention-multiple", "How has first-generation retention changed since 2021?", {
  values: [74.1, 71, 77.7, 79.8],
});
add("retention-multiple", "How has Pell-eligible retention changed since 2021?", {
  values: [71.7, 72.1, 76.8, 79.2],
});
add("retention-multiple", "Which student group improved retention the most since 2021?", {
  headlineIncludes: ["Pell-eligible", "7.4"],
});

// Capacity and DFW
add("capacity", "Which graduate programs use the most capacity?", {
  metric: "capacity_utilization",
  labels: capacityByUtilization.map((row) => row.programName),
  values: capacityByUtilization.map((row) => row.utilizationPercent),
});
add("capacity", "Which programs have the most available seats?", {
  measure: "available_seats",
  topLabel: capacityByAvailableSeats[0].programName,
  topValue: capacityByAvailableSeats[0].availableSeats,
});
add("capacity", "Which programs are above 90% capacity?", {
  labels: capacityByUtilization
    .filter((row) => row.utilizationPercent > 90)
    .map((row) => row.programName),
  values: capacityByUtilization
    .filter((row) => row.utilizationPercent > 90)
    .map((row) => row.utilizationPercent),
});
add("capacity", "Is Computer Science close to capacity?", {
  programId: "PCS",
  textIncludes: [
    `${Math.round(computerScienceCapacity.utilizationPercent)}%`,
    computerScienceCapacity.availableSeats.toLocaleString(),
  ],
});
add("capacity", "What is Computer Science capacity utilization?", {
  programId: "PCS",
  values: [computerScienceCapacity.utilizationPercent],
});
add("capacity", "How many seats remain in Computer Science?", {
  programId: "PCS",
  measure: "available_seats",
  values: [computerScienceCapacity.availableSeats],
});
add("capacity", "Which programs have utilization below 50%?", {
  pointCount: 0,
  headlineAny: ["none", "no programs"],
});
add("capacity", "Compare enrollment and capacity for Computer Science.", {
  textIncludes: [
    "678",
    computerScienceCapacity.filled.toLocaleString(),
    computerScienceCapacity.seats.toLocaleString(),
  ],
});

for (const question of [
  "Which courses have the highest DFW rate?",
  "Which courses have the most DFW students?",
  "What is the DFW rate for CS 101?",
  "Which five courses have the highest DFW rate?",
  "Compare DFW rates across course modalities.",
  "Which gateway courses have the highest DFW rate?",
  "How many DFW outcomes occurred this academic year?",
  "Which course contributes the most DFW outcomes?",
  "Is online DFW higher than in-person DFW?",
  "Show DFW rates by course.",
]) {
  add("course-outcomes", question, {
    metric: "course_outcomes",
    disposition: "limitation",
    textIncludes: ["final_grade"],
  });
}

// IPEDS and quality
add("ipeds", "Which IPEDS checks require review?", {
  metric: "ipeds_readiness",
  checkStatus: "Review",
  labels: ["EF-047", "EF-048", "EF-049"],
});
add("ipeds", "Are we ready for IPEDS submission?", {
  metric: "ipeds_readiness",
  headlineIncludes: ["1 source-backed package", "8 modeled demo packages", "2 source gaps"],
  textIncludes: ["does not submit data to NCES"],
});
add("ipeds", "How many IPEDS validation issues are open?", {
  metric: "ipeds_readiness",
  headlineIncludes: ["3", "review"],
});
add("ipeds", "Show critical IPEDS validation issues.", {
  disposition: "limitation",
});
add("ipeds", "Which IPEDS checks passed?", {
  checkStatus: "Passed",
  headlineIncludes: ["46"],
});
add("ipeds", "Which IPEDS checks failed?", {
  headlineAny: ["no failed", "0 failed"],
  textIncludes: ["Review"],
});
add("ipeds", "Which IPEDS issue affects the most records?", {
  disposition: "limitation",
});
add("ipeds", "What needs to be fixed before IPEDS submission?", {
  textIncludes: ["EF-047", "EF-048", "EF-049"],
});
add("ipeds", "Are there any unresolved IPEDS issues?", {
  headlineIncludes: ["3", "review"],
});

add("data-quality", "What data quality issues are currently open?", {
  metric: "quality_issues",
  textIncludes: ["4"],
});
add("data-quality", "How many data quality issues are there?", {
  metric: "quality_issues",
  textIncludes: ["4"],
});
add("data-quality", "Show critical data quality issues.", {
  severity: "Critical",
  values: [1],
});
add("data-quality", "Show high severity issues.", {
  severity: "High",
  values: [3],
});
add("data-quality", "Which issue affects the most records?", {
  headlineIncludes: ["DQ-COM-004", "211"],
});
add("data-quality", "Which source has the most data quality problems?", {
  groupBy: "source_system",
  topLabel: "SIS student term",
});
add("data-quality", "Which owner has unresolved issues?", {
  groupBy: "owner",
  topLabel: "Registrar",
  topValue: 2,
});
add("data-quality", "Show issues assigned to Institutional Research.", {
  issueOwner: "Institutional Research",
  textIncludes: ["1"],
});
add("data-quality", "Which issues have been reviewed?", {
  operation: "quality_lifecycle_status",
  textIncludes: ["0", "In Review"],
});
add("data-quality", "How many records are affected by open issues?", {
  measure: "affected_records",
  textIncludes: ["476"],
});
add("data-quality", "Explain DQ-001.", {
  disposition: "limitation",
});
add("data-quality", "What rule caused the largest data quality issue?", {
  headlineIncludes: ["DQ-COM-004", "211"],
});
for (const word of ["problems", "errors", "issues", "anomalies", "data quality"]) {
  add("data-quality-synonyms", `Show current ${word}.`, {
    metric: "quality_issues",
  });
}

// Ranking semantics and natural language
add("rankings", "Give me the top 3 programs by enrollment.", {
  pointCount: 3,
});
add("rankings", "Give me the top 5 programs by enrollment.", {
  pointCount: 5,
});
add("rankings", "Give me the top 10 programs by enrollment.", {
  pointCount: 10,
});
add("rankings", "Give me the bottom 5 programs by enrollment.", {
  pointCount: 5,
  ranking: "lowest",
});
add("rankings", "Which program grew the most since 2021?", {
  topLabel: "MS Business Analytics",
  headlineIncludes: ["200.0%"],
});
add("rankings", "Which program declined the most since 2021?", {
  headlineAny: ["General Studies", "BA English", "BS Biology", "BBA Business Administration", "BS Mathematics"],
  headlineIncludes: ["−55"],
});
add("rankings", "Which program has the highest percentage of international students?", {
  topLabel: "BS Education",
  headlineIncludes: ["35.0%"],
});
add("rankings", "Which program added the most students since 2021?", {
  topLabel: "MS Business Analytics",
  headlineIncludes: ["390"],
});

for (const question of [
  "How many students were enrolled in Computer Science in 2025?",
  "What was the 2025 enrollment for Computer Science?",
  "How big was CS in 2025?",
  "Tell me how many CS students we had in 2025.",
  "Computer Science enrollment 2025",
]) {
  add("natural-language", question, {
    metric: "enrollment",
    programId: "PCS",
    values: [678],
  });
}
for (const question of [
  "Number of students in Computer Science last year",
]) {
  add("natural-language", question, { disposition: "clarification" });
}

// Context, ambiguity, unsupported, impossible, and contradictory inputs
add("follow-ups", "Why?", { disposition: "clarification" });
add("follow-ups", "How much of that growth came from international students?", {
  disposition: "clarification",
});
add("follow-ups", "What was its capacity utilization in 2025?", {
  disposition: "clarification",
});
for (const question of [
  "How is Computer Science doing?",
  "Show me student performance.",
  "What is our biggest problem?",
  "Which program is best?",
  "Show me graduate data.",
  "What changed?",
]) {
  add("ambiguous", question, { disposition: "clarification" });
}

for (const question of [
  "What is the average student GPA?",
  "What is tuition revenue in 2025?",
  "What is the university budget?",
  "How many faculty members do we have?",
  "What is faculty salary by department?",
  "What is the graduation rate?",
  "What is student satisfaction?",
  "How many students got jobs after graduation?",
  "What is the average salary of graduates?",
  "Which professor has the highest student ratings?",
]) {
  add("unsupported", question, { disposition: "limitation" });
}

for (const question of [
  "How many Computer Science students were enrolled in 1995?",
  "Show Mechanical Engineering enrollment in 2025.",
  "What was retention for PhD Dentistry students?",
  "Show enrollment for campus Mars.",
  "Show students from Wakanda.",
]) {
  add("impossible-filters", question, { disposition: "limitation" });
}

for (const question of [
  "Show undergraduate MS enrollment.",
  "Show BS graduate students.",
  "Show domestic international students.",
  "Show Pell and non-Pell students only who are Pell eligible.",
]) {
  add("contradictions", question, { disposition: "clarification" });
}

// Dates, calculations, why, and provenance
for (const question of [
  "Enrollment in 2021",
  "Enrollment since 2021",
  "Enrollment between 2022 and 2024",
  "Enrollment before 2024",
  "Enrollment after 2023",
]) {
  add("dates", question, { disposition: "clarification" });
}
add("dates", "Compare 2021 versus 2025 enrollment", {
  labels: ["2021", "2025"],
  values: [18120, 18426],
});
add("calculations", "What percentage of 2025 students are international?", {
  headlineIncludes: ["33.7%"],
});
add("calculations", "What percentage of students are graduate students?", {
  headlineIncludes: ["12.4%"],
});
add("calculations", "What is the enrollment growth rate from 2021 to 2025?", {
  headlineIncludes: ["1.7%"],
});
add("calculations", "How many more Computer Science students were there in 2025 than 2021?", {
  headlineIncludes: ["203"],
});
add("calculations", "What is the retention difference between BS and MS students?", {
  headlineIncludes: ["1.5", "point"],
});
add("calculations", "What percentage of total enrollment is Computer Science?", {
  headlineIncludes: ["3.7%"],
});
add("why", "Why did Computer Science enrollment increase?", {
  metric: "enrollment",
  programId: "PCS",
  textAny: ["cannot establish why", "does not establish causation", "descriptive"],
});
for (const question of [
  "What data did you use for this answer?",
  "Which source tables support this result?",
  "How was this metric calculated?",
  "What definition of enrollment are you using?",
  "What definition of retention are you using?",
  "Which records were excluded?",
  "What limitations does this result have?",
]) {
  add("provenance-follow-ups", question, { disposition: "clarification" });
}

// Exact attachment phrasings that were previously represented by equivalent
// semantic cases elsewhere in the suite.
add("attachment-verbatim", "Which programs have the highest capacity utilization?", {
  metric: "capacity_utilization",
  topLabel: capacityByUtilization[0].programName,
  topValue: capacityByUtilization[0].utilizationPercent,
});
add("attachment-verbatim", "Which five programs are closest to full capacity?", {
  metric: "capacity_utilization",
  pointCount: 4,
  topLabel: capacityByUtilization[0].programName,
});
add("attachment-verbatim", "Explain the largest IPEDS validation problem.", {
  metric: "ipeds_readiness",
  textAny: ["EF-047", "EF-048", "EF-049"],
  textIncludes: ["Review"],
});
add("attachment-verbatim", "Why did enrollment increase?", {
  metric: "enrollment",
  textAny: ["cannot establish why", "does not establish causation", "descriptive"],
});
add("attachment-verbatim", "Enrollment from 2021 through 2025", {
  disposition: "clarification",
});
add("attachment-verbatim", "How much did enrollment change from 2021 to 2025?", {
  headlineIncludes: ["1.7%"],
});
add("attachment-verbatim", "Which program has the lowest enrollment?", {
  ranking: "lowest",
  topLabel: "Master of Public Administration",
  topValue: 480,
});
add("attachment-verbatim", "Which program had the highest percentage growth since 2021?", {
  topLabel: "MS Business Analytics",
  headlineIncludes: ["200.0%"],
});
add("attachment-verbatim", "Which program has the highest capacity utilization?", {
  metric: "capacity_utilization",
  topLabel: capacityByUtilization[0].programName,
  topValue: capacityByUtilization[0].utilizationPercent,
});
for (const question of [
  "Which course has the highest DFW rate?",
  "Which course has the most DFW students?",
]) {
  add("attachment-verbatim", question, {
    metric: "course_outcomes",
    disposition: "limitation",
    textIncludes: ["final_grade"],
  });
}
add("attachment-verbatim", "Which data quality issue affects the most records?", {
  metric: "quality_issues",
  headlineIncludes: ["DQ-COM-004", "211"],
});
add("attachment-verbatim", "What was total enrollment in 2025?", {
  values: [18426],
  labels: ["2025"],
});
add("attachment-verbatim", "How has enrollment changed since 2021?", {
  values: [18120, 18715, 19018, 19234, 18426],
});
add("attachment-verbatim", "How has MS enrollment changed since 2021?", {
  programScope: "masters_of_science",
  values: [1080, 1160, 1280, 1600, 1803],
});
add("attachment-verbatim", "What was overall first-year retention in 2024?", {
  metric: "retention",
  values: [78.4],
});

function textFor(result) {
  return [
    result.answer.headline,
    result.answer.summary,
    ...result.answer.notes,
    ...result.answer.limitations,
    result.answer.metric,
    result.answer.queryPlan,
  ].join(" ");
}

function closeEnough(actual, expected) {
  return Math.abs(Number(actual) - Number(expected)) <= 0.11;
}

function evaluate(testCase) {
  const result = analyzeQuestion(testCase.question, dataset);
  const expected = testCase.expected;
  const failures = [];
  const text = textFor(result);
  const lowerText = text.toLowerCase();
  const labels = result.answer.points.map((point) => point.label);
  const values = result.answer.points.map((point) => point.value);
  const disposition = result.answer.disposition;

  if (expected.disposition && disposition !== expected.disposition) {
    failures.push(`disposition ${disposition}; expected ${expected.disposition}`);
  }
  for (const [field, actual] of [
    ["metric", result.plan.metric],
    ["programId", result.plan.programId],
    ["programScope", result.plan.programScope],
    ["populationValue", result.plan.populationValue],
    ["groupBy", result.plan.groupBy],
    ["timeMode", result.plan.timeMode],
    ["measure", result.plan.measure],
    ["checkStatus", result.plan.checkStatus],
    ["severity", result.plan.severity],
    ["status", result.plan.status],
    ["issueOwner", result.plan.issueOwner],
    ["ranking", result.plan.ranking],
  ]) {
    if (field in expected && actual !== expected[field]) {
      failures.push(`${field} ${JSON.stringify(actual)}; expected ${JSON.stringify(expected[field])}`);
    }
  }
  if (expected.labels && JSON.stringify(labels) !== JSON.stringify(expected.labels)) {
    failures.push(`labels ${JSON.stringify(labels)}; expected ${JSON.stringify(expected.labels)}`);
  }
  if (
    expected.values &&
    (values.length !== expected.values.length ||
      values.some((value, index) => !closeEnough(value, expected.values[index])))
  ) {
    failures.push(`values ${JSON.stringify(values)}; expected ${JSON.stringify(expected.values)}`);
  }
  if ("pointCount" in expected && labels.length !== expected.pointCount) {
    failures.push(`pointCount ${labels.length}; expected ${expected.pointCount}`);
  }
  if (expected.topLabel && labels[0] !== expected.topLabel) {
    failures.push(`topLabel ${JSON.stringify(labels[0])}; expected ${JSON.stringify(expected.topLabel)}`);
  }
  if ("topValue" in expected && !closeEnough(values[0], expected.topValue)) {
    failures.push(`topValue ${values[0]}; expected ${expected.topValue}`);
  }
  for (const fragment of expected.headlineIncludes ?? []) {
    if (!result.answer.headline.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`headline missing ${JSON.stringify(fragment)}`);
    }
  }
  if (
    expected.headlineAny &&
    !expected.headlineAny.some((fragment) =>
      result.answer.headline.toLowerCase().includes(fragment.toLowerCase()),
    )
  ) {
    failures.push(`headline missing one of ${JSON.stringify(expected.headlineAny)}`);
  }
  for (const fragment of expected.textIncludes ?? []) {
    if (!lowerText.includes(fragment.toLowerCase())) {
      failures.push(`answer missing ${JSON.stringify(fragment)}`);
    }
  }
  if (
    expected.textAny &&
    !expected.textAny.some((fragment) => lowerText.includes(fragment.toLowerCase()))
  ) {
    failures.push(`answer missing one of ${JSON.stringify(expected.textAny)}`);
  }

  return { ...testCase, result, failures, passed: failures.length === 0 };
}

const results = cases.map(evaluate);
const passed = results.filter((result) => result.passed);
const failed = results.filter((result) => !result.passed);
const categorySummary = [...new Set(cases.map((testCase) => testCase.category))].map(
  (category) => {
    const categoryResults = results.filter((result) => result.category === category);
    return {
      category,
      passed: categoryResults.filter((result) => result.passed).length,
      total: categoryResults.length,
    };
  },
);

console.log(`EduInsight evaluation: ${passed.length}/${results.length} passed`);
for (const summary of categorySummary) {
  console.log(
    `${summary.category.padEnd(27)} ${String(summary.passed).padStart(3)}/${summary.total}`,
  );
}
if (failed.length) {
  console.log("\nFailures:");
  for (const failure of failed) {
    console.log(`\n[${failure.id}] ${failure.category}: ${failure.question}`);
    for (const reason of failure.failures) console.log(`  - ${reason}`);
    console.log(`  - actual: ${failure.result.answer.headline}`);
  }
}

process.exitCode = failed.length ? 1 : 0;
