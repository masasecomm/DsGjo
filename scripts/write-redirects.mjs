import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDirectory = join(root, "content", "jobs");
const pathsFile = join(root, "src", "lib", "clicked-legacy-paths.ts");
const redirectMap = new Map();
const currentSlugs = new Set();
const validSlug = (slug) =>
  typeof slug === "string"
  && /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(slug)
  && !slug.split("/").some((part) => part === "." || part === "..");

async function collectJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectJsonFiles(filePath));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(filePath);
  }
  return files;
}

for (const filePath of await collectJsonFiles(contentDirectory)) {
  const job = JSON.parse(await readFile(filePath, "utf8"));
  if (!validSlug(job.slug) || !Array.isArray(job.legacy_slugs)) {
    throw new Error(`Invalid vacancy redirect data in ${relative(root, filePath)}.`);
  }
  currentSlugs.add(`/${job.slug}`);
  for (const oldSlug of job.legacy_slugs) {
    if (oldSlug !== job.slug && !validSlug(oldSlug)) {
      throw new Error(`Invalid legacy vacancy slug in ${relative(root, filePath)}.`);
    }
    if (oldSlug !== job.slug) {
      redirectMap.set(`/${oldSlug}`, `/${job.slug}`);
    }
  }
}

const legacyPathSource = await readFile(pathsFile, "utf8");
for (const match of legacyPathSource.matchAll(/"([^"]+)"/g)) {
  if (!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(match[1])) {
    throw new Error(`Invalid clicked legacy path "${match[1]}".`);
  }
  if (
    match[1].startsWith("/")
    && !currentSlugs.has(match[1])
    && !redirectMap.has(match[1])
  ) {
    redirectMap.set(match[1], "/jobs");
  }
}

if (redirectMap.size > 2000) {
  throw new Error(`Cloudflare Pages supports at most 2,000 static redirects; ${redirectMap.size} were generated.`);
}

const redirects = [...redirectMap.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([source, destination]) => `${source} ${destination} 301`)
  .join("\n");
await writeFile(join(root, "public", "_redirects"), `${redirects}\n`, "utf8");
console.log(`Wrote ${redirectMap.size} legacy redirects to public/_redirects.`);
