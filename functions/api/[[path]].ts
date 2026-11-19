interface D1Result<T> {
  results: T[];
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<D1Result<T>>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1Statement;
}

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_REPOSITORY: string;
  GITHUB_BRANCH?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_HOSTNAME?: string;
  GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON?: string;
  SITE_ORIGIN?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

type JsonRecord = Record<string, unknown>;

interface PublicComment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const githubApi = "https://api.github.com";
const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

function jsonResponse(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = origin === (env.SITE_ORIGIN || "https://www.dpsagovernmentjobs.co.za")
    || /^chrome-extension:\/\/[a-p]{32}$/.test(origin)
    || /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pages\.dev$/.test(origin);
  return allowed
    ? {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    }
    : {};
}

function withCors(response: Response, request: Request, env: Env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

async function readJson(request: Request, maxBytes = 8_000_000): Promise<unknown> {
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > maxBytes) throw new Error("Request body is too large.");
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) throw new Error("Request body is too large.");
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("A valid JSON request body is required.");
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validJobSlug(value: string) {
  return value.length <= 250
    && /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(value)
    && !value.split("/").some((part) => part === "." || part === "..");
}

async function secureEqual(left: string, right: string) {
  const encode = (value: string) => new TextEncoder().encode(value);
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encode(left)),
    crypto.subtle.digest("SHA-256", encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let mismatch = 0;
  for (let index = 0; index < a.length; index++) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}

async function isAdmin(request: Request, env: Env) {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer (.+)$/)?.[1] ?? "";
  return Boolean(env.ADMIN_SECRET && token) && secureEqual(token, env.ADMIN_SECRET);
}

async function verifyTurnstile(request: Request, env: Env, token: string) {
  if (!env.TURNSTILE_SECRET_KEY) {
    throw new ApiError("Bot protection is not configured; form submissions are temporarily unavailable.", 503);
  }
  const form = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) form.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error(`Turnstile verification failed with HTTP ${response.status}.`);
  const result: unknown = await response.json();
  if (!isRecord(result) || result.success !== true) return false;
  if (env.TURNSTILE_HOSTNAME && result.hostname !== env.TURNSTILE_HOSTNAME) return false;
  return true;
}

function uuid() {
  return crypto.randomUUID();
}

function getRepository(env: Env) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY)) {
    throw new Error("GITHUB_REPOSITORY must be set as owner/repository.");
  }
  return env.GITHUB_REPOSITORY;
}

async function githubRequest<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  if (!env.GITHUB_TOKEN) throw new Error("GitHub publishing is not configured.");
  const response = await fetch(`${githubApi}${path}`, {
    ...init,
    headers: {
      ...githubHeaders,
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const message = (await response.text()).slice(0, 1000);
    throw new Error(`GitHub API returned ${response.status}: ${message}`);
  }
  return response.json() as Promise<T>;
}

interface GitHubRef {
  object: { sha: string };
}

interface GitHubCommit {
  sha: string;
  tree: { sha: string };
}

interface GitHubTree {
  tree: Array<{ path: string; sha: string; type: string }>;
  truncated?: boolean;
}

async function getGitHubJob(env: Env, slug: string) {
  const repository = getRepository(env);
  const branch = encodeURIComponent(env.GITHUB_BRANCH || "main");
  const path = `content/jobs/${slug}.json`;
  const data = await githubRequest<{ content: string; encoding: string }>(
    env,
    `/repos/${repository}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${branch}`,
  );
  if (data.encoding !== "base64") throw new Error("GitHub returned vacancy content in an unsupported encoding.");
  const decoded = atob(data.content.replace(/\n/g, ""));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(decoded, (character) => character.charCodeAt(0))));
}

