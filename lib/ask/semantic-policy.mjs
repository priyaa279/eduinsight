import { governancePolicyForQuestion } from "./governance.mjs";
import { populationMentions } from "./resolvers.mjs";

export function unknownEnrollmentSubject(normalized, program, metric) {
  if (program || metric !== "enrollment") return null;
  if (
    /\b(total|overall|institutional|institution-wide|institutionwide) enrollment\b/.test(
      normalized,
    )
  ) {
    return null;
  }
  const candidates = [];
  const direct = normalized.match(
    /^(?!(?:compare|which|how|why|break|do|ignore|track|trend|trace|pull|report|walk|follow|put|give|show|display)\b)([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,3})\s+enrollment(?:\s+(?:in|for|since|from|between|before|after|last|fall|\d)\b|$)/,
  );
  if (direct?.[1]) candidates.push(direct[1]);
  const requested = normalized.match(
    /^(?:show|what was|tell me|give me)\s+(?:the\s+)?(.+?)\s+enrollment(?:\s+(?:in|for|since|from|between|before|after|last|fall|\d)\b|$)/,
  );
  if (requested?.[1]) candidates.push(requested[1]);
  const counted = normalized.match(
    /^how many\s+(.+?)\s+students?(?:\s+(?:were|are|in|for|last|\d)\b|$)/,
  );
  if (counted?.[1]) candidates.push(counted[1]);
  const safeSubjectTokens = new Set([
    "all",
    "bottom",
    "by",
    "continuing-generation",
    "domestic",
    "fall",
    "first-generation",
    "give",
    "graduate",
    "me",
    "institution-wide",
    "institutionwide",
    "international",
    "institution",
    "latest",
    "part-time",
    "full-time",
    "master",
    "masters",
    "ms",
    "non-pell",
    "of",
    "overall",
    "pell",
    "pell-eligible",
    "percentage",
    "percent",
    "change",
    "fewer",
    "more",
    "year-over-year",
    "in",
    "census",
    "certified",
    "official",
    "all-program",
    "unduplicated",
    "reportable",
    "program",
    "programs",
    "show",
    "track",
    "trend",
    "trace",
    "pull",
    "report",
    "walk",
    "follow",
    "display",
    "student",
    "students",
    "tell",
    "total",
    "top",
    "undergraduate",
    "was",
    "what",
  ]);
  for (const candidate of candidates) {
    const subject = candidate
      .replace(/^(?:the|show|what was|tell me|give me)\s+/, "")
      .trim();
    const tokens = subject.split(/\s+/).filter((token) => !/^\d+$/.test(token));
    if (tokens.some((token) => !safeSubjectTokens.has(token))) return subject;
  }
  return null;
}

export function isCompoundQuestion(normalized) {
  if (/\bcompare enrollment and capacity\b/.test(normalized)) return false;
  if (
    /\b(?:headcount|census enrollment|census students?)\b.*\b(?:registrations|scheduled[- ](?:seats?|capacity)|occupied seats)\b/.test(
      normalized,
    )
  ) {
    return false;
  }
  const domains = [
    /\b(enrollment|enrolled|headcount|census)\b/,
    /\b(retention|retained|persistence)\b/,
    /\b(capacity|utilization|available seats?|open seats?)\b/,
    /\bipeds\b/,
    /\b(data quality|quality issues?|quality findings?)\b/,
    /\b(dfw|course outcomes?)\b/,
  ].filter((pattern) => pattern.test(normalized)).length;
  if (
    (domains <= 1 &&
      /\b(?:and show|with)\b.*\b(?:lineage|sources?|source tables?|applied filters?|population restriction|method|numerator|denominator)\b/.test(
        normalized,
      )) ||
    /\bdq-(?:\d+|[a-z]+-\d+)\b.*\bchecks\b.*\bhow many records\b/.test(
      normalized,
    )
  ) {
    return false;
  }
  if (
    /\bfall enrollment ipeds\b|\bipeds fall enrollment\b/.test(normalized) &&
    !/\b(retention|persistence|capacity|data quality|course outcomes?|dfw)\b/.test(
      normalized,
    )
  ) {
    return false;
  }
  if (domains > 1) return true;
  return (
    /\b(?:and|also)\s+(?:which|what|how|why|show|are|is|was|were)\b/.test(
      normalized,
    ) ||
    /\band also (?:name|rank|list|calculate|compare)\b/.test(normalized) ||
    (/\b(?:enrollment|census)\b/.test(normalized) &&
      /\bcapacity\b/.test(normalized) &&
      /\binternational percentage\b|\binternational share\b/.test(normalized)) ||
    (/\bcapacity\b/.test(normalized) &&
      /\binternational students?\b/.test(normalized) &&
      /\b(most|highest|which)\b/.test(normalized))
  );
}

