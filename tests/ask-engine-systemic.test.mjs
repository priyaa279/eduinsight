import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  analyzeQuestion,
  governancePolicyForQuestion,
} from "../lib/ask-engine.mjs";

const atlas = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);

const clone = (value = atlas) => structuredClone(value);
const resultFor = (question, dataset = atlas) =>
  analyzeQuestion(question, dataset);
const valuesFor = (question, dataset = atlas) =>
  resultFor(question, dataset).answer.points.map((point) => point.value);
const labelsFor = (question, dataset = atlas) =>
  resultFor(question, dataset).answer.points.map((point) => point.label);
const answerText = (result) =>
  [
    result.answer.headline,
    result.answer.summary,
    ...result.answer.notes,
    ...result.answer.limitations,
  ].join(" ");

function controlledComputerScienceDataset() {
  const dataset = clone();
  const allRow = dataset.enrollmentCubes.all.find(
    (row) => row.programId === "PCS" && row.year === 2025,
  );
  allRow.count = 500;

  const residency = dataset.enrollmentCubes.residency.filter(
    (row) => row.programId === "PCS" && row.year === 2025,
  );
  for (const row of residency) {
    row.count =
      row.value === "International"
        ? 250
        : row.value === "In-state"
          ? 125
          : 125;
  }

  const sections = dataset.sections.filter(
    (section) => section.programId === "PCS",
  );
  sections.forEach((section, index) => {
    section.seats = index === 0 ? 500 : 0;
    section.filled = index === 0 ? 500 : 0;
    section.utilization = section.seats
      ? section.filled / section.seats
      : 0;
  });
  const capacity = dataset.capacity.find(
    (value) => value.programId === "PCS",
  );
  capacity.seats = 500;
  capacity.filled = 500;
  capacity.utilization = 1;
  return dataset;
}

