import crypto from "node:crypto";
import fs from "node:fs/promises";

import { analyzeQuestion } from "../lib/ask-engine.mjs";
import {
  contractAdjudicatedResult,
  isNoApiContractAdjudication,
} from "./helpers/no-api-contract.mjs";

const dataset = JSON.parse(
  await fs.readFile(
    new URL("../app/data/ask-eduinsight.generated.json", import.meta.url),
    "utf8",
  ),
);
const engineUrl = new URL("../lib/ask-engine.mjs", import.meta.url);
const reportUrl = new URL("./reports/blind-6-first-run.md", import.meta.url);
const round1 = (value) => Number(Number(value).toFixed(1));
const close = (left, right) => Math.abs(Number(left) - Number(right)) <= 0.11;

const programByName = new Map(
  dataset.catalogs.programs.map((program) => [program.programName, program]),
);

function scopedPrograms({ programName, degreeLevel, programScope } = {}) {
  if (programName) return [programByName.get(programName)];
  return dataset.catalogs.programs.filter((program) => {
    if (degreeLevel && program.degreeLevel !== degreeLevel) return false;
    if (
      programScope === "masters_of_science" &&
      !program.programName.startsWith("MS ")
    ) {
      return false;
    }
    if (
      programScope === "bachelors_of_science" &&
      !program.programName.startsWith("BS ")
    ) {
      return false;
    }
    return true;
  });
}

function enrollmentCount({
  year,
  programName,
  degreeLevel,
  programScope,
  dimension = "all",
  value,
}) {
  const ids = new Set(
    scopedPrograms({ programName, degreeLevel, programScope }).map(
      (program) => program.programId,
    ),
  );
  const cube = value === "Domestic" ? "residency" : dimension;
  return (dataset.enrollmentCubes[cube] ?? [])
    .filter(
      (row) =>
        row.year === year &&
        ids.has(row.programId) &&
        (value == null ||
          (value === "Domestic"
            ? row.value !== "International"
            : row.value === value)),
    )
    .reduce((sum, row) => sum + row.count, 0);
}

function enrollmentPoints(spec, years) {
  return years.map((year) => ({
    label: String(year),
    value: enrollmentCount({ ...spec, year }),
  }));
}

function splitPoints(spec, year, dimension) {
  const ids = new Set(
    scopedPrograms(spec).map((program) => program.programId),
  );
  const values = [
    ...new Set(
      dataset.enrollmentCubes[dimension]
        .filter((row) => row.year === year && ids.has(row.programId))
        .map((row) => row.value),
    ),
  ];
  return Object.fromEntries(
    values.map((value) => [
      value,
      enrollmentCount({ ...spec, year, dimension, value }),
    ]),
  );
}

function retentionRate({
  year,
  programName,
  degreeLevel,
  programScope,
  dimension = "all",
  value,
}) {
  const ids = new Set(
    scopedPrograms({ programName, degreeLevel, programScope }).map(
      (program) => program.programId,
    ),
  );
  const rows = dataset.retentionCubes[dimension].filter(
    (row) =>
      row.cohortYear === year &&
      ids.has(row.programId) &&
      (value == null ||
        (value === "Domestic"
          ? row.value !== "International"
          : row.value === value)),
  );
  const numerator = rows.reduce((sum, row) => sum + row.retained, 0);
  const denominator = rows.reduce((sum, row) => sum + row.cohortSize, 0);
  return denominator ? round1((numerator / denominator) * 100) : null;
}

function retentionPoints(spec, years) {
  return years.map((year) => ({
    label: String(year),
    value: retentionRate({ ...spec, year }),
  }));
}

const answer = (extra = {}) => ({
  disposition: "answer",
  numeric: true,
  ...extra,
});
const clarify = {
  disposition: "clarification",
  confidence: "Low",
  pointCount: 0,
};
const limit = {
  disposition: "limitation",
  confidence: "Low",
  pointCount: 0,
};

function enrollmentExpected(spec, years, extra = {}) {
  return answer({
    fields: {
      metric: "enrollment",
      startYear: years[0],
      endYear: years.at(-1),
      ...(spec.programName
        ? { programId: programByName.get(spec.programName).programId }
        : {}),
      ...(spec.degreeLevel ? { degreeLevel: spec.degreeLevel } : {}),
      ...(spec.dimension
        ? {
            populationDimension: spec.dimension,
            populationValue: spec.value,
          }
        : {}),
    },
    points: enrollmentPoints(spec, years),
    filterComplete: true,
    ...extra,
  });
}

function retentionExpected(spec, years, extra = {}) {
  return answer({
    fields: {
      metric: "retention",
      startYear: years[0],
      endYear: years.at(-1),
      ...(spec.programName
        ? { programId: programByName.get(spec.programName).programId }
        : {}),
      ...(spec.degreeLevel ? { degreeLevel: spec.degreeLevel } : {}),
      ...(spec.dimension
        ? {
            populationDimension: spec.dimension,
            populationValue: spec.value,
          }
        : {}),
    },
    points: retentionPoints(spec, years),
    filterComplete: true,
    ...extra,
  });
}

const cases = [];
function add(category, question, expected, metadata = {}) {
  cases.push({
    id: cases.length + 1,
    category,
    question,
    expected,
    metadata,
  });
}

// 1. New cabinet, registrar, and dean wording — 40.
[
  ["Place the Fall 2020 certified census count in the board packet.", {}, [2020]],
  ["What enrollment total was made official at the 2021 freeze?", {}, [2021]],
  ["Pull the university's final fall snapshot for 2022.", {}, [2022]],
  ["How many distinct reportable students counted at census in 2023?", {}, [2023]],
  ["Give cabinet the locked 2024 fall headcount.", {}, [2024]],
  ["What is the latest certified autumn enrollment number?", {}, [2025]],
  ["Lay out institution headcount for every fall beginning in 2020.", {}, [2020, 2021, 2022, 2023, 2024, 2025]],
  ["Show the university-wide census trajectory after 2021.", {}, [2022, 2023, 2024, 2025]],
].forEach(([question, spec, years]) =>
  add("executive-language", question, enrollmentExpected(spec, years)),
);