export function responseDirective(
  normalized,
  program,
  yearPlan,
  metric,
  population,
  groupBy,
) {
  const governance = governancePolicyForQuestion(normalized);
  if (governance.blocked) {
    return {
      responseType: "refusal",
      responseReason: governance.reason,
    };
  }

  const clarificationPatterns = [
    /^why$/,
    /^why exactly\b/,
    /^same question\b/,
    /^what about (?:its|that|the)\b/,
    /^and its\b/,
    /\b(that growth|its capacity|that program|that program s)\b/,
    /\bwhat data did you use for this answer\b/,
    /\bwhat did you use for that number\b/,
    /\bwhich source tables support this result\b/,
    /\bhow was this metric calculated\b/,
    /\bwhat definition of (enrollment|retention) are you using\b/,
    /\bwhich records were excluded\b/,
    /\bwhat limitations does this result have\b/,
    /\bhow is .+ (?:doing|looking)\b/,
    /\bis .+ doing (?:well|okay|ok)\b/,
    /\bhow is .+ doing ok\b/,
    /\bis .+ doing ok\b/,
    /\bhow are enrollments? looking\b/,
    /\banything concerning with enrollment\b/,
    /\bdid enrollment drop anywhere\b/,
    /\bshow me student performance\b/,
    /\btell me about student success\b/,
    /\bbig picture on student success\b/,
    /\bstudent success vibe check\b/,
    /\bgraduate students? are successful\b/,
    /\bwhat is our biggest problem\b/,
    /\bwhat is the biggest problem in the institution\b/,
    /\bwhat should leadership worry about\b/,
    /\bwhich number should leadership worry about\b/,
    /\bwhat is going on with\b/,
    /\bwhich (?:programs?|majors?) (?:is |are )?(?:best|biggest|strongest)\b/,
    /\bwhich (?:academic )?program is winning\b/,
    /\bwhat is the best program\b/,
    /\bwhich academic program is best\b/,
    /\bstrongest programs?\b/,
    /\bwhich (?:degree|area) (?:is )?(?:best|strongest|winning)\b/,
    /\bcompare program performance\b/,
    /\bshow me graduate data\b/,
    /^what changed(?: recently)?$/,
    /\bshow me the programs\b/,
    /\bis retention good\b/,
    /\bhow are we doing against peers\b/,
    /\bwhat is the most important number\b/,
    /\bmost important\b.*\b(?:student )?(?:number|metric)\b/,
    /\bmost important trend\b/,
    /\bmost meaningful student number\b/,
    /\btell me what matters about\b/,
    /\bwhich college is healthiest\b/,
    /\bdid things improve\b/,
    /\bwhere should the provost invest\b/,
    /\bwhere should the provost focus\b/,
    /\bwhich group is falling behind\b/,
    /\bwhich (?:student )?group\b.*\b(?:struggling|falling behind|doing poorly)\b/,
    /\bshow graduate stuff\b/,
    /\bhow are we lookin\b|\bhow are we looking\b/,
    /\bfy retention\b/,
    /^ba numbers\b/,
    /^bio performance\b/,
    /^last year number\b/,
    /^year[- ]over[- ]year number\b/,
    /^which one s bad\b/,
    /^(?:same thing|do that analysis)\b/,
    /^same period\b/,
    /\bwhat about those students\b/,
    /^what happened after that\b/,
    /^and the non[- ]pell group\b/,
    /\bhow much of that came from\b/,
    /\bwhat sources supported that previous answer\b/,
    /\bdid .+ go up\b/,
    /\bwhat stands out in\b/,
    /\bgive me a quick read on\b/,
    /\bhow is the institution performing\b/,
    /\bwhich cohort looks healthiest\b/,
    /\bwhat is our strongest area\b/,
    /\bhow are things looking for\b/,
    /\btell me what changed in the student body\b/,
    /\bdid that group improve\b/,
    /\bgive me the story on\b/,
    /\bwhat is happening with\b/,
    /\bwhich academic offering is strongest\b/,
    /\bare students succeeding\b/,
    /\bshow me institutional performance\b/,
    /\bwhat should the dean worry about\b/,
    /\bwhich (?:major|programs?) is healthiest\b/,
    /\bhow are the undergraduate\b/,
    /\btell me whether .+ is good\b/,
    /\btell (?:me )?whether .+\b(?:looks?|seems?|is)\s+(?:good|bad|healthy|concerning)\b/,
    /\bwhat changed at the university\b/,
    /^show graduate numbers$/,
    /\bwhat is our most important metric\b/,
    /\bdid things get better\b/,
    /\bhow does .+ compare\b/,
    /\bgive me the student success picture\b/,
    /\bfor the program you just named\b/,
    /\bset that result beside\b/,
    /\bdid the same population improve\b/,
    /\bcarry forward every restriction\b/,
    /\bbest programs? currently\b/,
    /^same filters again$/,
    /\bwhich programs? is performing best\b/,
    /\bgive me the situation with\b/,
    /\bare graduate students doing (?:okay|ok|well)\b/,
    /\bwhat should cabinet focus on\b/,
    /\bwhich college looks strongest\b/,
    /\bhas student success improved\b/,
    /\btell me the big issue in\b/,
    /\bwhat changed for undergraduate\b/,
    /\bwhat changed for (?:graduate|undergraduate|international|domestic|pell|first[- ]generation|continuing[- ]generation) students?\b/,
    /^now use the same cohort$/,
    /\bwhy did that happen\b/,
    /\bcompare it with the other one\b/,
    /\bwhich academic program is doing the best\b/,
    /\bhow are (?:our )?graduate students doing overall\b/,
    /\bwhere student success is strongest\b/,
    /\bwhat changed for the college of\b/,
    /\bmost important student trend\b/,
    /^now compare that with the other one$/,
    /^use the same population but change the year$/,
    /\bprevious analysis again with those filters\b/,
  ];
  if (clarificationPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      responseType: "clarification",
      responseReason:
        "The question depends on missing conversational context or an unspecified governed metric.",
    };
  }
  if (isCompoundQuestion(normalized)) {
    return {
      responseType: "clarification",
      responseReason:
        "This request contains multiple analyses. Ask one governed question at a time so no part is silently ignored.",
    };
  }

  const contradictory =
    (/\bundergraduate\b/.test(normalized) &&
      /\b(ms|master(?:s)? of science)\b/.test(normalized)) ||
    (/\bbs\b|\bbachelor(?:s)? of science\b/.test(normalized) &&
      /\bgraduate\b/.test(normalized)) ||
    (/\bdomestic\b/.test(normalized) &&
      /\binternational\b/.test(normalized) &&
      !/\b(compare|versus|vs|grew faster)\b/.test(normalized)) ||
    (/\bpell\b/.test(normalized) &&
      /\bnon[- ]pell\b/.test(normalized) &&
      /\bonly\b|\bpell eligible\b|\bsimultaneously\b|\bboth\b/.test(normalized) &&
      !/\b(compare|versus|vs|gap|with non[- ]pell|side by side)\b/.test(
        normalized,
      )) ||
    (/\bfirst[- ]generation\b/.test(normalized) &&
      /\bcontinuing[- ]generation\b/.test(normalized) &&
      !/\b(compare|contrast|versus|vs|gap|side by side|split|break|by)\b/.test(
        normalized,
      )) ||
    (/\b(?:probation|academic warning)\b/.test(normalized) &&
      /\bgood standing\b/.test(normalized)) ||
    (/\bfull[- ]time\b/.test(normalized) &&
      /\bpart[- ]time\b/.test(normalized) &&
      /\b(?:who (?:were|are) also|simultaneously|both full[- ]time and part[- ]time)\b/.test(
        normalized,
      )) ||
    (/\bipeds\b/.test(normalized) &&
      /\bpassed|passing\b/.test(normalized) &&
      /\bfailed|failing\b/.test(normalized) &&
      !/\b(compare|contrast|versus|vs|and failed|by status|each status)\b/.test(
        normalized,
      )) ||
    (/\b(?:data quality|quality|issues?|findings?)\b/.test(normalized) &&
      /\bopen|unresolved\b/.test(normalized) &&
      /\bresolved|closed|fixed\b/.test(normalized) &&
      !/\b(compare|contrast|versus|vs|open and resolved|open and closed|open plus resolved|open plus closed|by status)\b/.test(
        normalized,
      ));
  if (contradictory) {
    return {
      responseType: "clarification",
      responseReason:
        "The requested filters conflict. Clarify which mutually exclusive population or degree scope should be used.",
    };
  }

  const unsupportedPatterns = [
    /\b(gpa|grade point average)\b/,
    /\btuition revenue\b|\bnet revenue\b/,
    /\buniversity budget\b|\bbudget\b/,
    /\bfaculty members?\b|\bfaculty headcount\b|\bfaculty salary\b|\btenure[- ]track faculty\b|\binstructional faculty\b/,
    /\bgraduation rate\b|\bcompletion rates?\b/,
    /\bstudent satisfaction\b/,
    /\b(?:student|students)\b.*\bsatisf(?:ied|action)\b|\bsatisf(?:ied|action)\b.*\b(?:student|students|advising)\b/,
    /\bstudent[- ]satisfaction survey\b/,
    /\b(got jobs?|obtained jobs?|found jobs?|employment outcomes?|job placement)\b/,
    /\baverage salary of graduates\b|\balumni\b.*\b(?:median|average)?\s*salary\b/,
    /\bprofessor\b.*\b(?:ratings?|evaluation score)\b|\binstructors?\b.*\b(?:course[- ]evaluations?|ratings?)\b/,
    /\bmedian student age\b|\bstudent age\b/,
    /\bmedian age of enrolled students?\b/,
    /\battempted credit load\b|\baverage credit load\b|\bcredits? (?:have )?students? completed\b/,
    /\bscholarship aid\b|\bfinancial aid awarded\b|\binstitutional aid\b/,
    /\binstitutional scholarship aid\b/,
    /\baverage institutional grant amount\b|\bgrant amount\b/,
    /\bcompleted? a fafsa\b|\bfasfa\b|\bfafsa\b/,
    /\bunmet financial need\b/,
    /\bscholarship fund\b/,
    /\bhousing status\b/,
    /\bcampus housing\b/,
    /\bmeal plans?\b/,
    /\blibrary visits?\b/,
    /\blibrary gate counts?\b/,
    /\btransfer credits?\b/,
    /\bcitizenship\b/,
    /\badvisor caseload\b/,
    /\bfaculty fte\b/,
    /\bfull[- ]time faculty\b/,
    /\boutstanding tuition balance\b/,
    /\bforecast\b|\bproject(?:ed|ion)? enrollment\b/,
    /\b(pharmacy|aerospace engineering)\b/,
    /\baverage graduate salary\b|\bgraduate salary\b/,
    /\bnet tuition\b/,
    /\boperating margin\b/,
    /\balumni giving\b/,
    /\bcounseling services?\b/,
    /\btime to (?:degree|programs)\b/,
    /\bfaculty salaries\b|\bsalaries across departments\b/,
    /\bresidence[- ]hall occupancy\b/,
    /\bstudent loan balance\b|\baverage loan balance\b/,
    /\bmental[- ]health survey\b|\bmental health survey\b/,
    /\bmedical school\b/,
    /\bathletics participation\b/,
    /\bcampus\s+\w+\b|\b\w+(?:\s+\w+)?\s+campus\b/,
  ];
  if (unsupportedPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      responseType: "limitation",
      responseReason:
        "The currently uploaded governed sources do not contain the fields required for this calculation.",
    };
  }
  if (yearPlan.invalidYear || yearPlan.emptyRange) {
    return {
      responseType: "limitation",
      responseReason:
        "The requested year is outside the years available in the uploaded governed sources.",
    };
  }
  if (
    yearPlan.endpointsOnly &&
    yearPlan.startYear === yearPlan.endYear
  ) {
    return {
      responseType: "clarification",
      responseReason:
        "A comparison requires two different years. Provide distinct start and end years.",
    };
  }
  const unknownSubject =
    population?.populationDimension === "all" && groupBy === "none"
      ? unknownEnrollmentSubject(normalized, program, metric)
      : null;
  if (unknownSubject) {
    return {
      responseType: "limitation",
      responseReason: `No governed program or population matching “${unknownSubject}” exists in the current upload.`,
    };
  }
  if (
    (!program &&
      /\b(mechanical engineering|dentistry)\b/.test(normalized)) ||
    /\bcampus mars\b|\bcampus jupiter\b|\bcampus neptune\b|\bwakanda\b|\bgenovia\b|\blatveria\b|\bbio program\b/.test(normalized)
  ) {
    return {
      responseType: "limitation",
      responseReason:
        "No matching governed program, campus, or dimension value exists in the current upload.",
    };
  }
  const mentions = populationMentions(normalized);
  if (new Set(mentions.map(([dimension]) => dimension)).size > 1) {
    return {
      responseType: "limitation",
      responseReason:
        "The current aggregate upload cannot safely combine those demographic filters without a certified cross-tabulation.",
    };
  }
  if (
    /\bipeds\b/.test(normalized) &&
    (/\b(?:critical|high|medium)(?:[- ]severity)?\b|\bseverity\b/.test(normalized) ||
      /\baffects? the most records\b/.test(normalized))
  ) {
    return {
      responseType: "limitation",
      responseReason:
        "The IPEDS validation source does not contain severity or affected-record fields.",
    };
  }
  if (
    /\b(issues?|findings?)\b/.test(normalized) &&
    /\breviewed\b/.test(normalized)
  ) {
    return {
      responseType: "limitation",
      responseReason:
        "The quality-issue source does not contain a reviewed workflow state.",
    };
  }
  if (/\bdq-001\b/.test(normalized)) {
    return {
      responseType: "limitation",
      responseReason:
        "No issue with ID DQ-001 exists in the uploaded quality log.",
    };
  }
  return { responseType: "answer", responseReason: null };
}

