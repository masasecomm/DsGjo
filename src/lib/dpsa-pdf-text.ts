const maxPages = 500;

export async function extractDpsaPdfText(data: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/build/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({ data });
  try {
    const document = await loadingTask.promise;
    if (document.numPages > maxPages) {
      throw new Error(`This PDF has ${document.numPages} pages. The limit is ${maxPages} pages per file.`);
    }

    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines: string[] = [`__PAGE_${pageNumber}__`];
      let currentLine = "";
      let lastY: number | null = null;

      for (const item of content.items) {
        if (!("str" in item) || !("transform" in item)) continue;
        const y = item.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = "";
        }
        currentLine += item.str + (item.str.endsWith(" ") ? "" : " ");
        lastY = y;
        if (item.hasEOL) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = "";
          lastY = null;
        }
      }

      if (currentLine.trim()) lines.push(currentLine.trim());
      pages.push(lines.join("\n"));
    }
    return pages.join("\n");
  } finally {
    await loadingTask.destroy();
  }
}
