export type EmploymentType = "Permanent" | "Contract" | "Internship" | "Temporary" | "Sessional" | "Full-time" | "Part-time";

export type ParsedVacancyDetails = {
  grade: string;
  directorate: string;
  jobPurpose: string;
  qualifications: string[];
  experience: string;
  professionalRegistration: string;
  driversLicense: string;
  skills: string[];
  duties: string[];
  applicationInstructions: string;
  applicationEmails: string[];
  applicationMethods: string[];
  requiredDocuments: string[];
  enquiries: string;
  telephone: string;
  centre: string;
  region: string;
  note: string;
  closingTime: string;
  contractDuration: string;
  numberOfPosts: number | null;
  salaryBasis: string;
};

export type ParsedVacancy = {
  id: string;
  post_number: string;
  title: string;
  department: string;
  location: string;
  province: string;
  closing_date: string;
  reference_number: string;
  employment_type: EmploymentType | null;
  salary: string;
  salary_amount: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  stipend: string;
  level: string;
  grade: string;
  directorate: string;
  job_purpose: string;
  requirements: string;
  duties: string;
  enquiries: string;
  telephone: string;
  application_procedure: string;
  note: string;
  description: string;
  application_url: string;
  source_url: string;
  source_published_at: string;
  extracted_details: ParsedVacancyDetails;
};

export type DpsaCircularMetadata = {
  circularName?: string;
  circularDate?: string;
  circularLink?: string;
};

type FieldName =
  | "refNo"
  | "branch"
  | "chiefDirectorate"
  | "directorate"
  | "cluster"
  | "salary"
  | "stipend"
  | "level"
  | "natureOfAppointment"
  | "centre"
  | "region"
  | "closingDate"
  | "requirements"
  | "duties"
  | "jobPurpose"
  | "skillsAndCompetencies"
  | "enquiries"
  | "applications"
  | "note"
  | "numberOfPosts";

type PageContext = { province: string; department: string };
type DepartmentRange = { name: string; start: number; end: number; index: number };
type CircularDetails = { name: string; date: string; link: string };

const postPattern = /\bPOST\s+(\d{1,3}\s*\/\s*\d{1,3}|\d{1,3})\s*:\s*/gi;
const fieldPatterns: Array<[FieldName, RegExp]> = [
  ["refNo", /\bREF(?:ERENCE)?(?:\s*(?:NO\.?|NUMBER))?\s*[:.\u2013\u2014-]/i],
  ["branch", /\b(?:Branch|Division)\s*[:.\u2013\u2014-]/i],
  ["chiefDirectorate", /(?:Chief\s*Directorate|\bCd)\s*[:.\u2013\u2014-]/i],
  ["directorate", /(?<!Chief\s)\b(?:Directorate|Dir)\s*[:.\u2013\u2014-]/i],
  ["cluster", /\bCluster\s*[:.\u2013\u2014-]/i],
  ["salary", /\bSALARY\s*[:.\u2013\u2014-]/i],
  ["stipend", /\bSTIPEND(?:\s*[:.\u2013\u2014-]|\s+(?=R\s*\d))/i],
  ["level", /\bLEVEL\s*[:.\u2013\u2014-]/i],
  ["natureOfAppointment", /Nature\s*of\s*Appointment\s*[:.\u2013\u2014-]/i],
  ["centre", /\bCENT(?:RE|ER)S?\s*[:.\u2013\u2014-]/i],
  ["region", /\bREGION\s*[:.\u2013\u2014-]/i],
  ["closingDate", /CLOSING\s*DATE\s*[:.\u2013\u2014-]/i],
  ["requirements", /\bREQUIREMENTS\s*[:.\u2013\u2014-]/i],
  ["duties", /\bDUTIES\s*[:.\u2013\u2014-]/i],
  [
    "jobPurpose",
    /\b(?:The\s+purpose\s+of\s+the\s+post\s+is(?:\s+to)?|Job\s*Purpose|Purpose)\s*[:.\u2013\u2014-]/i,
  ],
  ["skillsAndCompetencies", /\bSkills?\s*(?:and|&)\s*Competenc(?:y|ies)\s*[:.\u2013\u2014-]/i],
  ["enquiries", /\bENQUIRIES\s*[:.\u2013\u2014-]/i],
  ["applications", /\bAPPLICATIONS\s*[:.\u2013\u2014-]/i],
  ["note", /\bNOTES?\s*[:.\u2013\u2014-]/i],
  ["numberOfPosts", /\b(?:NUMBER\s+OF\s+POSTS?|NO\.?\s+OF\s+POSTS?)\s*[:.\u2013\u2014-]/i],
];

