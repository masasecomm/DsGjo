import { buildDpsaCircularPdfUrl } from "@/lib/dpsa-circular-discovery";
import { dpsaBrowserRequestHeaders } from "@/lib/dpsa-circular-discovery-server";
import { requireAdmin } from "@/lib/admin";

const maxFileSize = 25 * 1024 * 1024;
const downloadTimeoutMs = 90_000;

export const maxDuration = 120;

export async function GET(
  _request: Request,
  context: { params: Promise<{ year: string; number: string }> },
) {
  await requireAdmin();
  const { year: yearValue, number: numberValue } = await context.params;
  const year = /^\d{4}$/.test(yearValue) ? Number(yearValue) : 0;
  const number = /^\d{1,3}$/.test(numberValue) ? Number(numberValue) : 0;
  if (
    year < 2000 ||
    year > new Date().getUTCFullYear() + 1 ||
    number < 1 ||
    number > 100
  ) {
    return Response.json({ error: "Invalid circular number or year." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(buildDpsaCircularPdfUrl(year, number), {
      cache: "no-store",
      redirect: "follow",
      headers: dpsaBrowserRequestHeaders(
        `https://www.dpsa.gov.za/newsroom/psvc/circular-${number}-of-${year}/`,
        "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
      ),
      signal: AbortSignal.timeout(downloadTimeoutMs),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Could not fetch an official DPSA circular.", error.message);
      const timedOut = error.name === "TimeoutError";
      return Response.json(
        {
          error: timedOut
            ? "The official DPSA PDF download took too long. Please try again."
            : "Could not download the DPSA circular. Please try again later.",
        },
        { status: timedOut ? 504 : 502 },
      );
    }
    throw error;
  }

  if (upstream.status === 404) {
    return Response.json({ error: "The official DPSA PDF for this circular is not available." }, { status: 404 });
  }
  if (!upstream.ok) {
    return Response.json({ error: `The DPSA PDF server returned HTTP ${upstream.status}.` }, { status: 502 });
  }
  const contentLength = Number(upstream.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxFileSize) {
    return Response.json({ error: "This DPSA circular exceeds the 25 MB import limit." }, { status: 413 });
  }
  const reader = upstream.body?.getReader();
  if (!reader) {
    return Response.json({ error: "The official DPSA circular returned an empty file." }, { status: 502 });
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxFileSize) {
        try {
          await reader.cancel();
        } catch (error) {
          console.error(`Could not cancel oversized DPSA PDF stream (${year}-${number}).`, error);
        }
        return Response.json({ error: "This DPSA circular exceeds the 25 MB import limit." }, { status: 413 });
      }
      chunks.push(value);
    }
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    console.error(`Could not read DPSA PDF stream (${year}-${number}).`, error);
    return Response.json(
      {
        error: timedOut
          ? "The official DPSA PDF download took too long. Please try again."
          : "The official DPSA PDF download was interrupted. Please try again.",
      },
      { status: timedOut ? 504 : 502 },
    );
  }

  const pdf = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const contentType = upstream.headers.get("content-type")?.toLowerCase() ?? "";
  const hasPdfSignature = new TextDecoder().decode(pdf.subarray(0, 4)) === "%PDF";
  if (!hasPdfSignature && !contentType.includes("pdf")) {
    return Response.json({ error: "The official DPSA circular did not return a PDF file." }, { status: 502 });
  }

  return new Response(pdf, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": String(pdf.byteLength),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