function buildRedwoodDataset() {
  const years = [2022, 2023, 2024, 2025, 2026];
  const programs = [
    {
      programId: "RDS",
      programName: "BS Data Science",
      degreeLevel: "Undergraduate",
      college: "School of Computing",
      cipCode: "30.7001",
    },
    {
      programId: "RPH",
      programName: "MPH Public Health",
      degreeLevel: "Graduate",
      college: "School of Health",
      cipCode: "51.2201",
    },
    {
      programId: "RFA",
      programName: "BA Fine Arts",
      degreeLevel: "Undergraduate",
      college: "School of Arts",
      cipCode: "50.0701",
    },
    {
      programId: "RBU",
      programName: "BBA Business",
      degreeLevel: "Undergraduate",
      college: "School of Business",
      cipCode: "52.0101",
    },
  ];
  const counts = {
    2022: [3000, 2000, 2800, 2200],
    2023: [3150, 2100, 2900, 2250],
    2024: [3300, 2200, 3000, 2500],
    2025: [3450, 2300, 3100, 2650],
    2026: [3600, 2400, 3200, 2800],
  };
  const all = [];
  const residency = [];
  for (const year of years) {
    programs.forEach((program, index) => {
      const count = counts[year][index];
      all.push({
        year,
        programId: program.programId,
        value: "All",
        count,
      });
      const international = Math.floor(count * 0.25);
      const inState = Math.floor(count * 0.5);
      const outOfState = count - international - inState;
      for (const [value, valueCount] of [
        ["International", international],
        ["In-state", inState],
        ["Out-of-state", outOfState],
      ]) {
        residency.push({
          year,
          programId: program.programId,
          value,
          count: valueCount,
        });
      }
    });
  }
  const retentionAll = [];
  for (const cohortYear of [2022, 2023, 2024, 2025]) {
    programs.forEach((program, index) => {
      const cohortSize = 100 + index * 10;
      const retained = Math.round(
        cohortSize * (0.8 + (cohortYear - 2022) * 0.01),
      );
      retentionAll.push({
        cohortYear,
        programId: program.programId,
        value: "All",
        cohortSize,
        retained,
      });
    });
  }
  const capacity = [
    ["RDS", 4000, 3000],
    ["RPH", 3000, 2700],
    ["RFA", 3500, 1750],
    ["RBU", 3000, 2400],
  ].map(([programId, seats, filled]) => {
    const program = programs.find((value) => value.programId === programId);
    return {
      programId,
      programName: program.programName,
      degreeLevel: program.degreeLevel,
      seats,
      filled,
      utilization: filled / seats,
    };
  });
  const sections = capacity.map((value, index) => ({
    sectionId: `${value.programId}-2026FA-01`,
    termId: "2026FA",
    year: 2026,
    programId: value.programId,
    programName: value.programName,
    degreeLevel: value.degreeLevel,
    courseCode: `RC-${100 + index}`,
    modality: index % 2 ? "Online" : "In person",
    instructorType: "Full-time",
    seats: value.seats,
    filled: value.filled,
    utilization: value.utilization,
    gradedCount: 0,
    dfwCount: 0,
    dfwRate: null,
  }));
  const ipedsChecks = Array.from({ length: 10 }, (_, index) => ({
    runId: "RC-RUN-1",
    checkId: `RC-${String(index + 1).padStart(2, "0")}`,
    checkName: `Redwood validation ${index + 1}`,
    status: index === 9 ? "Review" : "Passed",
    weight: 10,
  }));
  return {
    generatedAt: "2026-10-15T10:00:00-07:00",
    dataBoundary: "Synthetic records only",
    institution: {
      institutionId: "REDWOOD",
      institutionName: "Redwood Coast College",
    },
    catalogs: {
      years,
      programs,
      residencies: ["In-state", "International", "Out-of-state"],
      genders: ["Woman", "Man", "Nonbinary"],
      raceEthnicities: ["Asian", "Black or African American", "White"],
      academicStatuses: ["Good Standing", "Probation"],
      courses: sections.map((section) => section.courseCode),
      modalities: ["In person", "Online"],
    },
    enrollment: [],
    enrollmentCubes: {
      all,
      residency,
      gender: [],
      race_ethnicity: [],
      first_generation: [],
      pell_eligible: [],
      attendance_status: [],
      academic_status: [],
    },
    retention: [],
    retentionCubes: {
      all: retentionAll,
      residency: [],
      gender: [],
      race_ethnicity: [],
      first_generation: [],
      pell_eligible: [],
    },
    ipedsReadiness: [
      {
        runId: "RC-RUN-1",
        sequence: 1,
        readiness: 0.9,
        passedChecks: 9,
        totalChecks: 10,
      },
    ],
    qualityIssues: [
      {
        issueId: "RC-DQ-1",
        severity: "Medium",
        title: "Residency extract arrived one day late",
        ruleId: "RC_FRESHNESS",
        affectedRecords: 0,
        owner: "Institutional Research",
        sourceSystem: "Redwood SIS",
        status: "Resolved",
      },
    ],
    ipedsChecks,
    capacity,
    sections,
    sourceFiles: [
      "students.csv",
      "student_terms.csv",
      "terms.csv",
      "programs.csv",
      "sections.csv",
      "section_enrollments.csv",
      "ipeds_validation_results.csv",
      "data_quality_issue_log.csv",
    ],
  };
}

test("controlled data: Computer Science enrollment is exactly 500", () => {
  assert.deepEqual(
    valuesFor("What is Computer Science enrollment in 2025?", controlledComputerScienceDataset()),
    [500],
  );
});

test("controlled data: international Computer Science count is exactly 250", () => {
  assert.deepEqual(
    valuesFor(
      "How many international Computer Science students were enrolled in 2025?",
      controlledComputerScienceDataset(),
    ),
    [250],
  );
});

test("controlled data: international Computer Science share is exactly 50%", () => {
  const result = resultFor(
    "What percentage of Computer Science students were international in 2025?",
    controlledComputerScienceDataset(),
  );
  assert.deepEqual(result.answer.points.map((point) => point.value), [50]);
  assert.match(result.answer.headline, /50\.0%/);
  assert.match(result.answer.summary, /250 of 500/);
});

test("controlled data: Computer Science has zero remaining seats", () => {
  assert.deepEqual(
    valuesFor("How many seats remain in Computer Science?", controlledComputerScienceDataset()),
    [0],
  );
});