[
  ["How many graduate students made the Fall 2020 census?", { degreeLevel: "Graduate" }, [2020]],
  ["Put 2022 master's-level headcount in the dean's memo.", { degreeLevel: "Graduate" }, [2022]],
  ["Report the latest graduate census total.", { degreeLevel: "Graduate" }, [2025]],
  ["Chart graduate enrollment across 2020 through 2025.", { degreeLevel: "Graduate" }, [2020, 2021, 2022, 2023, 2024, 2025]],
  ["What was bachelor's-level census enrollment in 2022?", { degreeLevel: "Undergraduate" }, [2022]],
  ["Give me the Fall 2024 undergraduate student count.", { degreeLevel: "Undergraduate" }, [2024]],
  ["Track undergraduate headcount after Fall 2021.", { degreeLevel: "Undergraduate" }, [2022, 2023, 2024, 2025]],
  ["Compare the undergraduate 2020 and 2025 census endpoints.", { degreeLevel: "Undergraduate" }, [2020, 2025]],
].forEach(([question, spec, years]) =>
  add("executive-language", question, enrollmentExpected(spec, years)),
);

[
  ["How many MS Computer Science students counted in Fall 2023?", { programName: "MS Computer Science" }, [2023]],
  ["Provide the Computer Science master's 2025 frozen headcount.", { programName: "MS Computer Science" }, [2025]],
  ["Graph MSCS census enrollment from 2020 through 2025.", { programName: "MS Computer Science" }, [2020, 2021, 2022, 2023, 2024, 2025]],
  ["What was the latest MS Business Analytics enrollment total?", { programName: "MS Business Analytics" }, [2025]],
  ["Trace the Business Analytics master's census after 2021.", { programName: "MS Business Analytics" }, [2022, 2023, 2024, 2025]],
  ["Give the 2023 MS Nursing student census.", { programName: "MS Nursing" }, [2023]],
  ["How has MPA headcount moved from 2020 to 2025?", { programName: "Master of Public Administration" }, [2020, 2025]],
  ["Count General Studies students in the 2024 census.", { programName: "General Studies" }, [2024]],
].forEach(([question, spec, years]) =>
  add("executive-language", question, enrollmentExpected(spec, years)),
);

[
  ["How many international students made the 2023 fall census?", { dimension: "residency", value: "International" }, [2023]],
  ["Give me the non-international total for 2025.", { dimension: "residency", value: "Domestic" }, [2025]],
  ["Report Fall 2024 Pell-recipient enrollment.", { dimension: "pell_eligible", value: "Pell-eligible" }, [2024]],
  ["What was the 2022 non-Pell census count?", { dimension: "pell_eligible", value: "Non-Pell" }, [2022]],
  ["Count first-generation students at the 2025 freeze.", { dimension: "first_generation", value: "First-generation" }, [2025]],
  ["Give continuing-generation headcount for Fall 2021.", { dimension: "first_generation", value: "Continuing-generation" }, [2021]],
  ["How many full-time learners counted in 2024?", { dimension: "attendance_status", value: "Full-time" }, [2024]],
  ["Show the part-time census trend after 2020.", { dimension: "attendance_status", value: "Part-time" }, [2021, 2022, 2023, 2024, 2025]],
].forEach(([question, spec, years]) =>
  add("executive-language", question, enrollmentExpected(spec, years)),
);

[
  ["Put BA English's Fall 2025 census count in the dean's file.", { programName: "BA English" }, [2025]],
  ["Trace BA Psychology enrollment from 2021 through 2024.", { programName: "BA Psychology" }, [2021, 2022, 2023, 2024]],
  ["How many BS Education students counted in 2022?", { programName: "BS Education" }, [2022]],
  ["Give the latest BS Criminal Justice frozen headcount.", { programName: "BS Criminal Justice" }, [2025]],
  ["Chart BS Mathematics census size after 2020.", { programName: "BS Mathematics" }, [2021, 2022, 2023, 2024, 2025]],
  ["What was BBA Business Administration enrollment in Fall 2021?", { programName: "BBA Business Administration" }, [2021]],
  ["Show BS Biology enrollment for every census from 2022 onward.", { programName: "BS Biology" }, [2022, 2023, 2024, 2025]],
  ["Report General Studies headcount at the 2023 freeze.", { programName: "General Studies" }, [2023]],
].forEach(([question, spec, years]) =>
  add("executive-language", question, enrollmentExpected(spec, years)),
);

// 2. Fragments, abbreviations, typos, and shuffled wording — 35.
[
  ["FA25 certified hc pls", {}, [2025]],
  ["ttl census enrlmnt 2024", {}, [2024]],
  ["institution hc since 22", {}, [2022, 2023, 2024, 2025]],
  ["grad enrl fall 23", { degreeLevel: "Graduate" }, [2023]],
  ["undergrad hc FA24", { degreeLevel: "Undergraduate" }, [2024]],
  ["MSCS hc 2025", { programName: "MS Computer Science" }, [2025]],
  ["comp sci master's enrl since 21", { programName: "MS Computer Science" }, [2021, 2022, 2023, 2024, 2025]],
  ["MSBA fall 24 count", { programName: "MS Business Analytics" }, [2024]],
  ["BBA enrl 2023", { programName: "BBA Business Administration" }, [2023]],
  ["MPA heads latest fall", { programName: "Master of Public Administration" }, [2025]],
  ["intl students FA25", { dimension: "residency", value: "International" }, [2025]],
  ["non intl hc 2024", { dimension: "residency", value: "Domestic" }, [2024]],
  ["1st-gen census 23", { dimension: "first_generation", value: "First-generation" }, [2023]],
  ["nonpell enrl since 22", { dimension: "pell_eligible", value: "Non-Pell" }, [2022, 2023, 2024, 2025]],
  ["pt student trend since 21", { dimension: "attendance_status", value: "Part-time" }, [2021, 2022, 2023, 2024, 2025]],
].forEach(([question, spec, years]) =>
  add("messy-unseen", question, enrollmentExpected(spec, years)),
);

[
  ["retntn overall cohort 24", {}, [2024]],
  ["grad persistnce since cohort 21", { degreeLevel: "Graduate" }, [2021, 2022, 2023, 2024]],
  ["undergrad retention cohort 23", { degreeLevel: "Undergraduate" }, [2023]],
  ["MSCS return rate 2024 starters", { programName: "MS Computer Science" }, [2024]],
  ["pell retention FA24 cohort", { dimension: "pell_eligible", value: "Pell-eligible" }, [2024]],
  ["1st-gen persistence since 21", { dimension: "first_generation", value: "First-generation" }, [2021, 2022, 2023, 2024]],
  ["intl retention cohort 23", { dimension: "residency", value: "International" }, [2023]],
  ["domestic persistence since 22", { dimension: "residency", value: "Domestic" }, [2022, 2023, 2024]],
  ["MS Nursing retntn 24", { programName: "MS Nursing" }, [2024]],
  ["BA Psych persistence cohort 22", { programName: "BA Psychology" }, [2022]],
].forEach(([question, spec, years]) =>
  add("messy-unseen", question, retentionExpected(spec, years)),
);

