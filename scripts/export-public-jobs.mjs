import { createClient } from "@supabase/supabase-js";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceEnv = resolve(root, ".env.local");
const envText = await import("node:fs/promises").then(({ readFile }) => readFile(sourceEnv, "utf8"));

for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  const value = match[2].replace(/^(['"])(.*)\1$/, "$2").replace(/\s+#.*$/, "");
  process.env[match[1]] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const jobs = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .range(offset, offset + 999);
  if (error) throw new Error(`Could not export public vacancies: ${error.message}`);
  jobs.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

const outputDirectory = join(root, "content", "jobs");
await mkdir(outputDirectory, { recursive: true });
const exportedFiles = new Set();

for (const job of jobs) {
  if (
    typeof job.slug !== "string"
    || !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(job.slug)
    || job.slug.split("/").some((part) => part === "." || part === "..")
  ) {
    throw new Error(`Vacancy ${String(job.id)} has an unsafe URL slug and was not exported.`);
  }
  const filePath = join(outputDirectory, `${job.slug}.json`);
  if (exportedFiles.has(filePath)) {
    throw new Error(`More than one published vacancy uses the slug "${job.slug}".`);
  }
  exportedFiles.add(filePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(job, null, 2)}\n`, "utf8");
}

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

for (const filePath of await collectJsonFiles(outputDirectory)) {
  if (!exportedFiles.has(filePath)) await unlink(filePath);
}

console.log(`Exported ${jobs.length} published vacancies to content/jobs/.`);
console.log("This export intentionally excludes comments, subscriber details, and other personal data.");