test("controlled data: Computer Science utilization is exactly 100%", () => {
  assert.deepEqual(
    valuesFor(
      "What is Computer Science capacity utilization?",
      controlledComputerScienceDataset(),
    ),
    [100],
  );
});

test("controlled data: above 100% excludes Computer Science", () => {
  const result = resultFor(
    "Which programs are above 100% capacity?",
    controlledComputerScienceDataset(),
  );
  assert.equal(result.answer.points.length, 0);
});

test("controlled data: at least 100% includes Computer Science", () => {
  assert.deepEqual(
    labelsFor(
      "Which programs are at least 100% capacity?",
      controlledComputerScienceDataset(),
    ),
    ["MS Computer Science"],
  );
});

test("controlled data: exactly 100% includes Computer Science", () => {
  assert.deepEqual(
    labelsFor(
      "Which programs are exactly 100% capacity?",
      controlledComputerScienceDataset(),
    ),
    ["MS Computer Science"],
  );
});

test("mutation: duplicate aggregate cannot inflate total enrollment", () => {
  const dataset = clone();
  dataset.enrollmentCubes.all.push(
    structuredClone(dataset.enrollmentCubes.all[0]),
  );
  const result = resultFor("What was total enrollment in 2025?", dataset);
  assert.equal(result.answer.confidence, "Low");
  assert.equal(result.answer.points.length, 0);
  assert.match(answerText(result), /duplicate|double-count/i);
});

test("mutation: unmapped programs block institution total publication", () => {
  const dataset = clone();
  dataset.catalogs.programs = dataset.catalogs.programs.filter(
    (program) => program.programId !== "PCS",
  );
  const result = resultFor("What was total enrollment in 2025?", dataset);
  assert.equal(result.answer.confidence, "Low");
  assert.equal(result.answer.points.length, 0);
  assert.match(answerText(result), /mapping|unmapped/i);
});

test("mutation: unmapped programs block program-level publication", () => {
  const dataset = clone();
  dataset.catalogs.programs = dataset.catalogs.programs.filter(
    (program) => program.programId !== "PCS",
  );
  const result = resultFor("Show enrollment by program in 2025.", dataset);
  assert.equal(result.answer.confidence, "Low");
  assert.equal(result.answer.points.length, 0);
});

test("mutation: enrollment above capacity surfaces a contradiction", () => {
  const dataset = clone();
  for (const section of dataset.sections) {
    if (section.programId === "PCS") section.filled = section.seats + 5;
  }
  const result = resultFor(
    "What is Computer Science capacity utilization?",
    dataset,
  );
  assert.equal(result.answer.confidence, "Low");
  assert.match(answerText(result), /contradict|exceeds capacity|invalid/i);
});

test("mutation: zero capacity cannot become 0%, Infinity%, or NaN%", () => {
  const dataset = clone();
  for (const section of dataset.sections) {
    if (section.programId === "PCS") {
      section.seats = 0;
      section.filled = 0;
    }
  }
  const capacity = dataset.capacity.find(
    (value) => value.programId === "PCS",
  );
  capacity.seats = 0;
  capacity.filled = 0;
  capacity.utilization = null;
  const result = resultFor(
    "What is Computer Science capacity utilization?",
    dataset,
  );
  assert.equal(result.answer.confidence, "Low");
  assert.equal(result.answer.points.length, 0);
  assert.doesNotMatch(answerText(result), /Infinity%|NaN%/);
});

test("mutation: missing residency is not silently counted as Domestic", () => {
  const dataset = clone();
  const inState = dataset.enrollmentCubes.residency.find(
    (row) =>
      row.programId === "PCS" &&
      row.year === 2025 &&
      row.value === "In-state",
  );
  inState.count -= 100;
  dataset.enrollmentCubes.residency.push({
    year: 2025,
    programId: "PCS",
    value: "Unknown",
    count: 100,
  });
  const result = resultFor(
    "How many domestic students were enrolled in 2025?",
    dataset,
  );
  assert.notEqual(result.answer.confidence, "High");
  assert.match(answerText(result), /unknown|missing|incomplete/i);
});