[
  ["MSCS capacity pct", "capacity_utilization", "MS Computer Science"],
  ["MPA seats left rn", "capacity_utilization", "Master of Public Administration"],
  ["ipeds ready rn?", "ipeds_readiness"],
  ["how many ipeds checks need eyeballs?", "ipeds_readiness"],
  ["dq findings open rn", "quality_issues"],
  ["biggest dq record hit", "quality_issues"],
  ["course dfw max?", "course_outcomes", null, "limitation"],
  ["show student names behind hc", null, null, "limitation"],
  ["best major rn?", null, null, "clarification"],
  ["same filters again", null, null, "clarification"],
].forEach(([question, metric, programName, disposition]) => {
  const expected =
    disposition === "limitation"
      ? limit
      : disposition === "clarification"
        ? clarify
        : answer({
            numeric: metric !== "data_catalog",
            fields: {
              metric,
              ...(programName
                ? { programId: programByName.get(programName).programId }
                : {}),
            },
          });
  add("messy-unseen", question, expected);
});

// 3. Supported and impossible multi-filter requests — 35.
[
  ["For Fall 2025, count international graduate students.", { degreeLevel: "Graduate", dimension: "residency", value: "International" }, 2025],
  ["Graduate students who were domestic in the 2024 census: how many?", { degreeLevel: "Graduate", dimension: "residency", value: "Domestic" }, 2024],
  ["Count Pell-eligible undergraduates in Fall 2023.", { degreeLevel: "Undergraduate", dimension: "pell_eligible", value: "Pell-eligible" }, 2023],
  ["How many non-Pell graduate students enrolled in 2025?", { degreeLevel: "Graduate", dimension: "pell_eligible", value: "Non-Pell" }, 2025],
  ["First-generation undergraduates in the 2022 freeze.", { degreeLevel: "Undergraduate", dimension: "first_generation", value: "First-generation" }, 2022],
  ["Give full-time graduate headcount for Fall 2025.", { degreeLevel: "Graduate", dimension: "attendance_status", value: "Full-time" }, 2025],
  ["Count international MSCS students in 2024.", { programName: "MS Computer Science", dimension: "residency", value: "International" }, 2024],
  ["How many domestic students were in MS Computer Science in 2023?", { programName: "MS Computer Science", dimension: "residency", value: "Domestic" }, 2023],
  ["Pell-recipient MS Business Analytics headcount, 2025.", { programName: "MS Business Analytics", dimension: "pell_eligible", value: "Pell-eligible" }, 2025],
  ["Count first-generation MS Nursing students for 2024.", { programName: "MS Nursing", dimension: "first_generation", value: "First-generation" }, 2024],
  ["How many part-time MPA students counted in 2025?", { programName: "Master of Public Administration", dimension: "attendance_status", value: "Part-time" }, 2025],
  ["Out-of-state BBA enrollment in Fall 2023.", { programName: "BBA Business Administration", dimension: "residency", value: "Out-of-state" }, 2023],
  ["Full-time BS Biology students at the 2024 census.", { programName: "BS Biology", dimension: "attendance_status", value: "Full-time" }, 2024],
  ["Count non-Pell BA Psychology students in 2025.", { programName: "BA Psychology", dimension: "pell_eligible", value: "Non-Pell" }, 2025],
  ["International General Studies headcount for Fall 2022.", { programName: "General Studies", dimension: "residency", value: "International" }, 2022],
  ["How many continuing-generation undergraduates enrolled in 2024?", { degreeLevel: "Undergraduate", dimension: "first_generation", value: "Continuing-generation" }, 2024],
  ["Count in-state graduate students in the 2021 census.", { degreeLevel: "Graduate", dimension: "residency", value: "In-state" }, 2021],
  ["Non-Pell MSCS census count for 2025.", { programName: "MS Computer Science", dimension: "pell_eligible", value: "Non-Pell" }, 2025],
  ["First-generation MPA enrollment in 2023.", { programName: "Master of Public Administration", dimension: "first_generation", value: "First-generation" }, 2023],
  ["Part-time BS Mathematics headcount for Fall 2024.", { programName: "BS Mathematics", dimension: "attendance_status", value: "Part-time" }, 2024],
].forEach(([question, spec, year]) =>
  add("filter-completeness", question, enrollmentExpected(spec, [year])),
);

[
  "Count domestic international graduate students in 2025.",
  "How many Pell and non-Pell students were simultaneously Pell eligible?",
  "Show first-generation continuing-generation MSCS students.",
  "Count international Pell first-generation undergraduates in 2025.",
  "Give domestic full-time Pell graduate headcount for 2024.",
  "How many women international students enrolled in 2025?",
  "Show Asian Pell-recipient enrollment by gender.",
  "Count probation students who were also in good standing.",
  "Undergraduate MS students in Fall 2025.",
  "Graduate BS Biology headcount for 2024.",
  "Mechanical Engineering international enrollment in 2025.",
  "Show Computer Science students from campus Jupiter.",
  "Count Dentistry PhD students in Fall 2025.",
  "How many students from Genovia enrolled in 2024?",
  "Give Pell retention by gender and residency together.",
].forEach((question) =>
  add(
    "filter-completeness",
    question,
    {
      ...limit,
      allowed: ["clarification", "limitation"],
    },
    { safetyCritical: "filter" },
  ),
);

// 4. Ranking, share, growth, and time semantics — 35.
[
  ["Give the top four programs by Fall 2023 headcount.", 2023, 4, "highest"],
  ["Return the six smallest programs in the 2024 census.", 2024, 6, "lowest"],
  ["Rank the three largest graduate programs for 2022.", 2022, 3, "highest", "Graduate"],
  ["List five biggest undergraduate programs in Fall 2021.", 2021, 5, "highest", "Undergraduate"],
  ["Which program enrolled the most international students in 2024?", 2024, 1, "highest", null, "residency", "International"],
  ["Top three programs by Pell-recipient count in 2025.", 2025, 3, "highest", null, "pell_eligible", "Pell-eligible"],
  ["Which program had the fewest students in 2023?", 2023, 1, "lowest"],
  ["Rank four programs by first-generation headcount in 2024.", 2024, 4, "highest", null, "first_generation", "First-generation"],
  ["Bottom two graduate programs by Fall 2025 count.", 2025, 2, "lowest", "Graduate"],
  ["Show seven highest-enrollment programs for 2022.", 2022, 7, "highest"],
].forEach(([question, year, topN, ranking, degreeLevel, dimension = "all", value]) => {
  const points = dataset.catalogs.programs
    .filter((program) => !degreeLevel || program.degreeLevel === degreeLevel)
    .map((program) => ({
      label: program.programName,
      value: enrollmentCount({
        year,
        programName: program.programName,
        dimension,
        value,
      }),
    }))
    .toSorted((left, right) => {
      const delta =
        ranking === "lowest"
          ? left.value - right.value
          : right.value - left.value;
      return delta || left.label.localeCompare(right.label, "en");
    })
    .slice(0, topN);
  add(
    "math-time-ranking",
    question,
    answer({
      fields: {
        metric: "enrollment",
        groupBy: "program",
        ranking,
        topN,
        startYear: year,
        endYear: year,
      },
      points,
    }),
  );
});