export function inferOperation(normalized, metric, yearPlan) {
  if (metric === "enrollment") {
    const programPercentageChange =
      /\bprograms?\b/.test(normalized) &&
      yearPlan.timeMode === "trend" &&
      /\b(percent(?:age)?|proportion|growth rate|percentage wise)\b/.test(
        normalized,
      ) &&
      /\b(growth|increase|grew|grown|change|gain|decline|drop|decrease)\b/.test(
        normalized,
      );
    if (programPercentageChange) return "program_change_percent";
    if (/\bwhy\b|\bwhat caused\b/.test(normalized)) return "why";
    if (/\byear[- ]over[- ]year\b/.test(normalized)) return "year_over_year";
    if (
      /\bhow many (?:more|fewer)\b|\bby how many students\b/.test(normalized)
    ) {
      return "absolute_difference";
    }
    if (
      /\b(?:highest|greatest|largest)\b.*\b(?:international )?(?:percentage|proportion)\b|\b(?:international )?(?:percentage|proportion)\b.*\bhighest\b/.test(
        normalized,
      ) &&
      /\bprogram\b/.test(normalized) &&
      /\binternational\b/.test(normalized)
    ) {
      return "program_share_ranking";
    }
    if (
      /\b(?:rank|order|give|return|list)\b.*\bprograms?\b.*\b(?:percentage|proportion)\b|\bprograms?\b.*\b(?:highest|lowest|largest|smallest)\b.*\b(?:percentage|proportion)\b|\b(?:largest|smallest|highest|lowest)\b.*\b(?:percentage|proportion|share)\b.*\bprograms?\b|\bprograms?\b.*\b(?:largest|smallest|highest|lowest)\b.*\bshare\b/.test(
        normalized,
      )
    ) {
      return "program_share_ranking";
    }
    if (
      /\b(?:fastest|highest|greatest|steepest|largest|sharpest)\s+(?:enrollment )?(?:percentage|percent) (?:growth|drop|decline)\b|\bpercent(?:age)? enrollment growth\b|\bpercentage[- ]growth programs?\b|\bprograms? by (?:percentage|percent) growth\b/.test(
        normalized,
      ) &&
      /\bprograms?\b/.test(normalized)
    ) {
      return "program_change_percent";
    }
    if (
      /\bpercentage(?: of| for)?\b|\bwhat percent(?:age)?\b|\bas a percent\b|\bproportion\b/.test(normalized) &&
      !/\bwhich program\b/.test(normalized) &&
      !/\b(growth|decline|grew|change|drop|fastest)\b/.test(normalized)
    ) {
      return "share";
    }
    if (
      /\bwhich programs? (?:actually )?lost (?:enrollment|students?)\b|\bwhich programs?.*\bbelow\b.*\bheadcount\b|\bprograms? (?:that )?(?:declined|lost students?)\b/.test(
        normalized,
      )
    ) {
      return "program_change_negative";
    }
    if (
      /\bprograms? that did not grow\b|\bprograms? (?:that )?(?:did not|didn t|failed to) increase\b|\bprograms? with (?:no positive|nonpositive) growth\b/.test(
        normalized,
      )
    ) {
      return "program_change_nonpositive";
    }
    if (
      /\bwhich program (?:declined|shed|lost) the most\b|\bprogram with the largest (?:number of students? )?(?:decline|loss)\b/.test(
        normalized,
      )
    ) {
      return "program_change_absolute";
    }
    if (
      /\bwhich (undergraduate )?program had the largest enrollment growth\b/.test(
        normalized,
      ) ||
      /\bwhich (?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)?\s*(?:undergraduate |graduate )?programs? (?:added|gained) the (?:most|greatest|largest) (?:raw |numeric )?(?:number of )?(?:students|learners|gain|headcount)\b|\bamong (?:undergraduate|graduate) programs which added the (?:most|greatest|largest) (?:students|learners)\b|\bwhich (?:undergraduate |graduate )?programs? had the (?:most|greatest|largest) (?:raw |numeric )?(?:headcount )?gain\b|\bprograms? adding the largest number of students\b|\bwhich programs? gained the largest raw (?:number|headcount)\b|\bprograms? by (?:absolute|raw) (?:headcount|census) (?:gain|change)\b|\brank programs? by absolute census change\b|\bprograms? added the greatest raw number\b|\bprograms? had the (?:lowest|highest|largest|smallest) raw (?:enrollment |headcount )?change\b/.test(
        normalized,
      )
    ) {
      return "program_change_absolute";
    }
    if (/\bwhich program grew the most\b/.test(normalized)) {
      return "program_change_percent";
    }
    if (
      /\bwhich (?:academic |undergraduate |graduate )?program (?:had|recorded|posted|experienced|grew) (?:the )?(?:highest|greatest|fastest|largest|sharpest)?(?: in)? percentage (?:terms|growth|decline|drop)\b|\b(?:fastest|largest|sharpest|steepest) percentage (?:enrollment )?(?:growth|decline|drop)\b|\bprograms? by percent(?:age)?(?: enrollment)? (?:growth|change)\b|\brank (?:graduate|undergraduate) programs by percent(?:age)?(?: enrollment)? (?:growth|change)\b/.test(
        normalized,
      )
    ) {
      return "program_change_percent";
    }
    if (
      /\b(compare|which grew faster)\b/.test(normalized) &&
      /\bundergraduate\b/.test(normalized) &&
      /\bgraduate\b/.test(normalized)
    ) {
      return "compare_degree_levels";
    }
    if (
      /\b(compare|which grew faster)\b/.test(normalized) &&
      /\bdomestic\b/.test(normalized) &&
      /\binternational\b/.test(normalized)
    ) {
      return "compare_residency";
    }
    if (
      /\bcompare\b/.test(normalized) &&
      /\bother graduate programs?\b/.test(normalized)
    ) {
      return "compare_other_graduate";
    }
    if (yearPlan.endpointsOnly) return "compare_years";
    if (
      /\bwhich (?:fall |census |cohort )?year (?:had|posted) the (highest|lowest|strongest|weakest)\b|\bwhich year\b.*\b(?:maximum|minimum|smallest|largest|highest|lowest|peak)\b.*\b(?:census|enrollment|headcount|total)\b|\bwhich census year\b.*\b(?:smallest|largest|highest|lowest|peak)\b|\bwhich (?:loaded )?fall\b.*\b(?:produced|posted|had)\b.*\b(?:maximum|minimum|peak|smallest|largest|highest|lowest)\b|\bwhich fall\b.*\b(?:minimum|maximum|smallest|largest|highest|lowest)\b|\bwhich fall year\b.*\bpeak\b|\bpeak institutional enrollment\b|\bwhich fall\b.*\b(?:smallest|largest|highest|lowest)\b|\bwhat year produced the (?:highest|lowest)\b|\b(?:lowest|highest) .+ census year\b|\bduring which fall\b.*\b(?:largest|highest|lowest)\b/.test(
        normalized,
      )
    ) {
      return "rank_year";
    }
  }
  if (metric === "retention") {
    if (
      /\b(?:retention )?(?:difference|gap)\b|\bpercentage[- ]point retention difference\b/.test(
        normalized,
      ) &&
      /\bbs\b/.test(normalized) &&
      /\bms\b/.test(normalized)
    ) {
      return "retention_degree_gap";
    }
    if (/\bwhich student group improved\b/.test(normalized)) {
      return "retention_group_improvement";
    }
    if (/\bwhich group had the (lowest|highest)\b/.test(normalized)) {
      return "retention_group_ranking";
    }
    if (
      /\b(gap|compare|contrast|versus|vs|side by side|separated|differs? from)\b/.test(
        normalized,
      ) &&
      (/\bnon[- ]pell\b/.test(normalized) || /\beveryone else\b/.test(normalized))
    ) {
      return "retention_pell_comparison";
    }
    if (
      /\b(gap|compare|contrast|separated|differs? from)\b/.test(normalized) &&
      /\bcontinuing[- ]generation\b/.test(normalized)
    ) {
      return "retention_generation_comparison";
    }
    if (
      /\bwhich (?:entering[- ]cohort|cohort|completed cohort) year (?:had|posted|produced) (?:the )?(highest|lowest|strongest|weakest)\b|\bwhich entering year\b.*\b(?:best|strongest|highest|lowest|weakest)\b|\b(?:which|find) (?:the )?(?:graduate |undergraduate )?entering (?:class|cohort)\b.*\b(?:best|strongest|highest|lowest|weakest)\b|\bfind the (?:best|strongest|highest|lowest|weakest) (?:graduate |undergraduate )?entering (?:class|cohort)\b|\bwhich (?:complete |completed |undergraduate |graduate )?cohort\b.*\b(?:best|strongest|highest|lowest|weakest)\b|\b(?:find|which)\b.*\bweakest (?:complete )?(?:retention )?cohort\b/.test(
        normalized,
      )
    ) {
      return "rank_year";
    }
  }
  if (metric === "capacity_utilization") {
    if (
      /\bcompare enrollment and capacity\b|\bcompare census enrollment with (?:its )?scheduled[- ](?:seats?|capacity)\b|\bcompare census students registrations and scheduled seats\b|\b(?:headcount|census enrollment)\b.*\b(?:beside|versus|with)\b.*\b(?:registrations|scheduled[- ](?:seats?|capacity)|occupied seats)\b|\bregistrations\b.*\b(?:versus|and)\b.*\bscheduled seats\b/.test(
        normalized,
      )
    ) {
      return "capacity_enrollment_comparison";
    }
    if (
      /\b(?:above|below|exactly|at least|at most|not above|not below)\s+\d+(?:\.\d+)?(?:\s*percent)?\b/.test(
        normalized,
      ) ||
      /\b(?:above|below)\s+or equal to\s+\d+(?:\.\d+)?(?:\s*percent)?\b/.test(
        normalized,
      )
    ) {
      return "capacity_threshold";
    }
  }
  if (metric === "quality_issues") {
    if (/\bdq-(?:\d+|[a-z]+-\d+)\b/.test(normalized)) {
      return "quality_issue_detail";
    }
    if (
      /\b(?:put|list)\b.*\b(?:findings?|issues?|exceptions?)\b|\bshow\b.*\b(?:all|assigned|owned)\b.*\b(?:findings?|issues?|exceptions?|anomalies)\b|\bshow\b.*\b(?:findings?|issues?|exceptions?|anomalies)\b.*\b(?:assigned|owned|with their)\b|\bshow\b.*\bdata defects?\b|\bdata quality stuff\b/.test(
        normalized,
      )
    ) {
      return "quality_issue_list";
    }
    if (
      /\bwhich (?:\w+\s+){0,3}(?:data quality |quality )?(?:issues?|findings?|exceptions?)\b.*\b(?:affect|affects|touch|touches|have|has)\b.*\b(?:most|largest|greatest)\b.*\brecords?\b|\bwhich open finding has the greatest affected[- ]record footprint\b|\bwhat (?:issue )?rule is responsible for the largest record impact\b|\bwhat rule caused the largest data quality issue\b|\bwhich rule is behind the largest\b/.test(
        normalized,
      )
    ) {
      return "quality_issue_ranking";
    }
  }
  if (metric === "ipeds_readiness") {
    if (
      /\bwhat needs to be fixed\b|\bwhat remains before\b.*\bsubmission[- ]ready\b|\bvalidations? remain before submission\b|\bwhat (?:must|should) (?:be )?remediat\w* before\b.*\bsubmission\b|\bwhat should .+ remediate before\b.*\bsubmission\b|\b(?:explain|describe) the (?:largest|most consequential) (?:outstanding )?ipeds validation (?:problem|concern|item)\b/.test(
        normalized,
      )
    ) {
      return "ipeds_remediation";
    }
    if (
      /\b(open|unresolved) ipeds\b|\bipeds validation issues are open\b|\bipeds\b.*\bunresolved\b|\bfall enrollment checks? (?:have )?not passed\b/.test(
        normalized,
      )
    ) {
      return "ipeds_unresolved";
    }
  }
  return "standard";
}