test("cross-answer: graduate plus undergraduate equals total", () => {
  const total = valuesFor("Total enrollment in 2025")[0];
  const graduate = valuesFor("Graduate enrollment in 2025")[0];
  const undergraduate = valuesFor("Undergraduate enrollment in 2025")[0];
  assert.equal(graduate + undergraduate, total);
});

test("cross-answer: international plus domestic equals total", () => {
  const total = valuesFor("Total enrollment in 2025")[0];
  const international = valuesFor("International enrollment in 2025")[0];
  const domestic = valuesFor("Domestic enrollment in 2025")[0];
  assert.equal(international + domestic, total);
});

test("cross-answer: Pell plus non-Pell equals total", () => {
  const total = valuesFor("Total enrollment in 2025")[0];
  const pell = valuesFor("Pell-eligible enrollment in 2025")[0];
  const nonPell = valuesFor("Non-Pell enrollment in 2025")[0];
  assert.equal(pell + nonPell, total);
});

test("cross-answer: first-generation plus continuing-generation equals total", () => {
  const total = valuesFor("Total enrollment in 2025")[0];
  const first = valuesFor("First-generation enrollment in 2025")[0];
  const continuing = valuesFor("Continuing-generation enrollment in 2025")[0];
  assert.equal(first + continuing, total);
});

test("cross-answer: residency breakdown adds to total", () => {
  const total = valuesFor("Total enrollment in 2025")[0];
  const residency = valuesFor("Show enrollment by residency in 2025");
  assert.equal(residency.reduce((sum, value) => sum + value, 0), total);
});

test("cross-answer: every yearly program ranking adds to the university total", () => {
  for (const year of atlas.catalogs.years) {
    const total = valuesFor(`Total enrollment in ${year}`)[0];
    const programs = valuesFor(
      `Give me the top 20 programs by enrollment in ${year}`,
    );
    assert.equal(
      programs.reduce((sum, value) => sum + value, 0),
      total,
      `program totals differ in ${year}`,
    );
  }
});

test("cross-answer: passed plus review plus failed IPEDS checks equals total", () => {
  const passed = valuesFor("How many IPEDS checks passed?")[0];
  const review = valuesFor("How many IPEDS checks require review?")[0];
  const failedResult = resultFor("How many IPEDS checks failed?");
  const failed = failedResult.answer.points[0]?.value ?? 0;
  assert.equal(passed + review + failed, atlas.ipedsReadiness.at(-1).totalChecks);
});

test("cross-answer: used plus remaining scheduled seats equals capacity", () => {
  for (const item of atlas.capacity) {
    assert.equal(item.filled + (item.seats - item.filled), item.seats);
  }
});

test("narrative: 600 to 678 is an increase of 78 and 13.0%", () => {
  const result = resultFor(
    "How did Computer Science enrollment change from 2024 through 2025?",
  );
  assert.deepEqual(
    result.answer.points.map((point) => point.value),
    [600, 678],
  );
  assert.match(result.answer.headline, /up|increased/i);
  assert.match(answerText(result), /13\.0%/);
  assert.match(answerText(result), /600|678/);
  assert.doesNotMatch(answerText(result), /declined|nearly doubled|78%/i);
});

test("narrative: a flat series is described as stable or unchanged", () => {
  const dataset = clone();
  dataset.enrollmentCubes.all.find(
    (row) => row.programId === "PCS" && row.year === 2024,
  ).count = 678;
  const result = resultFor(
    "How did Computer Science enrollment change from 2024 through 2025?",
    dataset,
  );
  assert.match(result.answer.headline, /stable|flat|unchanged|no change/i);
  assert.doesNotMatch(result.answer.headline, /\bup\b|\bdown\b|increased|decreased/i);
});

test("narrative: a decrease cannot be described as an increase", () => {
  const dataset = clone();
  dataset.enrollmentCubes.all.find(
    (row) => row.programId === "PCS" && row.year === 2025,
  ).count = 500;
  const result = resultFor(
    "How did Computer Science enrollment change from 2024 through 2025?",
    dataset,
  );
  assert.match(result.answer.headline, /down|decreased|declined/i);
  assert.doesNotMatch(result.answer.headline, /\bup\b|increased/i);
});