async function getGitHubJobs(env: Env) {
  const repository = getRepository(env);
  const branch = encodeURIComponent(env.GITHUB_BRANCH || "main");
  const ref = await githubRequest<GitHubRef>(env, `/repos/${repository}/git/ref/heads/${branch}`);
  const commit = await githubRequest<GitHubCommit>(
    env,
    `/repos/${repository}/git/commits/${ref.object.sha}`,
  );
  const tree = await githubRequest<GitHubTree>(
    env,
    `/repos/${repository}/git/trees/${commit.tree.sha}?recursive=1`,
  );
  if (tree.truncated) throw new Error("GitHub truncated the vacancy tree; the admin list cannot be loaded completely.");
  const paths = tree.tree.filter((item) =>
    item.type === "blob" && /^content\/jobs\/[a-z0-9/-]+\.json$/.test(item.path),
  );
  return Promise.all(paths.map(async ({ sha }) => {
    const blob = await githubRequest<{ content: string; encoding: string }>(
      env,
      `/repos/${repository}/git/blobs/${sha}`,
    );
    if (blob.encoding !== "base64") throw new Error("GitHub returned vacancy content in an unsupported encoding.");
    const decoded = atob(blob.content.replace(/\n/g, ""));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(decoded, (character) => character.charCodeAt(0))));
  }));
}

function validateJob(value: unknown, index: number) {
  if (!isRecord(value)) throw new Error(`Vacancy ${index + 1} must be an object.`);
  const title = text(value.title, 250);
  const slug = text(value.slug, 250);
  const description = text(value.description, 20_000);
  const status = value.status === "draft" || value.status === "closed" || value.status === "published"
    ? value.status
    : "";
  if (title.length < 5 || !validJobSlug(slug) || description.length < 20 || !status) {
    throw new Error(`Vacancy ${index + 1} has invalid title, URL, description, or status.`);
  }
  const applicationUrl = text(value.application_url, 2048);
  if (applicationUrl && !/^https:\/\//i.test(applicationUrl)) {
    throw new Error(`Vacancy ${index + 1} must use a secure application URL.`);
  }
  const closingDate = text(value.closing_date, 10);
  if (closingDate) {
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(closingDate)
      ? new Date(`${closingDate}T00:00:00.000Z`)
      : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== closingDate) {
      throw new Error(`Vacancy ${index + 1} has an invalid closing date.`);
    }
  }
  const legacySlugs = Array.isArray(value.legacy_slugs)
    ? value.legacy_slugs.filter((slug): slug is string => typeof slug === "string" && validJobSlug(slug))
    : [];
  return {
    ...value,
    id: text(value.id, 100) || uuid(),
    title,
    slug,
    legacy_slugs: [...new Set(legacySlugs)],
    description,
    status,
    closing_date: closingDate || null,
    application_url: applicationUrl || null,
    updated_at: new Date().toISOString(),
    created_at: text(value.created_at, 40) || new Date().toISOString(),
  };
}

async function commitGitHubJobs(env: Env, jobs: JsonRecord[], removeSlugs: string[] = []) {
  const repository = getRepository(env);
  const branchName = env.GITHUB_BRANCH || "main";
  const branch = encodeURIComponent(branchName);
  const ref = await githubRequest<GitHubRef>(env, `/repos/${repository}/git/ref/heads/${branch}`);
  const commit = await githubRequest<GitHubCommit>(
    env,
    `/repos/${repository}/git/commits/${ref.object.sha}`,
  );
  const tree = await githubRequest<GitHubTree>(
    env,
    `/repos/${repository}/git/trees/${commit.tree.sha}?recursive=1`,
  );
  const existing = new Set(tree.tree.filter((item) => item.type === "blob").map((item) => item.path));
  const entries: Array<{ path: string; mode: string; type: string; content?: string; sha?: null }> = jobs.map((job) => ({
    path: `content/jobs/${job.slug}.json`,
    mode: "100644",
    type: "blob",
    content: `${JSON.stringify(job, null, 2)}\n`,
  }));
  for (const slug of removeSlugs) {
    if (!validJobSlug(slug)) throw new Error("A vacancy URL to delete is invalid.");
    const path = `content/jobs/${slug}.json`;
    if (existing.has(path)) entries.push({ path, mode: "100644", type: "blob", sha: null });
  }
  const newTree = await githubRequest<{ sha: string }>(env, `/repos/${repository}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: commit.tree.sha,
      tree: entries,
    }),
  });
  const newCommit = await githubRequest<{ sha: string }>(env, `/repos/${repository}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `Update ${jobs.length} vacancy ${jobs.length === 1 ? "page" : "pages"}`,
      tree: newTree.sha,
      parents: [ref.object.sha],
    }),
  });
  await githubRequest(env, `/repos/${repository}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });
}

function base64Url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getGoogleAccessToken(env: Env) {
  if (!env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON) {
    throw new Error("Google Indexing is not configured.");
  }
  let account: { client_email?: unknown; private_key?: unknown };
  try {
    account = JSON.parse(env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error("The Google Indexing service account configuration is invalid.");
  }
  if (typeof account.client_email !== "string" || typeof account.private_key !== "string") {
    throw new Error("The Google Indexing service account is missing required fields.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claims}`;
  const keyBytes = Uint8Array.from(
    atob(account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")),
    (character) => character.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  ));
  const assertion = `${signingInput}.${base64Url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed with HTTP ${response.status}.`);
  const result: unknown = await response.json();
  if (!isRecord(result) || typeof result.access_token !== "string") {
    throw new Error("Google did not return an access token.");
  }
  return result.access_token;
}