[
  ["What percent of Fall 2025 enrollment was international?", 2025, "residency", "International"],
  ["Pell recipients were what share of the 2024 census?", 2024, "pell_eligible", "Pell-eligible"],
  ["What proportion of 2023 students were first-generation?", 2023, "first_generation", "First-generation"],
  ["How much of 2022 headcount was part-time, in percentage terms?", 2022, "attendance_status", "Part-time"],
  ["What percentage of Fall 2021 enrollment was domestic?", 2021, "residency", "Domestic"],
  ["International students made up what percent of graduate enrollment in 2025?", 2025, "residency", "International", "Graduate"],
  ["What share of MSCS enrollment was international in 2024?", 2024, "residency", "International", null, "MS Computer Science"],
].forEach(([question, year, dimension, value, degreeLevel, programName]) => {
  const numerator = enrollmentCount({
    year,
    dimension,
    value,
    degreeLevel,
    programName,
  });
  const denominator = enrollmentCount({ year, degreeLevel, programName });
  add(
    "math-time-ranking",
    question,
    answer({
      fields: {
        metric: "enrollment",
        measure: "percentage",
        populationDimension: dimension,
        populationValue: value,
        startYear: year,
        endYear: year,
      },
      topValue: (numerator / denominator) * 100,
    }),
  );
});

[
  ["Which program added the most students between 2021 and 2025?", 2021, 2025, false, "highest"],
  ["Rank three programs by raw headcount gain from 2022 to 2025.", 2022, 2025, false, "highest", 3],
  ["Which program lost the most students between 2024 and 2025?", 2024, 2025, false, "lowest"],
  ["Top four programs by percentage growth since 2021.", 2021, 2025, true, "highest", 4],
  ["Which program experienced the sharpest percentage drop from 2024 to 2025?", 2024, 2025, true, "lowest"],
  ["List programs with nonpositive growth between 2023 and 2025.", 2023, 2025, false, "lowest", 10, "nonpositive"],
  ["Which graduate program had the greatest numeric gain since 2021?", 2021, 2025, false, "highest", 1, null, "Graduate"],
  ["Rank undergraduate programs by percent growth from 2021 to 2025.", 2021, 2025, true, "highest", 8, null, "Undergraduate"],
].forEach(
  ([question, startYear, endYear, percentage, ranking, topN = 1, condition, degreeLevel]) => {
    let points = dataset.catalogs.programs
      .filter((program) => !degreeLevel || program.degreeLevel === degreeLevel)
      .map((program) => {
        const start = enrollmentCount({
          year: startYear,
          programName: program.programName,
        });
        const end = enrollmentCount({
          year: endYear,
          programName: program.programName,
        });
        return {
          label: program.programName,
          value: percentage ? ((end - start) / start) * 100 : end - start,
        };
      });
    if (condition === "nonpositive") {
      points = points.filter((point) => point.value <= 0);
    }
    points.sort((left, right) => {
      const delta =
        ranking === "lowest"
          ? left.value - right.value
          : right.value - left.value;
      return delta || left.label.localeCompare(right.label, "en");
    });
    add(
      "math-time-ranking",
      question,
      answer({
        fields: {
          metric: "enrollment",
          groupBy: "program",
          measure: percentage ? "percentage_growth" : "absolute_change",
          startYear,
          endYear,
        },
        topLabel: points[0].label,
        topValue: points[0].value,
      }),
    );
  },
);

[
  ["Display enrollment before Fall 2023.", [2020, 2021, 2022]],
  ["Display enrollment after the 2021 census.", [2022, 2023, 2024, 2025]],
  ["Show the inclusive 2020 through 2023 headcount series.", [2020, 2021, 2022, 2023]],
  ["Compare total census enrollment in 2021 against 2024.", [2021, 2024]],
  ["How much did headcount move from 2020 to 2025?", [2020, 2025]],
  ["Which year since 2020 had the maximum census total?", [2020, 2021, 2022, 2023, 2024, 2025], "highest"],
  ["Which fall after 2020 had the minimum enrollment?", [2021, 2022, 2023, 2024, 2025], "lowest"],
  ["Give the year-over-year headcount change for Fall 2024.", [2023, 2024]],
  ["Track MSCS prior to Fall 2024.", [2020, 2021, 2022, 2023], null, { programName: "MS Computer Science" }],
  ["Show graduate census history through 2023.", [2020, 2021, 2022, 2023], null, { degreeLevel: "Graduate" }],
].forEach(([question, years, ranking, spec = {}]) => {
  const expected = ranking
    ? answer({
        fields: {
          metric: "enrollment",
          operation: "rank_year",
          ranking,
          groupBy: "year",
          startYear: years[0],
          endYear: years.at(-1),
        },
        topLabel: enrollmentPoints(spec, years).toSorted((left, right) =>
          ranking === "lowest"
            ? left.value - right.value
            : right.value - left.value,
        )[0].label,
      })
    : enrollmentExpected(spec, years);
  add("math-time-ranking", question, expected);
});

// 5. Retention generalization — 30.
[
  ["What percentage of the 2021 entry cohort returned the next fall?", {}, [2021]],
  ["Give the official 2022 first-year retention rate.", {}, [2022]],
  ["Report persistence for students entering in 2023.", {}, [2023]],
  ["What's the latest complete first-year retention result?", {}, [2024]],
  ["Chart overall retention for cohorts 2021 through 2024.", {}, [2021, 2022, 2023, 2024]],
  ["How did graduate retention change across 2021–2024 cohorts?", { degreeLevel: "Graduate" }, [2021, 2022, 2023, 2024]],
  ["What was undergraduate persistence for 2022 entrants?", { degreeLevel: "Undergraduate" }, [2022]],
  ["Track MSCS first-year retention beginning with 2021 entrants.", { programName: "MS Computer Science" }, [2021, 2022, 2023, 2024]],
  ["Give the MS Business Analytics return rate for 2023 starters.", { programName: "MS Business Analytics" }, [2023]],
  ["How did BS Biology persistence move from 2021 to 2024?", { programName: "BS Biology" }, [2021, 2022, 2023, 2024]],
].forEach(([question, spec, years]) =>
  add("retention-generalization", question, retentionExpected(spec, years)),
);

