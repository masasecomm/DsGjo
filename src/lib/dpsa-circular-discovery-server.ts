import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  parseDpsaCircularListing,
  parseDpsaCircularPostingDate,
} from "@/lib/dpsa-circular-discovery";

const browserUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function dpsaBrowserRequestHeaders(referer: string, accept: string) {
  return {
    "Accept": accept,
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": referer,
    "User-Agent": browserUserAgent,
  };
}

async function readLimitedText(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The DPSA circular listing returned an empty response.");

  const decoder = new TextDecoder();
  let text = "";
  let bytesRead = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      await reader.cancel();
      throw new Error("The DPSA circular listing is larger than expected.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function getRecentDpsaCirculars(supabase: SupabaseClient<Database>) {
  let response: Response;
  try {
    response = await fetch("https://www.dpsa.gov.za/newsroom/psvc/", {
      cache: "no-store",
      redirect: "error",
      headers: dpsaBrowserRequestHeaders(
        "https://www.dpsa.gov.za/",
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Could not reach the official DPSA circular listing: ${error.message}`);
    }
    throw error;
  }
  if (!response.ok) {
    throw new Error(`The official DPSA circular listing returned HTTP ${response.status}.`);
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 2_000_000) {
    throw new Error("The DPSA circular listing is larger than expected.");
  }
  const candidates = parseDpsaCircularListing(await readLimitedText(response, 2_000_000));
  if (candidates.length === 0) {
    throw new Error("No vacancy circulars were found on the official DPSA listing.");
  }

  const years = [...new Set(candidates.map((circular) => circular.year))];
  const { data: imported, error } = await supabase
    .from("imported_dpsa_circulars")
    .select("year,circular_number")
    .in("year", years);
  if (error) {
    throw new Error(`Could not check which DPSA circulars were imported. Apply the circular-tracking database migration, then try again. ${error.message}`);
  }

  const importedKeys = new Set((imported ?? []).map(({ year, circular_number }) => `${year}-${circular_number}`));
  const unimported = candidates
    .filter((circular) => !importedKeys.has(`${circular.year}-${circular.number}`))
    .slice(0, 5);
  const circulars = await Promise.all(unimported.map(async (circular) => {
    let detailResponse: Response;
    try {
      detailResponse = await fetch(circular.listingUrl, {
        cache: "no-store",
        redirect: "error",
        headers: dpsaBrowserRequestHeaders(
          "https://www.dpsa.gov.za/newsroom/psvc/",
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ),
        signal: AbortSignal.timeout(12_000),
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Could not load the DPSA posting date for ${circular.label}: ${error.message}`);
      }
      throw error;
    }
    if (!detailResponse.ok) {
      throw new Error(`The DPSA detail page for ${circular.label} returned HTTP ${detailResponse.status}.`);
    }
    const detailLength = Number(detailResponse.headers.get("content-length"));
    if (Number.isFinite(detailLength) && detailLength > 1_000_000) {
      throw new Error(`The DPSA detail page for ${circular.label} is larger than expected.`);
    }
    const postingDate = parseDpsaCircularPostingDate(await readLimitedText(detailResponse, 1_000_000));
    if (!postingDate) {
      throw new Error(`Could not find a valid posting date for ${circular.label} on its official DPSA detail page.`);
    }
    return { ...circular, postingDate };
  }));

  return {
    circulars,
    checkedAt: new Date().toISOString(),
  };
}
