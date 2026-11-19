import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = await readFile(join(root, ".env.local"), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2").replace(/\s+#.*$/, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function loadTable(table, select) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from(table).select(select).range(offset, offset + 999);
    if (error) throw new Error(`Could not export ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

const jobs = await loadTable("jobs", "*");
const jobSlugById = new Map(jobs.map((job) => [job.id, job.slug]));
const comments = await loadTable("comments", "id,job_id,author_name,content,status,created_at");
const subscribers = await loadTable(
  "job_alert_subscribers",
  "id,name,email,status,consent_at,created_at",
);
const statements = [];

for (const job of jobs) {
  if (job.status === "published") continue;
  statements.push(
    `INSERT INTO draft_jobs (slug, status, job_json, updated_at) VALUES (${sql(job.slug)}, ${sql(job.status)}, ${sql(JSON.stringify(job))}, ${sql(job.updated_at)}) ON CONFLICT(slug) DO UPDATE SET status = excluded.status, job_json = excluded.job_json, updated_at = excluded.updated_at;`,
  );
}

for (const comment of comments) {
  const jobSlug = jobSlugById.get(comment.job_id);
  if (!jobSlug) continue;
  statements.push(
    `INSERT INTO comments (id, job_slug, author_name, content, status, created_at) VALUES (${sql(comment.id)}, ${sql(jobSlug)}, ${sql(comment.author_name)}, ${sql(comment.content)}, ${sql(comment.status)}, ${sql(comment.created_at)}) ON CONFLICT(id) DO NOTHING;`,
  );
}

for (const subscriber of subscribers) {
  statements.push(
    `INSERT INTO job_alert_subscribers (id, name, email, status, consent_at, created_at) VALUES (${sql(subscriber.id)}, ${sql(subscriber.name)}, ${sql(subscriber.email)}, ${sql(subscriber.status)}, ${sql(subscriber.consent_at)}, ${sql(subscriber.created_at)}) ON CONFLICT(email) DO NOTHING;`,
  );
}

const outputDirectory = join(root, "migration-private");
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  join(outputDirectory, "cloudflare-data.sql"),
  `BEGIN TRANSACTION;\n${statements.join("\n")}\nCOMMIT;\n`,
  { encoding: "utf8", mode: 0o600 },
);
console.log(`Exported ${jobs.length} jobs, ${comments.length} comments, and ${subscribers.length} subscribers.`);
console.log("Private migration SQL was written to ignored folder migration-private/; do not commit or share it.");