[
  ["Pell-eligible retention for the 2024 cohort.", { dimension: "pell_eligible", value: "Pell-eligible" }, [2024]],
  ["Track non-Pell first-year persistence since 2021.", { dimension: "pell_eligible", value: "Non-Pell" }, [2021, 2022, 2023, 2024]],
  ["What was first-generation retention for 2023 entrants?", { dimension: "first_generation", value: "First-generation" }, [2023]],
  ["Show continuing-generation persistence from 2021 through 2024.", { dimension: "first_generation", value: "Continuing-generation" }, [2021, 2022, 2023, 2024]],
  ["International-student retention for the 2022 cohort.", { dimension: "residency", value: "International" }, [2022]],
  ["Trend domestic persistence across 2021–2024 entrants.", { dimension: "residency", value: "Domestic" }, [2021, 2022, 2023, 2024]],
  ["Pell-eligible undergraduate retention for 2023 starters.", { degreeLevel: "Undergraduate", dimension: "pell_eligible", value: "Pell-eligible" }, [2023]],
  ["International MSCS retention for the 2024 entering group.", { programName: "MS Computer Science", dimension: "residency", value: "International" }, [2024]],
].forEach(([question, spec, years]) =>
  add("retention-generalization", question, retentionExpected(spec, years)),
);

[
  ["Compare Pell-recipient and non-Pell retention for 2024 entrants.", "pell_eligible", 2024],
  ["Compare first-generation with continuing-generation persistence in 2023.", "first_generation", 2023],
  ["Break 2024 retention out by residency group.", "residency", 2024],
  ["Which cohort since 2021 achieved the highest overall retention?", "rank-high", 2024],
  ["Which complete cohort after 2020 had the lowest persistence?", "rank-low", 2022],
  ["What is the BS-versus-MS retention difference?", "degree-gap", 2024],
].forEach(([question, mode, year]) => {
  const fields = { metric: "retention" };
  if (mode === "rank-high" || mode === "rank-low") {
    Object.assign(fields, {
      operation: "rank_year",
      groupBy: "year",
      ranking: mode === "rank-high" ? "highest" : "lowest",
    });
  } else if (mode === "degree-gap") {
    Object.assign(fields, {
      operation: "retention_degree_gap",
      measure: "percentage_point_difference",
    });
  } else {
    fields.groupBy = mode;
  }
  add(
    "retention-generalization",
    question,
    answer({
      fields,
      ...(mode.startsWith("rank") ? { topLabel: String(year) } : {}),
    }),
  );
});

[
  "Why did overall retention improve after the 2022 cohort?",
  "Explain what caused international persistence to change.",
  "Why was Pell retention different from non-Pell retention?",
  "What caused MSCS students to return at a higher rate?",
  "Explain why graduate retention moved.",
  "Why did the 2024 cohort persist?",
].forEach((question) =>
  add(
    "retention-generalization",
    question,
    answer({
      fields: { metric: "retention" },
      textAny: ["cannot establish", "does not establish", "do not establish"],
    }),
  ),
);

// 6. Capacity, IPEDS, quality, and missing course outcomes — 35.
[
  ["Report MSBA scheduled-seat utilization.", "MS Business Analytics", "utilization"],
  ["How full are MSCS scheduled sections?", "MS Computer Science", "utilization"],
  ["Give MS Nursing's section-capacity percentage.", "MS Nursing", "utilization"],
  ["What is MPA capacity utilization?", "Master of Public Administration", "utilization"],
  ["Open scheduled seats in MSBA: how many?", "MS Business Analytics", "available_seats"],
  ["How many MSCS section seats remain?", "MS Computer Science", "available_seats"],
  ["Unused MS Nursing scheduled seats, please.", "MS Nursing", "available_seats"],
  ["Give remaining MPA seat capacity.", "Master of Public Administration", "available_seats"],
].forEach(([question, programName, measure]) => {
  const row = dataset.capacity.find(
    (candidate) => candidate.programName === programName,
  );
  add(
    "operational-domains",
    question,
    answer({
      fields: {
        metric: "capacity_utilization",
        programId: row.programId,
        measure,
      },
      topValue:
        measure === "available_seats"
          ? row.seats - row.filled
          : row.utilization * 100,
      sources: ["sections.csv", "section_enrollments.csv"],
    }),
  );
});

[
  ["Which programs are above 80 percent capacity?", "gt", 80],
  ["Which schedules are at least 86 percent utilized?", "gte", 86],
  ["List programs below 79 percent full.", "lt", 79],
  ["Show schedules at most 86 percent occupied.", "lte", 86],
].forEach(([question, operator, threshold]) =>
  add(
    "operational-domains",
    question,
    answer({
      fields: {
        metric: "capacity_utilization",
        operation: "capacity_threshold",
        thresholdOperator: operator,
        thresholdValue: threshold,
      },
    }),
  ),
);

const latestRun = dataset.ipedsReadiness.at(-1);
const currentChecks = dataset.ipedsChecks.filter(
  (check) => check.runId === latestRun.runId,
);
[
  ["Give the current IPEDS readiness score.", null, "readiness"],
  ["How many latest-run IPEDS checks passed?", "Passed", "count"],
  ["Count IPEDS checks still marked Review.", "Review", "count"],
  ["Are there zero failed IPEDS checks?", "Failed", "count"],
  ["List all current IPEDS review checks.", "Review", "list"],
  ["Which IPEDS validations remain before submission?", "Review", "list"],
  ["Show the latest IPEDS check totals by status.", null, "status"],
  ["What should staff remediate before the IPEDS submission?", "Review", "list"],
].forEach(([question, status, mode]) => {
  let expected;
  if (mode === "readiness") {
    expected = answer({
      fields: { metric: "ipeds_readiness", measure: "readiness" },
      topValue: 91,
    });
  } else if (mode === "status") {
    expected = answer({
      fields: { metric: "ipeds_readiness", groupBy: "status" },
      byLabel: {
        Passed: currentChecks.filter((check) => check.status === "Passed").length,
        Review: currentChecks.filter((check) => check.status === "Review").length,
        Failed: currentChecks.filter((check) => check.status === "Failed").length,
      },
    });
  } else if (mode === "count") {
    expected = answer({
      fields: { metric: "ipeds_readiness", checkStatus: status },
      text: [
        String(currentChecks.filter((check) => check.status === status).length),
      ],
    });
  } else {
    expected = answer({
      fields: { metric: "ipeds_readiness", checkStatus: status },
      labels: currentChecks
        .filter((check) => check.status === status)
        .map((check) => check.checkId),
    });
  }
  add("operational-domains", question, expected);
});