const monthNumbers: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

const provinceNames = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

const cityProvinces: Record<string, string> = {
  "Cape Town": "Western Cape",
  Centurion: "Gauteng",
  Durban: "KwaZulu-Natal",
  "East London": "Eastern Cape",
  George: "Western Cape",
  Johannesburg: "Gauteng",
  Kimberley: "Northern Cape",
  Mbombela: "Mpumalanga",
  Polokwane: "Limpopo",
  Pretoria: "Gauteng",
  Rustenburg: "North West",
  "Port Elizabeth": "Eastern Cape",
  "Gqeberha": "Eastern Cape",
  "Pietermaritzburg": "KwaZulu-Natal",
  "Bloemfontein": "Free State",
  "Makhanda": "Eastern Cape",
  "Mahikeng": "North West",
};

function tidy(value: string) {
  return value
    .replace(/__PAGE_\d+__/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleCase(value: string) {
  return value
    .split(/(\([^)]*\)|\[[^\]]*\])/g)
    .map((part) => /^[([]/.test(part)
      ? part
      : part.toLowerCase().replace(/\b([a-z])([a-z0-9'-]*)/g, (_match, first: string, rest: string) => first.toUpperCase() + rest))
    .join("");
}

function getFieldMatches(value: string) {
  const found: Array<{ name: FieldName; start: number; end: number }> = [];
  for (const [name, pattern] of fieldPatterns) {
    const globalPattern = new RegExp(pattern.source, `${pattern.flags}g`);
    for (const match of value.matchAll(globalPattern)) {
      if (match.index !== undefined) found.push({ name, start: match.index, end: match.index + match[0].length });
    }
  }
  found.sort((left, right) => left.start - right.start || right.end - left.end);
  const accepted: typeof found = [];
  for (const match of found) {
    if (accepted.length && match.start < accepted[accepted.length - 1].end) continue;
    accepted.push(match);
  }
  return accepted;
}

function normalizeProvince(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim().toUpperCase();
  const normalizedNames: Record<string, string> = {
    "KWAZULU NATAL": "KwaZulu-Natal",
    "KWAZULU-NATAL": "KwaZulu-Natal",
    GAUTENG: "Gauteng",
    "WESTERN CAPE": "Western Cape",
    "EASTERN CAPE": "Eastern Cape",
    "NORTHERN CAPE": "Northern Cape",
    "FREE STATE": "Free State",
    MPUMALANGA: "Mpumalanga",
    LIMPOPO: "Limpopo",
    "NORTH WEST": "North West",
  };
  return normalizedNames[normalized] ?? titleCase(value.toLowerCase());
}

function findDepartmentAndProvince(prefix: string): PageContext {
  const lines = prefix.split(/\r?\n/).map((line) => tidy(line)).filter(Boolean);
  let province = "";
  let department = "";

  for (const line of lines) {
    if (/^ANNEXURE\s+[A-Z]{1,2}$/i.test(line)) {
      department = "";
      continue;
    }
    if (/\bNATIONAL\s+HEAD\s+OFFICE\b/i.test(line)) province = "Gauteng";

    const provinceHeader = line.match(/^PROVINCIAL\s+ADMINISTRATION\s*:\s*(.+)$/i);
    if (provinceHeader) {
      province = normalizeProvince(provinceHeader[1]);
      department = "";
      continue;
    }

    const departmentHeader = line.match(
      /^(?:DEPARTMENT\s+OF|OFFICE\s+OF(?:\s+THE)?|PROVINCIAL\s+TREASURY|OFFICE\s+OF\s+THE\s+PREMIER)\s+(.+)$/i,
    );
    if (departmentHeader) {
      const normalized = titleCase(line);
      const candidate = normalized.replace(/\bOf\b/g, "of").replace(/\bThe\b/g, "the");
      department = candidate.length <= 180 ? candidate : "";
      continue;
    }

    const standaloneProvince = provinceNames.find((name) =>
      new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i").test(line),
    );
    if (standaloneProvince) province = standaloneProvince;
  }
  return { department, province };
}

function findCircularPageContexts(text: string) {
  const contexts = new Map<number, PageContext>();
  let page = 0;
  let province = "";
  let department = "";
  let sawPost = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const pageMarker = line.match(/^__PAGE_(\d+)__$/);
    if (pageMarker) {
      page = Number.parseInt(pageMarker[1], 10);
      contexts.set(page, { province, department });
      continue;
    }
    if (/^ANNEXURE\s+[A-Z]{1,2}$/i.test(line)) {
      department = "";
      contexts.set(page, { province, department });
      continue;
    }
    if (/\bNATIONAL\s+HEAD\s+OFFICE\b/i.test(line)) {
      province = "Gauteng";
      contexts.set(page, { province, department });
    }
    if (/^(?:(?:OTHER|ADDITIONAL)\s+POST\s+)?POST\s+\d{1,3}(?:\s*\/\s*\d{1,3})?\s*:/i.test(line)) sawPost = true;

    const provinceHeader = line.match(/^PROVINCIAL\s+ADMINISTRATION\s*:\s*(.+?)\s*$/i);
    if (provinceHeader && /^[A-Z][A-Z -]+$/.test(provinceHeader[1].trim())) {
      province = normalizeProvince(provinceHeader[1]);
      department = "";
      contexts.set(page, { province, department });
      continue;
    }
    if (!sawPost) continue;

    const departmentHeader = line.match(/^DEPARTMENT\s+OF\s+([A-Z][A-Z&',\-\s]+?)\s*$/);
    if (departmentHeader && departmentHeader[1].length <= 180) {
      department = `Department of ${titleCase(departmentHeader[1].toLowerCase().trim())}`;
      contexts.set(page, { province, department });
      continue;
    }
    if (/^(?:OFFICE\s+OF\s+[A-Z]|JUDICIAL\s+INSPECTORATE|INDEPENDENT\s+POLICE|NATIONAL\s+TREASURY|STATISTICS\s+SOUTH\s+AFRICA|GOVERNMENT\s+COMMUNICATIONS?|GOVERNMENT\s+PRINTING\s+WORKS|PUBLIC\s+SERVICE\s+COMMISSION|MILITARY\s+OMBUD)\b/.test(line)) {
      const candidate = titleCase(line.toLowerCase().trim());
      department = candidate.length <= 180 ? candidate : "";
      contexts.set(page, { province, department });
    }
  }
  return contexts;
}

function findDepartmentRanges(text: string) {
  const pattern = /\b([A-Z][A-Z ,&'\-/]{3,}?)\s+([A-Z]{1,2})\s+(\d{1,3})(?:\s*[-\u2013\u2014-]\s*(\d{1,3}))?\b/g;
  const ignoredStart = /^(INDEX|NATIONAL|PROVINCIAL|DEPARTMENTS?|ADMINISTRATIONS?|ANNEXURE|ANNEXURES|PAGES?|TABLE|OF|CONTENTS)$/i;
  const ignoredCode = /^(NO|OF|IS|IT|AT|ON|IN|BY|SO|AS|TO|UP|US|OR|AN|TH|MY|HE|WE|DO|BE|GO)$/i;
  const matches: DepartmentRange[] = [];

  for (const match of text.matchAll(pattern)) {
    const nameParts = match[1].replace(/\s+/g, " ").trim().split(" ");
    if (ignoredCode.test(match[2])) continue;
    while (nameParts.length && ignoredStart.test(nameParts[0])) nameParts.shift();
    const name = nameParts.join(" ").trim();
    const start = Number.parseInt(match[3], 10);
    const end = match[4] ? Number.parseInt(match[4], 10) : start;
    if (!name || end < start || end - start > 120 || match.index === undefined) continue;
    matches.push({ name, start, end, index: match.index });
  }

  const provinceSection = text.search(/PROVINCIAL\s+ADMINISTRATIONS?/i);
  return {
    national: matches.filter((match) => provinceSection < 0 || match.index < provinceSection),
    provincial: provinceSection < 0 ? [] : matches.filter((match) => match.index >= provinceSection),
  };
}

function departmentForPage(ranges: DepartmentRange[], page: number) {
  const departments = ranges
    .filter((range) => page >= range.start && page <= range.end)
    .map((range) => titleCase(range.name.toLowerCase()))
    .filter((name) => name.length <= 180)
    .filter((name, index, names) => names.indexOf(name) === index)
    .join(", ");
  return departments.length <= 180 ? departments : "";
}

function provinceFromVacancy(value: string) {
  if (/\bNATIONAL\s+HEAD\s+OFFICE\b/i.test(value)) return "Gauteng";
  const found = provinceNames.filter((province) =>
    new RegExp(`\\b${province.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(value),
  );
  if (found.length) return [...new Set(found)].join(", ");
  const city = Object.keys(cityProvinces).find((name) =>
    new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(value),
  );
  return city ? cityProvinces[city] : "";
}

function getCircularDetails(text: string, metadata: DpsaCircularMetadata): CircularDetails {
  const publication = text.match(/PUBLICATION\s+NO\.?\s*(\d+)\s+OF\s+(\d{4})/i);
  const issued = text.match(/DATE\s+ISSUED\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  const number = publication?.[1] ? Number.parseInt(publication[1], 10) : null;
  const year = publication?.[2];
  return {
    name: metadata.circularName || (number && year ? `DPSA CIRCULAR ${number} of ${year}` : ""),
    date: issued?.[1]?.replace(/\s+/g, " ").trim() || metadata.circularDate || "",
    link: metadata.circularLink || "",
  };
}

function parseClosingDate(value: string) {
  const iso = value.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return validDate(iso[1], iso[2], iso[3]);

  const monthFirst = value.match(/\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})\b/i);
  if (monthFirst) {
    const month = monthNumbers[monthFirst[1].toLowerCase()];
    if (month) return validDate(monthFirst[3], month, monthFirst[2]);
  }

  const dayFirst = value.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)[,\s]+(20\d{2})\b/i);
  if (dayFirst) {
    const month = monthNumbers[dayFirst[2].toLowerCase()];
    if (month) return validDate(dayFirst[3], month, dayFirst[1]);
  }

  const numeric = value.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);
  if (numeric) return validDate(numeric[3], numeric[2], numeric[1]);
  return "";
}

function validDate(year: string, month: string, day: string) {
  const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized ? "" : normalized;
}

function extractApplicationUrl(value: string) {
  const match = value.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return "";
  const candidate = match[0].replace(/[),.;:]+$/g, "");
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function extractSalaryAmount(value: string) {
  const amounts = Array.from(value.matchAll(/R\s*([0-9][0-9 ,]*(?:\.[0-9]+)?)/g))
    .map((match) => match[1].replace(/,/g, " ").replace(/\s+/g, " ").trim());
  if (amounts.length > 1) return `${amounts[0]} - ${amounts[amounts.length - 1]}`;
  return amounts[0] ?? "";
}

function extractSalaryBounds(value: string) {
  const amounts = Array.from(value.matchAll(/R\s*([0-9][0-9 ,]*(?:\.[0-9]+)?)/g))
    .map((match) => Number(match[1].replace(/[ ,]/g, "")))
    .filter(Number.isFinite);
  if (!amounts.length) return { min: null, max: null };
  return { min: Math.min(...amounts), max: Math.max(...amounts) };
}

function extractTelephone(value: string) {
  const matches = value.match(/(?:\(?\s*(?:\+?27|0)\s*\)?\s*)(?:\(?\d{2,3}\)?[\s-]?)\d{3}[\s-]?\d{4}/g) ?? [];
  return [...new Set(matches.map((phone) => phone.replace(/\s+/g, " ").trim()))].join(", ");
}

function normalizeEmploymentType(value: string, evidence: string): EmploymentType | null {
  const searchable = `${value} ${evidence}`;
  if (/\binternship\b/i.test(searchable)) return "Internship";
  if (/\bsession(?:al)?\b/i.test(searchable)) return "Sessional";
  if (/\btemporary\b/i.test(searchable)) return "Temporary";
  if (/\bpart[\s-]?time\b/i.test(searchable)) return "Part-time";
  if (/\bfull[\s-]?time\b/i.test(searchable)) return "Full-time";
  if (/\bpermanent\b/i.test(searchable)) return "Permanent";
  if (/\b(?:fixed[\s-]*term\s+)?contract\b|\bcontract\s+of\s+\d+\s*(?:months?|years?)\b/i.test(searchable)) {
    return "Contract";
  }
  return "Permanent";
}

function extractContractDuration(value: string) {
  const match = value.match(/\b(\d+(?:\.\d+)?\s*(?:months?|years?))\s+(?:fixed[\s-]*term\s+)?contract\b|\b(?:fixed[\s-]*term\s+)?contract\s+of\s+(\d+(?:\.\d+)?\s*(?:months?|years?))\b/i);
  return (match?.[1] ?? match?.[2] ?? "").replace(/\s+/g, " ").trim();
}

function extractClosingTime(value: string) {
  const match = value.match(/\b(?:at\s*)?(\d{1,2})\s*[:H]\s*(\d{2})\b/i);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    : "";
}

function uniqueMatches(value: string, pattern: RegExp) {
  return [...new Set(Array.from(value.matchAll(pattern), (match) => match[0].trim()))];
}

function extractVacancyDetails(input: {
  requirements: string;
  duties: string;
  skills: string;
  applications: string;
  enquiries: string;
  telephone: string;
  note: string;
  grade: string;
  directorate: string;
  jobPurpose: string;
  closingDate: string;
  salary: string;
  stipend: string;
  natureOfAppointment: string;
  centre: string;
  region: string;
  numberOfPosts: string;
  title: string;
  positionText: string;
}) {
  const requirementItems = toList(input.requirements);
  const qualificationTerms = /\b(?:qualification|degree|diploma|certificate|NQF\s+level|matric|grade\s+12)\b/i;
  const experienceTerms = /\b(?:experience|years?\s+of\s+service|years?\s+relevant)\b/i;
  const registrationTerms = /\b(?:registered|registration|professional\s+body|HPCSA|SANC|SACE|ECSA|SACSSP)\b/i;
  const licenceTerms = /\b(?:driver'?s?\s+licen[cs]e|valid\s+driver|code\s+[A-E]\s+licen[cs]e)\b/i;
  const skills = [...toList(input.skills), ...requirementItems.filter((item) => /\b(?:skills?|competenc(?:y|ies))\b/i.test(item))];
  const application = input.applications;
  const emails = uniqueMatches(application, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi).map((email) => email.toLowerCase());
  const methods = [
    /\b(?:apply|applications?|submit|send)[^.;]{0,80}\bonline\b|\bonline\s+(?:application|applications|portal|system)\b/i.test(application) ? "Online" : "",
    /\b(?:apply|application|submit|send)[^.;]{0,80}\bby email\b|\bemail\s+(?:your|the|all|applications?)\b/i.test(application) ? "Email" : "",
    /\bpost(?:al)?\b/i.test(application) ? "Post" : "",
    /\bhand[\s-]?deliver(?:y)?\b/i.test(application) ? "Hand delivery" : "",
  ].filter(Boolean);
  const documentTerms = /\b(?:Z83|CV|curriculum vitae|certified cop(?:y|ies)|identity document|ID document|qualifications?)\b/gi;
  const documentMatches = uniqueMatches(application, documentTerms);
  const sourceRequirements = requirementItems.filter((item) => qualificationTerms.test(item));
  const experience = requirementItems.filter((item) => experienceTerms.test(item)).join(" ");
  const professionalRegistration = requirementItems.filter((item) => registrationTerms.test(item)).join(" ");
  const driversLicense = requirementItems.filter((item) => licenceTerms.test(item)).join(" ");
  const postCountText = `${input.numberOfPosts} ${input.title} ${input.positionText}`;
  const postCountMatch = postCountText.match(/\b(?:x\s*)?(\d{1,3})\s*(?:posts?|positions?)\b/i);
  const postCount = postCountMatch ? Number(postCountMatch[1]) : null;
  const salaryBasis = (input.salary || input.stipend).match(/\b(per\s+(?:annum|year|month|week|hour)|annually|monthly|weekly|hourly)\b/i)?.[1] ?? "";
  const contractDuration = extractContractDuration(
    `${input.natureOfAppointment} ${input.salary} ${input.stipend} ${input.centre} ${input.title}`,
  );

  return {
    grade: input.grade,
    directorate: input.directorate,
    jobPurpose: input.jobPurpose,
    qualifications: sourceRequirements,
    experience,
    professionalRegistration,
    driversLicense,
    skills: [...new Set(skills)],
    duties: toList(input.duties),
    applicationInstructions: application,
    applicationEmails: emails,
    applicationMethods: [...new Set(methods)],
    requiredDocuments: documentMatches,
    enquiries: input.enquiries,
    telephone: input.telephone,
    centre: input.centre,
    region: input.region,
    note: input.note,
    closingTime: extractClosingTime(input.closingDate),
    contractDuration,
    numberOfPosts: postCount && postCount > 0 ? postCount : null,
    salaryBasis,
  } satisfies ParsedVacancyDetails;
}

function stripEmbeddedNotes(fields: Partial<Record<FieldName, string>>) {
  const noteOrder: FieldName[] = [
    "closingDate", "requirements", "duties", "jobPurpose", "skillsAndCompetencies",
    "enquiries", "applications", "centre", "natureOfAppointment", "salary", "stipend",
  ];
  for (const key of noteOrder) {
    const value = fields[key];
    if (!value) continue;
    const match = /\bN\s*O\s*T\s*E\s*S?\s*[:.\u2013\u2014-]\s*/i.exec(value);
    if (!match || match.index === undefined) continue;
    fields[key] = value.slice(0, match.index).trim();
    const note = value.slice(match.index + match[0].length).trim();
    if (note) fields.note = [fields.note, note].filter(Boolean).join(" ").trim();
    return;
  }
}

function toList(value: string) {
  return value
    .split(/\r?\n|\s*;\s*|(?<=[.!?])\s+(?=[A-Z])/)
    .map((item) => item.trim().replace(/^[-*\u2022]\s*/, "").replace(/[;]+$/, ""))
    .filter(Boolean);
}

function trimCircularTail(value: string) {
  return value
    .replace(/\b(?:ANNEXURE\s+[A-Z]{1,2}|OTHER\s+POSTS?|PUBLIC\s+SERVICE\s+VACANCY\s+CIRCULAR)\b[\s\S]*$/i, "")
    .trim();
}

function buildDescription(
  vacancy: Omit<ParsedVacancy, "description" | "application_url" | "id">,
  circular: CircularDetails,
  fields: Partial<Record<FieldName, string>>,
  page: number,
  extractedDetails: ParsedVacancyDetails,
) {
  const department = vacancy.department || "The hiring department";
  const appointment = vacancy.employment_type?.toLowerCase() || "permanent";
  const article = /^[aeiou]/i.test(appointment) ? "an" : "a";
  const employment = `${article} ${appointment} role`;
  const location = vacancy.province ? ` in ${vacancy.province}` : "";
  const lines = [
    `${department} is seeking a ${vacancy.title} for ${employment}${location}.`,
  ];
  if (vacancy.closing_date) lines.push(`Applications close on ${vacancy.closing_date}.`);
  if (circular.name) lines.push(`${circular.name}${circular.date ? `, issued ${circular.date}` : ""}.`);
  lines.push(`Post ${vacancy.post_number}${page > 0 ? `, page ${page}` : ""}.`);

  lines.push("", "At a glance");
  const quickView: Array<[string, string]> = [
    ["Reference number", vacancy.reference_number],
    ["Appointment", vacancy.employment_type ?? ""],
    ["Province", vacancy.province],
    ["Closing date", vacancy.closing_date],
  ];
  for (const [label, value] of quickView) if (value) lines.push(`${label}: ${value}`);

  lines.push("", "Role details");
  const details: Array<[string, string]> = [
    ["Centres", fields.centre ?? ""],
    ["Region", fields.region ?? ""],
    ["Location", vacancy.location],
    ["Job level", vacancy.level ? `Level ${vacancy.level}` : ""],
    ["Salary or stipend", [vacancy.salary, vacancy.stipend].filter(Boolean).join(" ")],
    ["Grade level", vacancy.grade],
    ["Cluster", fields.cluster ?? ""],
    ["Chief directorate", fields.chiefDirectorate ?? ""],
    ["Directorate", vacancy.directorate],
  ];
  for (const [label, value] of details) if (value) lines.push(`${label}: ${value}`);

  if (vacancy.job_purpose) lines.push("", "About the role", vacancy.job_purpose);
  const requirements = toList(vacancy.requirements);
  if (requirements.length) lines.push("", "What you will need", ...requirements.map((item) => `• ${item}`));
  const duties = toList(vacancy.duties);
  if (duties.length) {
    lines.push("", "Key responsibilities", ...duties.map((item) => `• ${item}`));
  }
  const skills = toList(fields.skillsAndCompetencies ?? "");
  if (skills.length) lines.push("", "Skills and competencies", ...skills.map((item) => `• ${item}`));
  const experience = toList(extractedDetails.experience);
  if (experience.length) lines.push("", "Experience", ...experience.map((item) => `• ${item}`));
  if (extractedDetails.professionalRegistration) {
    lines.push("", "Professional registration", extractedDetails.professionalRegistration);
  }
  if (extractedDetails.driversLicense) lines.push("", "Driver's licence", extractedDetails.driversLicense);
  if (extractedDetails.contractDuration) lines.push("", "Contract duration", extractedDetails.contractDuration);
  if (extractedDetails.numberOfPosts) lines.push("", "Number of posts", String(extractedDetails.numberOfPosts));

  const applicationDetails = [
    ["Enquiries", vacancy.enquiries],
    ["Tel No", vacancy.telephone],
    ["Application procedure", vacancy.application_procedure],
  ].filter(([, value]) => value);
  if (applicationDetails.length) {
    lines.push("", "How to apply");
    for (const [label, value] of applicationDetails) lines.push(`${label}: ${value}`);
  }
  if (extractedDetails.applicationMethods.length) {
    lines.push(`Application method: ${extractedDetails.applicationMethods.join(", ")}`);
  }
  if (extractedDetails.applicationEmails.length) {
    lines.push(`Application email: ${extractedDetails.applicationEmails.join(", ")}`);
  }
  if (extractedDetails.requiredDocuments.length) {
    lines.push(`Documents to include: ${extractedDetails.requiredDocuments.join(", ")}`);
  }
  if (extractedDetails.closingTime) {
    lines.push(`Application deadline time: ${extractedDetails.closingTime}`);
  }
  const notes = toList(vacancy.note);
  if (notes.length) lines.push("", "Please note", ...notes.map((item) => `• ${item}`));
  return lines.join("\n");
}

export function parseDpsaCircularText(text: string, metadata: DpsaCircularMetadata = {}): ParsedVacancy[] {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const posts = Array.from(normalizedText.matchAll(new RegExp(postPattern.source, postPattern.flags)));
  if (posts.length === 0) return [];

  const firstPostIndex = posts[0].index ?? normalizedText.length;
  const header = normalizedText.slice(0, firstPostIndex);
  const circular = getCircularDetails(header, metadata);
  const departmentRanges = findDepartmentRanges(header);
  const pageContexts = findCircularPageContexts(text);
  const pageMarkers = Array.from(normalizedText.matchAll(/__PAGE_(\d+)__/g), (match) => ({
    index: match.index ?? 0,
    page: Number.parseInt(match[1], 10),
  }));
  const getPage = (index: number) => pageMarkers.reduce(
    (page, marker) => marker.index <= index ? marker.page : page,
    0,
  );

  const parsedVacancies = posts.flatMap((post, index) => {
    if (post.index === undefined) return [];
    const end = posts[index + 1]?.index ?? normalizedText.length;
    const block = normalizedText.slice(post.index, end).replace(/__PAGE_\d+__/g, " ");
    const postNumber = post[1].replace(/\s+/g, "");
    const content = block.slice(post[0].length);
    const matches = getFieldMatches(content);
    const titleEnd = matches[0]?.start ?? content.length;
    let title = titleCase(content.slice(0, titleEnd).replace(/\s+/g, " ").trim());
    if (title.length < 5) return [];

    const fields: Partial<Record<FieldName, string>> = {};
    for (let fieldIndex = 0; fieldIndex < matches.length; fieldIndex++) {
      const field = matches[fieldIndex];
      const fieldEnd = matches[fieldIndex + 1]?.start ?? content.length;
      if (fields[field.name] === undefined) {
        fields[field.name] = trimCircularTail(
          content.slice(field.end, fieldEnd).replace(/\s+/g, " ").trim().replace(/\s*\[$/, ""),
        );
      }
    }
    stripEmbeddedNotes(fields);

    const page = getPage(post.index);
    const prefixIndex = text.indexOf(post[0]);
    const knownPageContext = pageContexts.get(page);
    const pageContext = knownPageContext && (knownPageContext.department || knownPageContext.province)
      ? knownPageContext
      : findDepartmentAndProvince(prefixIndex >= 0 ? text.slice(0, prefixIndex) : "");
    const provincialDepartment = departmentForPage(departmentRanges.provincial, page);
    const nationalDepartment = departmentForPage(departmentRanges.national, page);
    const province = pageContext.province
      || provinceFromVacancy(`${fields.centre ?? ""} ${fields.region ?? ""} ${fields.applications ?? ""}`)
      || (provincialDepartment ? normalizeProvince(provincialDepartment) : "");
    let department = pageContext.department || nationalDepartment;
    if (department && !/^(?:Department|Office)\s+of\b/i.test(department)) {
      department = `Department of ${department}`;
    }

    const salary = fields.salary ?? "";
    const stipend = fields.stipend ?? "";
    const employmentEvidence = [
      title,
      fields.natureOfAppointment,
      fields.directorate,
      fields.branch,
      fields.centre,
      salary,
      stipend,
    ].filter(Boolean).join(" ");
    const employmentType = normalizeEmploymentType(fields.natureOfAppointment ?? "", employmentEvidence);
    const level = fields.level || salary.match(/\(\s*Level\s*([0-9]+[A-Za-z]?)\s*\)/i)?.[1] || "";
    const closingDate = parseClosingDate(fields.closingDate ?? "");
    const telephone = extractTelephone(fields.enquiries ?? "");
    if (fields.enquiries) fields.enquiries = fields.enquiries.replace(/\bTel\s*No\s*[:.][\s\S]*$/i, "").trim();

    const reAdvertisement = /[\[(]\s*((?:This is a )?re-?advertisement[^)\]]*?)[)\]]/i;
    for (const key of ["refNo", "centre", "region", "salary", "stipend", "title"] as const) {
      const fieldValue = key === "title" ? title : fields[key] ?? "";
      const match = fieldValue.match(reAdvertisement);
      if (!match) continue;
      fields.note = [match[1].trim(), fields.note].filter(Boolean).join(". ");
      const cleaned = fieldValue.replace(match[0], "").replace(/\s+/g, " ").trim();
      if (key === "title") title = titleCase(cleaned);
      else fields[key] = cleaned;
    }
    if (fields.refNo) {
      fields.refNo = fields.refNo.replace(/^\s*\[?/, "").split("]", 1)[0].trim();
    }

    const location = fields.region || fields.centre || province;
    const salaryValue = salary || stipend;
    const salaryBounds = extractSalaryBounds(salaryValue);
    const directorate = [fields.branch, fields.directorate].filter(Boolean).join(" — ");
    const extractedDetails = extractVacancyDetails({
      requirements: fields.requirements ?? "",
      duties: fields.duties ?? "",
      skills: fields.skillsAndCompetencies ?? "",
      applications: fields.applications ?? "",
      enquiries: fields.enquiries ?? "",
      telephone,
      note: fields.note ?? "",
      grade: provincialDepartment ? "Provincial" : nationalDepartment ? "National" : "",
      directorate,
      jobPurpose: fields.jobPurpose ?? "",
      closingDate: fields.closingDate ?? "",
      salary,
      stipend,
      natureOfAppointment: fields.natureOfAppointment ?? "",
      centre: fields.centre ?? "",
      region: fields.region ?? "",
      numberOfPosts: fields.numberOfPosts ?? "",
      title,
      positionText: `${fields.centre ?? ""} ${fields.salary ?? ""} ${fields.duties ?? ""}`,
    });
    const parsed: Omit<ParsedVacancy, "description"> = {
      id: `${postNumber}-${index}-${post.index}`,
      post_number: postNumber,
      title,
      department,
      location: location.slice(0, 180),
      province,
      closing_date: closingDate,
      reference_number: fields.refNo ?? "",
      employment_type: employmentType,
      salary,
      salary_amount: extractSalaryAmount(salary || stipend),
      salary_min: salaryBounds.min,
      salary_max: salaryBounds.max,
      salary_currency: salaryBounds.min === null ? null : "ZAR",
      stipend,
      level,
      grade: extractedDetails.grade,
      directorate,
      job_purpose: fields.jobPurpose ?? "",
      requirements: fields.requirements ?? "",
      duties: fields.duties ?? "",
      enquiries: fields.enquiries ?? "",
      telephone,
      application_procedure: fields.applications ?? "",
      note: trimCircularTail(fields.note ?? ""),
      application_url: extractApplicationUrl(fields.applications ?? ""),
      source_url: circular.link,
      source_published_at: parseClosingDate(circular.date),
      extracted_details: extractedDetails,
    };

    return [{ vacancy: parsed, fields, page }];
  });

  for (let index = 0; index < parsedVacancies.length; index++) {
    const { vacancy } = parsedVacancies[index];
    if (!vacancy.closing_date || !vacancy.department) continue;

    for (let previous = index - 1; previous >= 0; previous--) {
      const earlier = parsedVacancies[previous].vacancy;
      if (earlier.department !== vacancy.department || earlier.closing_date) break;
      earlier.closing_date = vacancy.closing_date;
    }
  }

  return parsedVacancies.map(({ vacancy, fields, page }) => ({
    ...vacancy,
    description: buildDescription(vacancy, circular, fields, page, vacancy.extracted_details),
  }));
}