async function handleGoogleIndexing(env: Env, body: unknown) {
  if (!isRecord(body) || !Array.isArray(body.slugs) || body.slugs.length === 0 || body.slugs.length > 10) {
    return jsonResponse({ error: "Submit between 1 and 10 vacancy URLs per indexing request." }, 400);
  }
  const slugs = body.slugs.filter((slug): slug is string => typeof slug === "string" && validJobSlug(slug));
  if (slugs.length !== body.slugs.length) return jsonResponse({ error: "One or more vacancy URLs are invalid." }, 400);
  const siteOrigin = env.SITE_ORIGIN || "https://www.dpsagovernmentjobs.co.za";
  const response = await fetch(new URL("/job-index.json", siteOrigin));
  if (!response.ok) throw new Error(`Could not load vacancies for indexing (${response.status}).`);
  const jobs: unknown = await response.json();
  if (!Array.isArray(jobs)) throw new Error("The vacancy list returned an invalid response.");
  const selected = jobs.filter((job): job is JsonRecord =>
    isRecord(job)
    && slugs.includes(text(job.slug, 250))
    && job.status === "published"
    && (!job.closing_date || (typeof job.closing_date === "string" && job.closing_date >= new Date().toISOString().slice(0, 10)))
    && Boolean(job.location || job.province || (typeof job.description === "string" && /\bprovince\s*:/i.test(job.description))),
  );
  if (!selected.length) return jsonResponse({ submitted: 0, failed: 0, message: "No selected vacancy is currently eligible for Google indexing." });

  const accessToken = await getGoogleAccessToken(env);
  let submitted = 0;
  let failed = 0;
  for (const job of selected) {
    const url = new URL(`/${String(job.slug).split("/").map(encodeURIComponent).join("/")}`, siteOrigin).toString();
    const indexResponse = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type: "URL_UPDATED" }),
    });
    if (indexResponse.ok) submitted++;
    else {
      failed++;
      console.error("Google Indexing rejected a vacancy URL.", indexResponse.status, await indexResponse.text());
    }
  }
  return jsonResponse({ submitted, failed });
}