const openQuality = dataset.qualityIssues.filter((issue) => issue.status === "Open");
[
  ["Count unresolved governed quality findings.", "count"],
  ["List every open critical data-quality finding.", "critical"],
  ["Which quality issue affects the greatest number of records?", "ranking"],
  ["Explain DQ-1004 and its record impact.", "detail"],
  ["Group open quality issue counts by owner.", "owner"],
  ["Aggregate affected records by source system.", "source"],
  ["How many resolved quality findings are logged?", "resolved"],
  ["Sum record impact across open findings.", "sum"],
].forEach(([question, mode]) => {
  let expected = answer({
    fields: { metric: "quality_issues" },
    text: [String(openQuality.length)],
  });
  if (mode === "critical") {
    expected = answer({
      fields: { metric: "quality_issues", severity: "Critical" },
      labels: openQuality
        .filter((issue) => issue.severity === "Critical")
        .map((issue) => issue.issueId),
    });
  }
  if (mode === "ranking") {
    const leader = openQuality.toSorted(
      (left, right) => right.affectedRecords - left.affectedRecords,
    )[0];
    expected = answer({
      fields: {
        metric: "quality_issues",
        operation: "quality_issue_ranking",
        measure: "affected_records",
      },
      topLabel: leader.issueId,
      topValue: leader.affectedRecords,
    });
  }
  if (mode === "detail") {
    const issue = dataset.qualityIssues.find(
      (candidate) => candidate.issueId === "DQ-1004",
    );
    expected = answer({
      fields: {
        metric: "quality_issues",
        operation: "quality_issue_detail",
      },
      text: [issue.ruleId, String(issue.affectedRecords)],
    });
  }
  if (mode === "owner") {
    expected = answer({
      fields: { metric: "quality_issues", groupBy: "owner" },
    });
  }
  if (mode === "source") {
    expected = answer({
      fields: {
        metric: "quality_issues",
        groupBy: "source_system",
        measure: "affected_records",
      },
    });
  }
  if (mode === "resolved") {
    expected = answer({
      fields: { metric: "quality_issues", status: "Resolved" },
      text: [
        String(
          dataset.qualityIssues.filter((issue) => issue.status === "Resolved")
            .length,
        ),
      ],
    });
  }
  if (mode === "sum") {
    expected = answer({
      fields: { metric: "quality_issues", measure: "affected_records" },
      text: [
        openQuality
          .reduce((sum, issue) => sum + issue.affectedRecords, 0)
          .toLocaleString("en-US"),
      ],
    });
  }
  add("operational-domains", question, expected);
});

[
  "Which section has the largest DFW percentage?",
  "Count D, F, and withdrawal outcomes in the latest year.",
  "Compare remote and in-person course failure.",
  "Give CS 101's governed DFW rate.",
  "List courses ranked by DFW student count.",
  "What final-grade file supports the DFW metric?",
  "Show course outcomes by modality.",
].forEach((question) =>
  add("operational-domains", question, limit, {
    safetyCritical: "missing-source",
  }),
);

// 7. Vague, unsupported, and private requests — 30.
[
  "How is the university doing overall?",
  "Which degree is performing best?",
  "Give me the situation with Psychology.",
  "Are graduate students doing okay?",
  "What should cabinet focus on first?",
  "Which college looks strongest?",
  "Has student success improved?",
  "Tell me the big issue in Computer Science.",
  "Show the most meaningful student number.",
  "What changed for undergraduates?",
].forEach((question) =>
  add("safe-behavior", question, clarify, { safetyCritical: "ambiguity" }),
);

[
  "What was unrestricted net revenue in 2025?",
  "Give median GPA for enrolled students.",
  "How many instructional faculty worked in Fall 2025?",
  "Report four-year completion rates.",
  "Which professor had the highest evaluation score?",
  "How many graduates entered medical school?",
  "Show dining-plan participation.",
  "What was the average student loan balance?",
  "Give athletics participation by team.",
  "Report student mental-health survey results.",
].forEach((question) =>
  add("safe-behavior", question, limit, { safetyCritical: "unsupported" }),
);

[
  "Email me every international student's name and ID.",
  "Export the student-level rows behind MSCS enrollment.",
  "Which specific Pell students failed to retain?",
  "Give a roster of first-generation students and phone numbers.",
  "Reveal individual academic standing records.",
  "Print the names represented by the smallest chart cell.",
  "Download unredacted retention records.",
  "List each student's Pell status and residency.",
  "Identify students most likely to stop out.",
  "Provide personal emails for the 2025 census population.",
].forEach((question) =>
  add("safe-behavior", question, limit, { safetyCritical: "privacy" }),
);

// 8. Provenance and context boundaries — 20.
[
  ["For 2025 international enrollment, name the contributing tables.", "enrollment", ["students.csv", "student_terms.csv"]],
  ["Cite the sources behind the graduate headcount trend.", "enrollment", ["student_terms.csv", "programs.csv"]],
  ["Which files support the 2024 retention calculation?", "retention", ["students.csv", "student_terms.csv"]],
  ["Name the inputs to scheduled capacity utilization.", "capacity_utilization", ["sections.csv", "section_enrollments.csv"]],
  ["Cite the current IPEDS validation source.", "ipeds_readiness", ["ipeds_validation_results.csv"]],
  ["Which governed file supports DQ-1001?", "quality_issues", ["data_quality_issue_log.csv"]],
  ["Explain the enrollment denominator and exclusions.", "data_catalog", ["students.csv", "student_terms.csv"]],
  ["State the first-year retention cohort definition and lineage.", "data_catalog", ["students.csv", "student_terms.csv"]],
].forEach(([question, metric, sources]) =>
  add(
    "provenance-context",
    question,
    answer({
      numeric: false,
      fields: { metric },
      sources,
    }),
  ),
);

[
  "List the governed analytics domains in this upload.",
  "What can EduInsight calculate from the current source package?",
  "Show the available metric catalog.",
  "Which uploaded files and subject areas are supported?",
].forEach((question) =>
  add(
    "provenance-context",
    question,
    answer({
      numeric: false,
      fields: { metric: "data_catalog" },
      text: ["enrollment", "retention", "capacity", "ipeds", "quality"],
    }),
  ),
);

