export type DpsaCircular = {
  year: number;
  number: number;
  label: string;
  postingDate: string;
  listingUrl: string;
  pdfUrl: string;
};

const listingUrl = "https://www.dpsa.gov.za/newsroom/psvc/";
const monthNumbers: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

export function buildDpsaCircularPdfUrl(year: number, number: number) {
  return `https://www.dpsa.gov.za/dpsa2g/documents/vacancies/${year}/PSV%20CIRCULAR%20${number}%20of%20${year}.pdf`;
}

export function parseDpsaCircularListing(html: string): DpsaCircular[] {
  const circulars = new Map<string, DpsaCircular>();
  const hrefPattern = /\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;

  for (const match of html.matchAll(hrefPattern)) {
    const href = match[1] ?? match[2] ?? match[3];
    if (!href) continue;

    let url: URL;
    try {
      url = new URL(href, listingUrl);
    } catch {
      continue;
    }
    if (url.origin !== "https://www.dpsa.gov.za") continue;

    const circularMatch = url.pathname.match(/^\/newsroom\/psvc\/circular-(\d+)-of-(\d+)\/?$/i);
    if (!circularMatch) continue;

    const number = Number(circularMatch[1]);
    const year = Number(circularMatch[2]);
    if (!Number.isInteger(number) || number < 1 || number > 100) continue;
    if (!Number.isInteger(year) || year < 2000 || year > new Date().getUTCFullYear() + 1) continue;

    const key = `${year}-${number}`;
    circulars.set(key, {
      year,
      number,
      label: `Circular ${number} of ${year}`,
      postingDate: "",
      listingUrl: url.href,
      pdfUrl: buildDpsaCircularPdfUrl(year, number),
    });
  }

  return [...circulars.values()].sort((left, right) =>
    right.year - left.year || right.number - left.number,
  );
}

export function parseDpsaCircularPostingDate(html: string) {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ");
  const match = text.match(/\bPosting\s+Date\s*:\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/i);
  if (!match) return null;

  const day = match[1].padStart(2, "0");
  const month = monthNumbers[match[2].toLowerCase()];
  const year = match[3];
  if (!month) return null;
  const date = `${year}-${month}-${day}`;
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date
    ? null
    : date;
}