async function handlePublic(request: Request, env: Env, url: URL) {
  if (request.method === "GET" && url.pathname === "/api/comments") {
    const slug = url.searchParams.get("jobSlug") ?? "";
    if (!validJobSlug(slug)) return jsonResponse({ error: "A valid vacancy URL is required." }, 400);
    const { results } = await env.DB.prepare(
      "SELECT id, author_name, content, created_at FROM comments WHERE job_slug = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 100",
    ).bind(slug).all<PublicComment>();
    return jsonResponse(results, 200, { "Cache-Control": "public, max-age=60" });
  }

  if (request.method === "POST" && url.pathname === "/api/comments") {
    const body = await readJson(request);
    if (!isRecord(body)) return jsonResponse({ error: "Invalid comment details." }, 400);
    const jobSlug = text(body.jobSlug, 250);
    const authorName = text(body.authorName, 80);
    const content = text(body.content, 2000);
    if (!validJobSlug(jobSlug) || authorName.length < 2 || content.length < 2) {
      return jsonResponse({ error: "Enter a valid vacancy, name, and comment." }, 400);
    }
    if (!await verifyTurnstile(request, env, text(body.turnstileToken, 4096))) {
      return jsonResponse({ error: "Please complete the security check and try again." }, 400);
    }
    await env.DB.prepare(
      "INSERT INTO comments (id, job_slug, author_name, content, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
    ).bind(uuid(), jobSlug, authorName, content, new Date().toISOString()).run();
    return jsonResponse({ message: "Thanks. Your comment has been sent for review." }, 201);
  }

  if (request.method === "POST" && url.pathname === "/api/subscribers") {
    const body = await readJson(request);
    if (!isRecord(body)) return jsonResponse({ error: "Invalid signup details." }, 400);
    const name = text(body.name, 80);
    const email = text(body.email, 254).toLowerCase();
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true) {
      return jsonResponse({ error: "Enter a valid name and email address, and agree to the privacy policy." }, 400);
    }
    if (!await verifyTurnstile(request, env, text(body.turnstileToken, 4096))) {
      return jsonResponse({ error: "Please complete the security check and try again." }, 400);
    }
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO job_alert_subscribers (id, name, email, status, consent_at, created_at) VALUES (?, ?, ?, 'active', ?, ?) ON CONFLICT(email) DO NOTHING",
    ).bind(uuid(), name, email, now, now).run();
    return jsonResponse({ message: "You’re on the list. Email alerts will start once notifications are enabled." }, 201);
  }

  if (request.method === "POST" && url.pathname === "/api/analytics/page-view") {
    const body = await readJson(request, 10_000);
    const pagePath = isRecord(body) ? text(body.pagePath, 200) : "";
    if (!pagePath.startsWith("/") || pagePath.startsWith("//")) {
      return jsonResponse({ error: "A valid page path is required." }, 400);
    }
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
    await env.DB.prepare(
      "INSERT INTO page_view_counts (page_path, view_date, view_count) VALUES (?, ?, 1) ON CONFLICT(page_path, view_date) DO UPDATE SET view_count = view_count + 1",
    ).bind(pagePath, day).run();
    return jsonResponse({ recorded: true });
  }

  if (request.method === "POST" && url.pathname === "/api/analytics/search") {
    const body = await readJson(request, 10_000);
    const searchTerm = isRecord(body) ? text(body.searchTerm, 80).replace(/\s+/g, " ") : "";
    if (searchTerm.length < 2 || /[^\s@]+@[^\s@]+\.[^\s@]+/.test(searchTerm)) {
      return jsonResponse({ error: "A valid search term is required." }, 400);
    }
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
    await env.DB.prepare(
      "INSERT INTO popular_job_searches (search_date, search_term, search_count) VALUES (?, ?, 1) ON CONFLICT(search_date, search_term) DO UPDATE SET search_count = search_count + 1",
    ).bind(day, searchTerm).run();
    return jsonResponse({ recorded: true });
  }

  if (request.method === "GET" && url.pathname === "/api/public/popular-searches") {
    const { results } = await env.DB.prepare(
      "SELECT search_term, SUM(search_count) AS search_count FROM popular_job_searches WHERE search_date >= date('now', '-30 days') GROUP BY search_term ORDER BY search_count DESC LIMIT 6",
    ).all<{ search_term: string; search_count: number }>();
    return jsonResponse(results);
  }

  return jsonResponse({ error: "Not found." }, 404);
}

