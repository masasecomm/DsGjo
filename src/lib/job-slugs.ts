function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getJobSlug(
  title: string,
  description: string,
  referenceNumber: string | null | undefined,
  uniqueSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8),
) {
  const circular = description.match(/\bDPSA[\s_-]+CIRCULAR[\s_-]+(\d{1,3})\s+OF\s+(20\d{2})\b/i);
  const circularSlug = circular
    ? `dpsa-circular-${Number(circular[1])}-of-${circular[2]}`
    : "dpsa-circular";
  const titleSlug = slugify(title).slice(0, 100) || "vacancy";
  const reference = referenceNumber?.trim()
    || description.match(/\b(?:reference(?:\s+number)?|ref\.?(?:\s*(?:no\.?|number))?)\s*[:.\u2013\u2014-]\s*([^\r\n•]+)/i)?.[1]?.trim()
    || "";
  const referenceSlug = slugify(reference).slice(0, 60);
  const uniquePart = referenceSlug ? `ref-${referenceSlug}` : uniqueSuffix;

  return `${circularSlug}/${titleSlug}-${uniquePart}`;
}