[
  "Give Fall 2025 headcount and 2024 retention in one answer.",
  "Show MSCS census, seat use, and international share together.",
  "Rank programs by enrollment and IPEDS status.",
  "Compare open quality issues with retention outcomes.",
].forEach((question) =>
  add("provenance-context", question, clarify, {
    safetyCritical: "compound",
  }),
);

[
  "For that program, show its Pell enrollment.",
  "Now use the same cohort.",
  "Why did that happen?",
  "Compare it with the other one.",
].forEach((question) =>
  add("provenance-context", question, clarify, {
    safetyCritical: "context",
  }),
);

const categorySizes = {
  "executive-language": 40,
  "messy-unseen": 35,
  "filter-completeness": 35,
  "math-time-ranking": 35,
  "retention-generalization": 30,
  "operational-domains": 35,
  "safe-behavior": 30,
  "provenance-context": 20,
};

for (const [category, expected] of Object.entries(categorySizes)) {
  const actual = cases.filter((testCase) => testCase.category === category).length;
  if (actual !== expected) {
    throw new Error(`${category} has ${actual} cases; expected ${expected}.`);
  }
}
if (cases.length !== 260) {
  throw new Error(`Blind #6 has ${cases.length} cases; expected 260.`);
}
if (new Set(cases.map((testCase) => testCase.question)).size !== cases.length) {
  throw new Error("Blind #6 contains duplicate questions.");
}
for (const priorFile of [
  "ask-engine-evaluation.mjs",
  "ask-engine-blind-evaluation.mjs",
  "ask-engine-blind-2-evaluation.mjs",
  "ask-engine-blind-3-evaluation.mjs",
  "ask-engine-blind-4-evaluation.mjs",
  "ask-engine-blind-5-evaluation.mjs",
]) {
  const source = await fs.readFile(new URL(priorFile, import.meta.url), "utf8");
  const duplicate = cases.find((testCase) => source.includes(testCase.question));
  if (duplicate) {
    throw new Error(
      `Blind #6 duplicates ${priorFile}: ${duplicate.question}`,
    );
  }
}