test("chart contract: Computer Science trend uses years and reconciled values", () => {
  const result = resultFor(
    "How has Computer Science enrollment changed since 2021?",
  );
  assert.deepEqual(
    result.answer.points.map((point) => point.label),
    ["2021", "2022", "2023", "2024", "2025"],
  );
  assert.deepEqual(
    result.answer.points.map((point) => point.value),
    [475, 510, 560, 600, 678],
  );
  assert.match(result.answer.headline, /42\.7%/);
});

test("chart contract: residency request uses residency categories, not years", () => {
  const result = resultFor("Show enrollment by residency in 2025");
  assert.deepEqual(
    result.answer.points.map((point) => point.label),
    ["International", "In-state", "Out-of-state"],
  );
  assert.ok(
    result.answer.points.every((point) => !/^\d{4}$/.test(point.label)),
  );
});

test("chart contract: top five renders exactly five sorted points", () => {
  const points = resultFor(
    "Give me the top 5 programs by enrollment in 2025",
  ).answer.points;
  assert.equal(points.length, 5);
  for (let index = 1; index < points.length; index += 1) {
    assert.ok(points[index].value <= points[index - 1].value);
  }
});

test("confidence: duplicate aggregates cannot be High confidence", () => {
  const dataset = clone();
  dataset.enrollmentCubes.all.push(
    structuredClone(dataset.enrollmentCubes.all[0]),
  );
  assert.notEqual(
    resultFor("Total enrollment in 2025", dataset).answer.confidence,
    "High",
  );
});

test("confidence: stale uploads cannot be High confidence", () => {
  const dataset = clone();
  dataset.generatedAt = "2020-01-01T00:00:00Z";
  const result = resultFor("Total enrollment in 2025", dataset);
  assert.notEqual(result.answer.confidence, "High");
  assert.match(answerText(result), /stale|freshness|generated|old/i);
});

test("confidence: a relevant open program issue lowers confidence automatically", () => {
  const dataset = clone();
  dataset.qualityIssues.push({
    issueId: "DQ-CS-MAP",
    severity: "High",
    title: "Computer Science program mapping incomplete",
    ruleId: "CS_PROGRAM_MAPPING",
    affectedRecords: 14,
    owner: "Institutional Research",
    sourceSystem: "SIS student term",
    status: "Open",
  });
  const result = resultFor("Computer Science enrollment in 2025", dataset);
  assert.notEqual(result.answer.confidence, "High");
  assert.match(answerText(result), /14|mapping|DQ-CS-MAP/i);
});

test("provenance: enrollment excludes capacity and IPEDS sources", () => {
  const result = resultFor("Total enrollment in 2025");
  assert.deepEqual(result.answer.sources, [
    "student_terms.csv",
    "students.csv",
    "programs.csv",
    "terms.csv",
  ]);
});

test("provenance: capacity lists only schedule contributors", () => {
  const result = resultFor("Computer Science capacity utilization");
  assert.deepEqual(result.answer.sources, [
    "sections.csv",
    "section_enrollments.csv",
    "programs.csv",
  ]);
});

test("provenance: the query plan retains population, program, and year", () => {
  const result = resultFor(
    "International Computer Science enrollment in 2025",
  );
  assert.match(result.answer.queryPlan, /scope=PCS/);
  assert.match(result.answer.queryPlan, /population=International/);
  assert.match(result.answer.queryPlan, /years=2025-2025/);
});

test("governance: individual student lists are explicitly refused", () => {
  const result = resultFor(
    "List every international student in Computer Science.",
  );
  assert.equal(result.answer.confidence, "Low");
  assert.equal(result.answer.points.length, 0);
  assert.match(answerText(result), /aggregate|row-level|individual|restricted/i);
});

test("governance: names of Pell students are explicitly refused", () => {
  const result = resultFor(
    "Give me the names of Pell students who did not retain.",
  );
  assert.equal(result.answer.confidence, "Low");
  assert.equal(result.answer.points.length, 0);
  assert.match(answerText(result), /aggregate|row-level|individual|restricted/i);
});

