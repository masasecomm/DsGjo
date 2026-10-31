function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getDpsaCircularSlug(value: string) {
  const circular = value.match(/\bDPSA[\s_-]+CIRCULAR[\s_-]+(\d{1,3})\s+OF\s+(20\d{2})\b/i);
  return circular
    ? `dpsa-circular-${Number(circular[1])}-of-${circular[2]}`
    : null;
}

export function parseDpsaCircularSlug(slug: string) {
  const circular = slug.match(/^dpsa-circular-(\d{1,3})-of-(20\d{2})$/);
  if (!circular) return null;
  const number = Number(circular[1]);
  if (number < 1 || number > 100) return null;
  return { number, year: Number(circular[2]) };
}

export function getJobSlug(title: string, description: string, sourceUrl = "") {
  const circularSlug = getDpsaCircularSlug(`${description} ${sourceUrl}`) ?? "dpsa-circular";
  const titleSlug = slugify(title).slice(0, 100) || "vacancy";
  return `${circularSlug}/${titleSlug}-ref`;
}