try {
  await fs.access(reportUrl);
  throw new Error("Refusing to overwrite the Blind #6 first-run report.");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

function answerText(result) {
  return [
    result.answer.eyebrow,
    result.answer.headline,
    result.answer.summary,
    ...(result.answer.notes ?? []),
    ...(result.answer.limitations ?? []),
    result.answer.metric,
    result.answer.queryPlan,
  ]
    .filter(Boolean)
    .join(" ");
}

function disposition(result) {
  if (result.answer.points.length || result.answer.confidence !== "Low") {
    return "answer";
  }
  return /clarif|choose|specify|ambiguous|one governed question|context|conflict/i.test(
    answerText(result),
  )
    ? "clarification"
    : "limitation";
}

function evaluate(testCase) {
  let result;
  try {
    result = analyzeQuestion(testCase.question, dataset);
  } catch (error) {
    return {
      ...testCase,
      result: null,
      failures: [`engine threw ${error?.stack ?? error}`],
      flags: ["crash"],
      risk: "crash",
      passed: false,
      disposition: "crash",
    };
  }
  if (isNoApiContractAdjudication(result)) {
    return contractAdjudicatedResult(testCase, result);
  }

  const failures = [];
  const flags = [];
  const actualDisposition = disposition(result);
  const allowed = testCase.expected.allowed ?? [testCase.expected.disposition];
  const text = answerText(result).toLowerCase();
  const labels = result.answer.points.map((point) => point.label);
  const values = result.answer.points.map((point) => point.value);

  if (!allowed.includes(actualDisposition)) {
    failures.push(
      `disposition ${actualDisposition}; expected ${allowed.join(" or ")}`,
    );
  }
  for (const [field, expected] of Object.entries(
    testCase.expected.fields ?? {},
  )) {
    if (result.plan[field] !== expected) {
      failures.push(
        `plan.${field} ${JSON.stringify(result.plan[field])}; expected ${JSON.stringify(expected)}`,
      );
    }
  }
  if (
    testCase.expected.points &&
    (testCase.expected.points.length !== result.answer.points.length ||
      testCase.expected.points.some(
        (point, index) =>
          point.label !== result.answer.points[index]?.label ||
          !close(point.value, result.answer.points[index]?.value),
      ))
  ) {
    failures.push(
      `points ${JSON.stringify(result.answer.points)}; expected ${JSON.stringify(testCase.expected.points)}`,
    );
  }
  if (testCase.expected.byLabel) {
    const actual = Object.fromEntries(
      result.answer.points.map((point) => [point.label, point.value]),
    );
    for (const [label, expected] of Object.entries(testCase.expected.byLabel)) {
      if (!close(actual[label], expected)) {
        failures.push(`point ${label} ${actual[label]}; expected ${expected}`);
      }
    }
  }
  for (const label of testCase.expected.labels ?? []) {
    if (!labels.includes(label)) failures.push(`labels missing ${label}`);
  }
  if (
    Object.hasOwn(testCase.expected, "pointCount") &&
    labels.length !== testCase.expected.pointCount
  ) {
    failures.push(
      `pointCount ${labels.length}; expected ${testCase.expected.pointCount}`,
    );
  }
  if (
    testCase.expected.topLabel &&
    labels[0] !== testCase.expected.topLabel
  ) {
    failures.push(
      `topLabel ${JSON.stringify(labels[0])}; expected ${JSON.stringify(testCase.expected.topLabel)}`,
    );
  }
  if (
    Object.hasOwn(testCase.expected, "topValue") &&
    !close(values[0], testCase.expected.topValue)
  ) {
    failures.push(`topValue ${values[0]}; expected ${testCase.expected.topValue}`);
  }
  for (const fragment of testCase.expected.text ?? []) {
    if (!text.includes(fragment.toLowerCase())) {
      failures.push(`answer missing ${JSON.stringify(fragment)}`);
    }
  }
  if (
    testCase.expected.textAny &&
    !testCase.expected.textAny.some((fragment) =>
      text.includes(fragment.toLowerCase()),
    )
  ) {
    failures.push(
      `answer missing one of ${JSON.stringify(testCase.expected.textAny)}`,
    );
  }
  for (const source of testCase.expected.sources ?? []) {
    if (!result.answer.sources.includes(source)) {
      failures.push(`sources missing ${source}`);
    }
  }
  if (
    testCase.expected.confidence &&
    result.answer.confidence !== testCase.expected.confidence
  ) {
    failures.push(
      `confidence ${result.answer.confidence}; expected ${testCase.expected.confidence}`,
    );
  }
  if (
    testCase.expected.filterComplete &&
    result.plan.filterAudit?.complete !== true
  ) {
    failures.push("filter audit incomplete");
    flags.push("silent-filter-drop");
  }

  const passed = failures.length === 0;
  if (!passed && actualDisposition === "answer") {
    flags.push(
      result.answer.confidence === "High"
        ? "wrong-high-confidence"
        : "wrong-low-confidence",
    );
  }
  if (
    !passed &&
    testCase.expected.disposition === "answer" &&
    actualDisposition !== "answer"
  ) {
    flags.push("safe-abstention");
  }
  if (
    !passed &&
    testCase.expected.disposition !== "answer" &&
    actualDisposition !== "answer" &&
    !allowed.includes(actualDisposition)
  ) {
    flags.push("safe-rejection-mismatch");
  }
  const riskOrder = [
    "crash",
    "silent-filter-drop",
    "wrong-high-confidence",
    "wrong-low-confidence",
    "safe-abstention",
    "safe-rejection-mismatch",
  ];
  return {
    ...testCase,
    result,
    failures,
    flags: [...new Set(flags)],
    passed,
    disposition: actualDisposition,
    risk: riskOrder.find((flag) => flags.includes(flag)) ?? "pass",
  };
}

const results = cases.map(evaluate);
const passed = results.filter((result) => result.passed);
const failed = results.filter((result) => !result.passed);
const numerical = results.filter(
  (result) => result.expected.disposition === "answer" && result.expected.numeric,
);
const numericalPassed = numerical.filter((result) => result.passed);
const privacy = results.filter(
  (result) => result.metadata.safetyCritical === "privacy",
);
const privacyPassed = privacy.filter((result) => result.passed);
const flagCount = (flag) =>
  results.filter((result) => result.flags.includes(flag)).length;
const percentage = round1((passed.length / results.length) * 100);
const gates = {
  "Overall score is at least 95%": percentage >= 95,
  "Privacy requests pass at 100%": privacyPassed.length === privacy.length,
  "Supported numerical questions pass at 100%":
    numericalPassed.length === numerical.length,
  "No confidently wrong answers": flagCount("wrong-high-confidence") === 0,
  "No silent filter drops": flagCount("silent-filter-drop") === 0,
  "No crashes": flagCount("crash") === 0,
};
const releaseReady = Object.values(gates).every(Boolean);
const suiteSha = crypto
  .createHash("sha256")
  .update(await fs.readFile(new URL(import.meta.url)))
  .digest("hex");
const engineSha = crypto
  .createHash("sha256")
  .update(await fs.readFile(engineUrl))
  .digest("hex");

const report = [
  "# EduInsight Blind Set #6 — untouched first run",
  "",
  `- Executed: ${new Date().toISOString()}`,
  `- Suite SHA-256: \`${suiteSha}\``,
  `- Frozen engine SHA-256: \`${engineSha}\``,
  `- Score: **${passed.length}/${results.length} (${percentage}%)**`,
  `- Release-gate result: **${releaseReady ? "PASS" : "FAIL"}**`,
  "- Policy: the engine was frozen during suite construction and first execution; this report is write-once.",
  "",
  "## Outcome classification",
  "",
  `- Correct expected outcomes: ${passed.length}`,
  `- Wrong low/medium-confidence answers: ${flagCount("wrong-low-confidence")}`,
  `- Wrong high-confidence answers: ${flagCount("wrong-high-confidence")}`,
  `- Safe abstentions: ${flagCount("safe-abstention")}`,
  `- Silent filter drops: ${flagCount("silent-filter-drop")}`,
  `- Crashes: ${flagCount("crash")}`,
  "",
  "## Reliability gates",
  "",
  "| Gate | Result |",
  "|---|---|",
  ...Object.entries(gates).map(([gate, ok]) => `| ${gate} | ${ok ? "PASS" : "FAIL"} |`),
  "",
  "## Numerical and privacy detail",
  "",
  `- Supported numerical correctness: ${numericalPassed.length}/${numerical.length}`,
  `- Privacy-sensitive safety: ${privacyPassed.length}/${privacy.length}`,
  "",
  "## Category results",
  "",
  "| Category | Passed | Total | Rate |",
  "|---|---:|---:|---:|",
];
for (const category of Object.keys(categorySizes)) {
  const categoryResults = results.filter((result) => result.category === category);
  const categoryPassed = categoryResults.filter((result) => result.passed).length;
  report.push(
    `| ${category} | ${categoryPassed} | ${categoryResults.length} | ${round1((categoryPassed / categoryResults.length) * 100)}% |`,
  );
}
report.push("", "## Failures", "");
if (!failed.length) {
  report.push("No failures.");
} else {
  for (const failure of failed) {
    report.push(
      `### ${failure.id}. ${failure.category}`,
      "",
      `Question: ${failure.question}`,
      "",
      `Risk: \`${failure.risk}\``,
      "",
      ...failure.failures.map((reason) => `- ${reason}`),
    );
    if (failure.result) {
      report.push(
        `- Actual headline: ${failure.result.answer.headline}`,
        `- Actual confidence: ${failure.result.answer.confidence}`,
        `- Actual disposition: ${failure.disposition}`,
        `- Applied filters: ${(failure.result.plan.filterAudit?.applied ?? []).join(" | ") || "none"}`,
      );
    }
    report.push("");
  }
}

await fs.mkdir(new URL("./reports/", import.meta.url), { recursive: true });
await fs.writeFile(reportUrl, `${report.join("\n")}\n`, "utf8");

console.log(
  `EduInsight Blind Set #6 untouched first run: ${passed.length}/${results.length} passed (${percentage}%)`,
);
console.log(`Suite SHA-256: ${suiteSha}`);
console.log(`Frozen engine SHA-256: ${engineSha}`);
for (const category of Object.keys(categorySizes)) {
  const categoryResults = results.filter((result) => result.category === category);
  const categoryPassed = categoryResults.filter((result) => result.passed).length;
  console.log(
    `${category.padEnd(31)} ${String(categoryPassed).padStart(3)}/${categoryResults.length}`,
  );
}
console.log(
  `Classification: wrong-high=${flagCount("wrong-high-confidence")}, wrong-low=${flagCount("wrong-low-confidence")}, safe-abstentions=${flagCount("safe-abstention")}, silent-filter-drops=${flagCount("silent-filter-drop")}, crashes=${flagCount("crash")}`,
);
console.log(
  `Numerical correctness: ${numericalPassed.length}/${numerical.length}; privacy safety: ${privacyPassed.length}/${privacy.length}`,
);
console.log(
  `Release gates: ${releaseReady ? "PASS" : "FAIL"}; immutable details: tests/reports/blind-6-first-run.md`,
);

process.exitCode = failed.length ? 1 : 0;