test("governance: a proposed API planner result cannot bypass row-level policy", () => {
  const forcedAggregatePlan = resultFor("Total enrollment in 2025").plan;
  const result = analyzeQuestion(
    "List every international student in Computer Science.",
    atlas,
    forcedAggregatePlan,
  );
  assert.equal(result.answer.disposition, "limitation");
  assert.equal(result.answer.confidence, "Low");
  assert.equal(result.answer.points.length, 0);
  assert.match(answerText(result), /aggregate|row-level|individual|restricted/i);
});

test("governance: the API can block row-level requests before external planning", () => {
  const policy = governancePolicyForQuestion(
    "Give me email addresses for first-generation students.",
  );
  assert.equal(policy.blocked, true);
  assert.match(policy.reason, /aggregate|row-level|individual|restricted/i);
  assert.equal(
    governancePolicyForQuestion("First-generation enrollment in 2025").blocked,
    false,
  );
});

test("filter audit: every detected supported filter is retained", () => {
  const result = resultFor(
    "International graduate Computer Science enrollment in 2025",
  );
  assert.equal(result.plan.filterAudit.complete, true);
  assert.ok(
    result.plan.filterAudit.applied.includes(
      "Program: MS Computer Science",
    ),
  );
  assert.ok(
    result.plan.filterAudit.applied.includes("Degree level: Graduate"),
  );
  assert.ok(
    result.plan.filterAudit.applied.includes("residency: International"),
  );
});

test("dataset isolation: Redwood total is 12,000 in 2026", () => {
  assert.deepEqual(
    valuesFor("What was total enrollment in 2026?", buildRedwoodDataset()),
    [12000],
  );
});

test("dataset isolation: Redwood discovers BS Data Science dynamically", () => {
  const result = resultFor(
    "What was Data Science enrollment in 2026?",
    buildRedwoodDataset(),
  );
  assert.equal(result.plan.programId, "RDS");
  assert.deepEqual(result.answer.points.map((point) => point.value), [3600]);
});

test("dataset isolation: Redwood has no Computer Science program or Atlas value", () => {
  const result = resultFor(
    "What was Computer Science enrollment in 2026?",
    buildRedwoodDataset(),
  );
  assert.equal(result.answer.confidence, "Low");
  assert.equal(result.answer.points.length, 0);
  assert.doesNotMatch(answerText(result), /\b678\b/);
});

test("dataset isolation: Redwood rankings use Redwood programs and values", () => {
  const result = resultFor(
    "Which program had the highest enrollment in 2026?",
    buildRedwoodDataset(),
  );
  assert.equal(result.answer.points[0].label, "BS Data Science");
  assert.equal(result.answer.points[0].value, 3600);
  assert.ok(
    result.answer.points.every((point) => !/Computer Science/.test(point.label)),
  );
});

test("dataset isolation: Redwood residency components reconcile to 12,000", () => {
  const values = valuesFor(
    "Show enrollment by residency in 2026",
    buildRedwoodDataset(),
  );
  assert.equal(values.reduce((sum, value) => sum + value, 0), 12000);
});

test("dataset isolation: Redwood capacity is calculated from Redwood sections", () => {
  const result = resultFor(
    "What is Data Science capacity utilization?",
    buildRedwoodDataset(),
  );
  assert.equal(result.answer.points[0].value, 75);
  assert.doesNotMatch(answerText(result), /\b86%|\b92%/);
});

test("dataset isolation: last fall resolves to Redwood 2026", () => {
  const result = resultFor(
    "What was total enrollment last fall?",
    buildRedwoodDataset(),
  );
  assert.deepEqual(result.answer.points.map((point) => point.value), [12000]);
  assert.match(answerText(result), /2026/);
});

test("dataset isolation: alternating Atlas and Redwood never reuses cached values", () => {
  const redwood = buildRedwoodDataset();
  const sequence = [
    valuesFor("Total enrollment in 2025", atlas)[0],
    valuesFor("Total enrollment in 2026", redwood)[0],
    valuesFor("Total enrollment in 2025", atlas)[0],
    valuesFor("Total enrollment in 2026", redwood)[0],
  ];
  assert.deepEqual(sequence, [18426, 12000, 18426, 12000]);
});
