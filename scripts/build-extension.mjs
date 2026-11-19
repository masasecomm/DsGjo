import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(root, "extension", "dist");
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: [join(root, "extension", "popup.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome120",
  outfile: join(outputDirectory, "popup.js"),
});
await copyFile(
  join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs"),
  join(outputDirectory, "pdf.worker.min.mjs"),
);
console.log("Built the unpacked Chrome extension in extension/.");
