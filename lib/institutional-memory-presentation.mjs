const MEMORY_KIND_LABELS = Object.freeze({
  all: "All",
  definition: "Definitions",
  policy: "Policies",
  submission: "Prior submissions",
  analysis: "Analyses",
  accreditation: "Accreditation evidence",
});

export function memoryKindDisplayLabel(kind) {
  const value = String(kind ?? "").trim();
  return MEMORY_KIND_LABELS[value.toLowerCase()] ?? value;
}

export function formatMemoryVerificationDate(value) {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