async function handleAdmin(request: Request, env: Env, url: URL) {
  if (!await isAdmin(request, env)) return jsonResponse({ error: "Admin authentication failed." }, 401);

  if (request.method === "GET" && url.pathname === "/api/admin/jobs") {
    const [publicJobs, { results: drafts }] = await Promise.all([
      getGitHubJobs(env),
      env.DB.prepare("SELECT slug, job_json FROM draft_jobs ORDER BY updated_at DESC LIMIT 1000").all<{ slug: string; job_json: string }>(),
    ]);
    const parsedDrafts = drafts.map(({ job_json }) => JSON.parse(job_json) as unknown);
    return jsonResponse([...publicJobs, ...parsedDrafts]);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/indexing") {
    return handleGoogleIndexing(env, await readJson(request, 10_000));
  }

  if (request.method === "GET" && url.pathname === "/api/admin/job") {
    const slug = url.searchParams.get("slug") ?? "";
    if (!validJobSlug(slug)) return jsonResponse({ error: "A valid vacancy URL is required." }, 400);
    return jsonResponse(await getGitHubJob(env, slug));
  }

  if (request.method === "POST" && url.pathname === "/api/admin/jobs") {
    const body = await readJson(request);
    const rawJobs = isRecord(body) ? body.jobs : body;
    if (!Array.isArray(rawJobs) || rawJobs.length === 0 || rawJobs.length > 100) {
      return jsonResponse({ error: "Submit between 1 and 100 vacancies in each update." }, 400);
    }
    const jobs = rawJobs.map(validateJob);
    if (new Set(jobs.map((job) => job.slug)).size !== jobs.length) {
      return jsonResponse({ error: "Each vacancy in an update must have a unique URL." }, 400);
    }
    const published = jobs.filter((job) => job.status === "published");
    const unpublished = jobs.filter((job) => job.status !== "published");
    if (published.length) await commitGitHubJobs(env, published, unpublished.map((job) => job.slug));
    if (unpublished.length) {
      const statements = unpublished.map((job) =>
        env.DB.prepare(
          "INSERT INTO draft_jobs (slug, status, job_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET status = excluded.status, job_json = excluded.job_json, updated_at = excluded.updated_at",
        ).bind(job.slug, job.status, JSON.stringify(job), job.updated_at),
      );
      await Promise.all(statements.map((statement) => statement.run()));
    }
    if (published.length) {
      const statements = published.map((job) => env.DB.prepare("DELETE FROM draft_jobs WHERE slug = ?").bind(job.slug));
      await Promise.all(statements.map((statement) => statement.run()));
    }
    return jsonResponse({ saved: jobs.length, message: "Vacancy changes were saved." }, 201);
  }

  if (request.method === "DELETE" && url.pathname === "/api/admin/jobs") {
    const slug = url.searchParams.get("slug") ?? "";
    if (!validJobSlug(slug)) return jsonResponse({ error: "A valid vacancy URL is required." }, 400);
    await commitGitHubJobs(env, [], [slug]);
    await env.DB.prepare("DELETE FROM draft_jobs WHERE slug = ?").bind(slug).run();
    return jsonResponse({ deleted: true });
  }

  if (url.pathname === "/api/admin/comments" && request.method === "GET") {
    const status = url.searchParams.get("status") === "approved" ? "approved"
      : url.searchParams.get("status") === "rejected" ? "rejected"
        : "pending";
    const { results } = await env.DB.prepare(
      "SELECT id, job_slug, author_name, content, status, created_at FROM comments WHERE status = ? ORDER BY created_at DESC LIMIT 500",
    ).bind(status).all();
    return jsonResponse(results);
  }

  if (url.pathname === "/api/admin/comments" && request.method === "PATCH") {
    const body = await readJson(request, 10_000);
    const id = isRecord(body) ? text(body.id, 80) : "";
    const status = isRecord(body) ? body.status : null;
    if (!id || (status !== "approved" && status !== "rejected")) {
      return jsonResponse({ error: "Invalid comment moderation request." }, 400);
    }
    await env.DB.prepare("UPDATE comments SET status = ? WHERE id = ?").bind(status, id).run();
    return jsonResponse({ updated: true });
  }

  if (url.pathname === "/api/admin/comments" && request.method === "DELETE") {
    const id = url.searchParams.get("id") ?? "";
    if (!id) return jsonResponse({ error: "A comment ID is required." }, 400);
    await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
    return jsonResponse({ deleted: true });
  }

  if (url.pathname === "/api/admin/subscribers" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, name, email, status, consent_at, created_at FROM job_alert_subscribers ORDER BY created_at DESC LIMIT 5000",
    ).all();
    return jsonResponse(results);
  }

  if (url.pathname === "/api/admin/subscribers" && request.method === "PATCH") {
    const body = await readJson(request, 10_000);
    const id = isRecord(body) ? text(body.id, 80) : "";
    const status = isRecord(body) ? body.status : null;
    if (!id || (status !== "active" && status !== "unsubscribed")) {
      return jsonResponse({ error: "Invalid subscriber status update." }, 400);
    }
    await env.DB.prepare("UPDATE job_alert_subscribers SET status = ? WHERE id = ?").bind(status, id).run();
    return jsonResponse({ updated: true });
  }

  return jsonResponse({ error: "Not found." }, 404);
}

export async function onRequest({ request, env }: PagesContext) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }), request, env);
  }
  try {
    const response = url.pathname.startsWith("/api/admin/")
      ? await handleAdmin(request, env, url)
      : await handlePublic(request, env, url);
    return withCors(response, request, env);
  } catch (error) {
    console.error("Cloudflare API request failed.", error);
    const message = error instanceof Error ? error.message : "The request could not be completed.";
    const status = error instanceof ApiError ? error.status : 500;
    return withCors(jsonResponse({ error: message }, status), request, env);
  }
}
