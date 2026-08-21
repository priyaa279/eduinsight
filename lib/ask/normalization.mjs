export function clean(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeQuestion(value) {
  let normalized = clean(value)
    .replace(/\bhow s\b/g, "how is")
    .replace(/\bwhat s\b/g, "what is")
    .replace(/\bdata ve\b/g, "data have")
    .replace(/\bprovost brief\b|\bregistrar snapshot\b|\bfor cabinet\b/g, "")
    .replace(/\bfor reconciliation\b|\breconciliation\b|\bindependent check\b/g, "")
    .replace(/\bttl\b/g, "total")
    .replace(/\bint l\b|\bintl\b/g, "international")
    .replace(/\bpct\b/g, "percentage")
    .replace(/\bmax\b/g, "highest")
    .replace(/\benrollmnt\b/g, "enrollment")
    .replace(/\benrl\b|\benrlmnt\b|\benrollmt\b/g, "enrollment")
    .replace(/\benrolments?\b/g, "enrollment")
    .replace(/\benrollments\b/g, "enrollment")
    .replace(/\benroll\b/g, "enrollment")
    .replace(/\bcomp(?:uter)?[- ]sci(?:ence)?\b|\bc s\b/g, "computer science")
    .replace(/\bmscs\b/g, "ms computer science")
    .replace(/\bmsba\b/g, "ms business analytics")
    .replace(/\bbba\b(?!\s+business administration\b)/g, "bba business administration")
    .replace(/\bm s\b/g, "ms")
    .replace(/\bmaster s[- ]level\b|\bmasters[- ]level\b/g, "graduate")
    .replace(/\bbachelor s[- ]level\b|\bbachelors[- ]level\b/g, "undergraduate")
    .replace(/\bbachelor s students?\b|\bbachelors students?\b/g, "undergraduate students")
    .replace(/\bbachelor s[- ]of[- ]science\b/g, "bachelor of science")
    .replace(/\bmaster s[- ]of[- ]science\b/g, "master of science")
    .replace(/\bbachelor[- ]of[- ]science\b/g, "bachelor of science")
    .replace(/\bmaster[- ]of[- ]science\b/g, "master of science")
    .replace(/\bpublic admin\b/g, "public administration")
    .replace(/\bbiz analytics\b/g, "business analytics")
    .replace(/\bnonresident[- ]alien\b/g, "international")
    .replace(/\bforeign[- ](?:students?|learners?)\b/g, "international students")
    .replace(/\bforeign[- ]residenc\w*\b/g, "international residency")
    .replace(/\boverseas[- ]students?\b/g, "international students")
    .replace(/\boverseas[- ]residenc\w*\b/g, "international residency")
    .replace(/\bnon[- ]domestic\b/g, "international")
    .replace(/\bnon[- ]international\b/g, "not international")
    .replace(/\beveryone except international\b/g, "students excluding international")
    .replace(/\btagged international\b/g, "with international residency")
    .replace(/\bug\b/g, "undergraduate")
    .replace(/\bugrad\b|\bugrads\b/g, "undergraduate")
    .replace(/\bundergrads?\b/g, "undergraduate")
    .replace(/\bundergraduates\b/g, "undergraduate")
    .replace(/\bgrad kids?\b/g, "graduate students")
    .replace(/\bgrad students?\b/g, "graduate students")
    .replace(/\bgrad enrollment\b/g, "graduate enrollment")
    .replace(/\bgraduate[- ]level\b/g, "graduate")
    .replace(/\bundergraduate[- ]level\b/g, "undergraduate")
    .replace(/\bpost[- ]baccalaureate\b/g, "graduate")
    .replace(/\bbaccalaureate[- ]level\b/g, "undergraduate")
    .replace(/\bgrad\b/g, "graduate")
    .replace(/\bft\b|\bf t\b/g, "full-time")
    .replace(/\bpt\b|\bp t\b/g, "part-time")
    .replace(/\bfirst[- ]gen\b/g, "first-generation")
    .replace(/\b1st[- ]gen\b/g, "first-generation")
    .replace(/\bfirst[- ]in[- ]family\b/g, "first-generation")
    .replace(/\bcont(?:inuing)?[- ]gen\b/g, "continuing-generation")
    .replace(/\bnonpell\b/g, "non-pell")
    .replace(/\bwithout pell eligibility\b/g, "non-pell")
    .replace(/\bacademic[- ]warning\b/g, "academic warning")
    .replace(/\bgood[- ]standing\b/g, "good standing")
    .replace(
      /\bfirst-\s+and continuing-generation\b/g,
      "first-generation and continuing-generation",
    )
    .replace(/\b(kids?|learners?|enrollees?)\b/g, "students")
    .replace(/\bhead counts?\b|\bheadcounts\b|\bheadcnt\b|\bheads\b|\bhc\b/g, "headcount")
    .replace(/\bretntn\b|\bretain rate\b/g, "retention")
    .replace(/\bfirst[- ]year return rate\b|\breturned the next fall\b|\bcame back the next fall\b/g, "first-year retention")
    .replace(/\bpersistnce\b/g, "persistence")
    .replace(/\bstudent body count\b/g, "student enrollment count")
    .replace(/\broster (?:total|count)\b/g, "enrollment")
    .replace(/\bcensus size\b|\bcensus count\b|\bprogram size\b/g, "enrollment")
    .replace(
      /\bseats? left\b|\bseat room remains\b|\bunused seats\b|\bseats? (?:are )?still available\b/g,
      "available seats",
    )
    .replace(
      /\bunused scheduled capacity\b|\bunfilled scheduled seats?\b|\bremaining (?:section[- ]?)?seat room\b|\bopen section seats?\b/g,
      "available seats",
    )
    .replace(/\bseat(?:s)? are occupied\b|\boccupied seats?\b/g, "filled seats")
    .replace(/\bscheduled (.+?) seats\b/g, "scheduled seats for $1")
    .replace(/\bnearest to full\b|\bclosest to full\b/g, "highest capacity utilization")
    .replace(/\bclosest to filling all scheduled seats\b/g, "highest capacity utilization")
    .replace(/\bfullest\b/g, "highest capacity utilization")
    .replace(/\bleast[- ]utilized\b/g, "lowest capacity utilization")
    .replace(/\bhow full\b/g, "capacity utilization")
    .replace(/\bseat use\b|\bscheduled[- ]seat usage\b|\bschedule fill rate\b/g, "capacity utilization")
    .replace(/\bpercent occupied\b|\bpercent full\b/g, "percent capacity utilization")
    .replace(/\bless than half\b/g, "below 50 percent")
    .replace(/\br\b/g, "are")
    .replace(/\brn\b/g, "currently")
    .replace(/\bd-f-w\b|\bd f w\b/g, "dfw")
    .replace(/\bw\b/g, "with")
    .replace(/\boutta state\b/g, "out-of-state")
    .replace(/\bdegrees?\b/g, "programs")
    .replace(/\bmajors?\b/g, "programs")
    .replace(/\bprobs?\b/g, "problems")
    .replace(/\bdata-quality\b/g, "data quality")
    .replace(/\bdq\b(?!-(?:\d+|[a-z]+-\d+)\b)/g, "data quality")
    .replace(/\bedits need eyeballs\b/g, "checks require review")
    .replace(/\bpls\b/g, "")
    .replace(/\bfall twenty twenty[- ]one\b/g, "fall 2021")
    .replace(/\btwenty twenty[- ]one\b/g, "2021")
    .replace(/\btwenty[- ]one\b/g, "2021")
    .replace(/\bthru\b/g, "through")
    .replace(/\bautumn\b/g, "fall")
    .replace(/\bmost recent fall\b/g, "latest fall")
    .replace(/\bnewest\b/g, "latest")
    .replace(/\bcurrent certified fall\b/g, "latest fall")
    .replace(/\blocked fall totals?\b|\bfall totals? in sequence\b/g, "fall census totals")
    .replace(/\bin sequence\b/g, "as a trend")
    .replace(/\bcomplete fall census history\b/g, "fall census trend")
    .replace(/\bcomplete census history\b/g, "census trend")
    .replace(/\blatest available fall\b/g, "latest fall")
    .replace(/\bthis year s latest available fall\b/g, "latest fall")
    .replace(/\bbeginning (?:in|with)\b|\bstarting (?:in|with)\b/g, "since")
    .replace(/\bfrom (\d{4}) onward\b/g, "since $1")
    .replace(/\bprior to\b/g, "before")
    .replace(/\bpreceding\b/g, "before")
    .replace(/\blater than\b/g, "after")
    .replace(/\bside by side\b|\bnext to each other\b/g, "compare")
    .replace(/\bprior year\b|\blast yr\b|\byr over yr\b/g, "year-over-year")
    .replace(/\bhigh to low\b/g, "highest")
    .replace(/\bfrom highest to lowest\b/g, "highest")
    .replace(/\bno greater than\b/g, "at most")
    .replace(/\bno more than\b/g, "at most")
    .replace(/\bstrictly over\b/g, "above")
    .replace(/\bstrictly under\b/g, "below")
    .replace(/\bexactly at\b/g, "exactly")
    .replace(/\bunder\s+(\d+(?:\.\d+)?)\s+percent\b/g, "below $1 percent")
    .replace(/\b(\d+(?:\.\d+)?) percent or more\b/g, "at least $1 percent")
    .replace(/\bninety\b/g, "90")
    .replace(/\bsixty\b/g, "60")
    .replace(/\bportion of\b/g, "percentage of")
    .replace(/\bpercentage[- ]growth\b/g, "percentage growth")
    .replace(/\bpercentage[- ]decline\b/g, "percentage decline")
    .replace(/\bshare(?: of)?\b/g, "percentage of")
    .replace(/\bfraction of\b/g, "percentage of")
    .replace(/\bsplit by\b/g, "by")
    .replace(/\bseries\b/g, "trend")
    .replace(/\bmovement\b/g, "change")
    .replace(/\bshrink\b|\bshrunk\b/g, "decrease")
    .replace(/\bplot\b|\bchart\b/g, "show")
    .replace(/\bfailures\b/g, "failure rate")
    .replace(/\bd f or withdrawal\b|\bd f or withdraw\w*\b/g, "dfw")
    .replace(/\bd f (?:or|and) (?:w|with)\b/g, "dfw")
    .replace(/\butilizing\b/g, "with utilization")
    .replace(/\binstitution total\b|\binstitution count\b/g, "institution enrollment")
    .replace(/\blatest fall institution enrollment\b/g, "institution enrollment latest fall")
    .replace(/\bhow large was the international cohort\b/g, "how many international students were enrolled")
    .replace(/\bwhat data have we got\b/g, "what data is available")
    .replace(/\bstudent well[- ]being survey\b/g, "student satisfaction survey")
    .replace(/\bipeds good to go\b/g, "ipeds readiness")
    .replace(/\bipeds problems\b/g, "ipeds checks require review")
    .replace(/\bwhich programs are almost full\b/g, "which programs have the highest capacity utilization")
    .replace(/\btop (\d+) programs by size\b/g, "top $1 programs by enrollment")
    .replace(/\blowest headcount program\b/g, "program with the lowest enrollment")
    .replace(/\bprogram leading in international student count\b/g, "which program has the most international students")
    .replace(/\bprogram with the greatest international percentage of\b/g, "which program has the highest percentage of international")
    .replace(/\bprogram adding the largest number of students\b/g, "which program added the most students")
    .replace(/\bprogram with the fastest percentage growth\b/g, "which program had the highest percentage growth")
    .replace(/\blist programs with no enrollment growth\b/g, "programs that did not grow")
    .replace(/\bonly the two biggest programs\b/g, "top 2 programs")
    .replace(/\bthree smallest programs\b/g, "bottom 3 programs")
    .replace(/\br almost full\b/g, "are almost full");
  normalized = normalized
    .replace(/\bfilter was retained\b/g, "filter was applied")
    .replace(/\bfilter is retained\b/g, "filter is applied");
  normalized = normalized.replace(/\b2o(\d{2})\b/g, "20$1");
  normalized = normalized.replace(
    /\bfa\s*'?(\d{2})\b/g,
    (_, year) => `fall 20${year}`,
  );
  normalized = normalized.replace(
    /\bcohort\s*'?(\d{2})\b/g,
    (_, year) => `cohort 20${year}`,
  );
  normalized = normalized.replace(
    /\bcrossed (?:the )?(\d+(?:\.\d+)?)(?: percent)?(?: utilization)? threshold\b/g,
    "above $1 percent capacity",
  );
  normalized = normalized.replace(
    /\bay\s*(\d{2})\b/g,
    (_, year) => `20${year}`,
  );
  normalized = normalized.replace(
    /\b(since|from|through|after|before|in|fall)\s+(\d{2})\b/g,
    (_, prefix, year) => `${prefix} ${Number(year) >= 70 ? "19" : "20"}${year}`,
  );
  normalized = normalized.replace(
    /\b(census|cohort|retention|persistence)\s+(\d{2})\b/g,
    (_, prefix, year) => `${prefix} 20${year}`,
  );
  normalized = normalized.replace(
    /\b(headcount)\s+(\d{2})\b/g,
    (_, prefix, year) => `${prefix} 20${year}`,
  );
  return normalized.replace(/\s+/g, " ").trim();
}
