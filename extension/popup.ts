import { parseDpsaCircularText, type ParsedVacancy } from "../src/lib/dpsa-circular-parser";
import { extractDpsaPdfText } from "../src/lib/dpsa-pdf-text";
import { getJobSlug } from "../src/lib/job-slugs";

declare const chrome: {
  runtime: { getURL(path: string): string };
  storage: {
    session: {
      get(keys: string | string[]): Promise<Record<string, unknown>>;
      set(values: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };
  };
};

type ImportRow = ParsedVacancy & { included: boolean; status: "draft" | "published" };
type JobRecord = Record<string, unknown> & {
  id: string;
  slug: string;
  title: string;
  department?: string | null;
  status: "draft" | "published" | "closed";
  description: string;
};
type AdminComment = {
  id: string;
  job_slug: string;
  author_name: string;
  content: string;
  created_at: string;
};
type Subscriber = {
  id: string;
  name: string | null;
  email: string;
  status: "active" | "unsubscribed";
};

const elements = {
  apiOrigin: document.querySelector<HTMLInputElement>("#api-origin")!,
  token: document.querySelector<HTMLInputElement>("#admin-secret")!,
  status: document.querySelector<HTMLParagraphElement>("#status")!,
  fileInput: document.querySelector<HTMLInputElement>("#circular-files")!,
  parseButton: document.querySelector<HTMLButtonElement>("#parse-button")!,
  importRows: document.querySelector<HTMLDivElement>("#import-rows")!,
  saveImport: document.querySelector<HTMLButtonElement>("#save-import-button")!,
  jobs: document.querySelector<HTMLDivElement>("#job-list")!,
  jobFilter: document.querySelector<HTMLInputElement>("#job-filter")!,
  comments: document.querySelector<HTMLDivElement>("#comment-list")!,
  subscribers: document.querySelector<HTMLDivElement>("#subscriber-list")!,
  editor: document.querySelector<HTMLDialogElement>("#job-editor")!,
  editorForm: document.querySelector<HTMLFormElement>("#job-edit-form")!,
};

let adminSecret = "";
let apiRoot = "https://www.dpsagovernmentjobs.co.za";
let importRows: ImportRow[] = [];
let currentJobs: JobRecord[] = [];

function showStatus(message: string, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!adminSecret) throw new Error("Connect using the admin access key first.");
  const response = await fetch(`${apiRoot}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${adminSecret}`,
      ...init.headers,
    },
  });
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(`The server returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
      ? result.error
      : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return result as T;
}

async function parseCirculars() {
  const files = Array.from(elements.fileInput.files ?? []);
  if (!files.length) throw new Error("Choose one or more DPSA circular PDF files first.");
  if (files.length > 10) throw new Error("Choose no more than 10 PDFs at a time.");
  if (files.reduce((total, file) => total + file.size, 0) > 50 * 1024 * 1024) {
    throw new Error("The selected PDFs exceed the 50 MB total limit.");
  }
  const parsedRows: ImportRow[] = [];
  const problems: string[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size > 25 * 1024 * 1024) {
      problems.push(`${file.name}: select a PDF smaller than 25 MB.`);
      continue;
    }
    try {
      const sourceText = await extractDpsaPdfText(
        new Uint8Array(await file.arrayBuffer()),
        chrome.runtime.getURL("dist/pdf.worker.min.mjs"),
      );
      const parsed = parseDpsaCircularText(sourceText);
      if (!parsed.length) {
        problems.push(`${file.name}: no selectable “POST” entries were found.`);
        continue;
      }
      parsedRows.push(...parsed.map((vacancy) => ({ ...vacancy, included: true, status: "draft" as const })));
    } catch (error) {
      problems.push(`${file.name}: ${error instanceof Error ? error.message : "The PDF could not be read."}`);
    }
  }
  importRows = parsedRows;
  renderImportRows();
  if (problems.length && !parsedRows.length) throw new Error(problems.join(" "));
  showStatus(`${parsedRows.length} vacancy entries parsed.${problems.length ? ` Issues: ${problems.join(" ")}` : ""}`, Boolean(problems.length));
}

function renderImportRows() {
  elements.importRows.innerHTML = importRows.map((row, index) => `
    <article class="import-row">
      <label class="include-row"><input data-index="${index}" data-field="included" type="checkbox" ${row.included ? "checked" : ""}> Include this vacancy</label>
      <h3>${escapeHtml(row.title || `Vacancy ${index + 1}`)}</h3>
      <div class="import-fields">
        <label>Job title<input data-index="${index}" data-field="title" value="${escapeHtml(row.title)}"></label>
        <label>Department<input data-index="${index}" data-field="department" value="${escapeHtml(row.department)}"></label>
        <label>Location<input data-index="${index}" data-field="location" value="${escapeHtml(row.location)}"></label>
        <label>Closing date<input data-index="${index}" data-field="closing_date" type="date" value="${escapeHtml(row.closing_date)}"></label>
        <label>Application link<input data-index="${index}" data-field="application_url" value="${escapeHtml(row.application_url)}"></label>
        <label>Save as<select data-index="${index}" data-field="status">
          <option value="draft" ${row.status === "draft" ? "selected" : ""}>Draft</option>
          <option value="published" ${row.status === "published" ? "selected" : ""}>Publish</option>
        </select></label>
      </div>
      <p class="muted">${escapeHtml(row.reference_number || row.post_number)}</p>
    </article>
  `).join("");
  const count = importRows.filter((row) => row.included).length;
  elements.saveImport.disabled = count === 0;
  elements.saveImport.textContent = `Save ${count} selected vacancies`;
}

function mapImportRow(row: ImportRow): JobRecord {
  const now = new Date().toISOString();
  const slug = getJobSlug(row.title, row.description, row.source_url, row.post_number || row.reference_number);
  return {
    id: crypto.randomUUID(),
    title: row.title.trim(),
    slug,
    legacy_slugs: [],
    department: row.department || null,
    location: row.location || null,
    closing_date: row.closing_date || null,
    reference_number: row.reference_number || null,
    province: row.province || null,
    employment_type: row.employment_type,
    salary_text: row.salary || null,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    salary_currency: row.salary_currency,
    job_level: row.level || null,
    dpsa_post_number: row.post_number || null,
    source_url: row.source_url || null,
    source_published_at: row.source_published_at || null,
    structured_details: row.extracted_details,
    description: row.description,
    application_url: row.application_url || null,
    status: row.status,
    created_at: now,
    updated_at: now,
  };
}

async function saveImported() {
  const jobs = importRows.filter((row) => row.included).map(mapImportRow);
  if (!jobs.length) throw new Error("Select at least one vacancy to save.");
  const slugs = new Set<string>();
  for (const job of jobs) {
    if (slugs.has(job.slug)) {
      throw new Error(`More than one selected vacancy has the URL “${job.slug}”. Exclude one entry before saving.`);
    }
    slugs.add(job.slug);
  }
  let saved = 0;
  for (let offset = 0; offset < jobs.length; offset += 100) {
    const batch = jobs.slice(offset, offset + 100);
    await api("/api/admin/jobs", {
      method: "POST",
      body: JSON.stringify({ jobs: batch }),
    });
    saved += batch.length;
    showStatus(`Saved ${saved} of ${jobs.length} vacancies.`);
  }
  importRows = [];
  renderImportRows();
  elements.fileInput.value = "";
  showStatus(`${saved} vacancy changes were saved. Published pages will appear after the site build completes.`);
}

async function loadJobs() {
  const jobs = await api<JobRecord[]>("/api/admin/jobs");
  if (!Array.isArray(jobs)) throw new Error("The vacancy list returned an invalid response.");
  currentJobs = jobs;
  renderJobs();
}

function renderJobs() {
  const filter = elements.jobFilter.value.trim().toLowerCase();
  const visible = currentJobs.filter((job) =>
    `${job.title} ${job.department ?? ""}`.toLowerCase().includes(filter),
  );
  elements.jobs.innerHTML = visible.slice(0, 300).map((job) => `
    <article class="job-row">
      <h3>${escapeHtml(job.title)}</h3>
      <p class="muted">${escapeHtml(job.department || "No department")} · ${escapeHtml(job.status)}</p>
      <div class="row-actions">
        <button data-action="edit-job" data-slug="${escapeHtml(job.slug)}" type="button">Edit</button>
        <button data-action="toggle-job" data-slug="${escapeHtml(job.slug)}" type="button">${job.status === "published" ? "Unpublish" : "Publish"}</button>
        ${job.status === "published" ? `<button data-action="index-job" data-slug="${escapeHtml(job.slug)}" type="button">Request indexing</button>` : ""}
        <button data-action="delete-job" data-slug="${escapeHtml(job.slug)}" type="button">Delete</button>
      </div>
    </article>
  `).join("") || "<p>No vacancies found.</p>";
  if (visible.length > 300) showStatus(`Showing the first 300 of ${visible.length} vacancies.`);
}

async function editJob(slug: string) {
  const job = currentJobs.find((entry) => entry.slug === slug);
  if (!job) throw new Error("That vacancy is no longer in the list.");
  const form = elements.editorForm;
  for (const field of ["slug", "title", "department", "location", "closing_date", "application_url", "status", "description"]) {
    const input = form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (input) input.value = String(job[field] ?? "");
  }
  elements.editor.showModal();
}

async function saveJobEdit(event: SubmitEvent) {
  event.preventDefault();
  const formData = new FormData(elements.editorForm);
  const slug = String(formData.get("slug") ?? "");
  const job = currentJobs.find((entry) => entry.slug === slug);
  if (!job) throw new Error("That vacancy is no longer in the list.");
  const updated = {
    ...job,
    title: String(formData.get("title") ?? ""),
    department: String(formData.get("department") ?? ""),
    location: String(formData.get("location") ?? ""),
    closing_date: String(formData.get("closing_date") ?? "") || null,
    application_url: String(formData.get("application_url") ?? "") || null,
    status: String(formData.get("status") ?? "draft"),
    description: String(formData.get("description") ?? ""),
    updated_at: new Date().toISOString(),
  };
  await api("/api/admin/jobs", { method: "POST", body: JSON.stringify({ jobs: [updated] }) });
  elements.editor.close();
  await loadJobs();
  showStatus("Vacancy saved.");
}

async function handleJobAction(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const slug = target.dataset.slug;
  if (!slug) return;
  const job = currentJobs.find((entry) => entry.slug === slug);
  if (!job) throw new Error("That vacancy is no longer in the list.");
  if (target.dataset.action === "edit-job") return editJob(slug);
  if (target.dataset.action === "toggle-job") {
    const updated = { ...job, status: job.status === "published" ? "draft" : "published", updated_at: new Date().toISOString() };
    await api("/api/admin/jobs", { method: "POST", body: JSON.stringify({ jobs: [updated] }) });
    await loadJobs();
    return showStatus("Vacancy status updated.");
  }
  if (target.dataset.action === "delete-job") {
    if (!confirm(`Permanently delete “${job.title}”?`)) return;
    await api(`/api/admin/jobs?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
    await loadJobs();
    return showStatus("Vacancy deleted.");
  }
  if (target.dataset.action === "index-job") {
    const result = await api<{ submitted: number; failed: number; message?: string }>("/api/admin/indexing", {
      method: "POST",
      body: JSON.stringify({ slugs: [slug] }),
    });
    return showStatus(result.message || `Google indexing requests: ${result.submitted} submitted, ${result.failed} failed.`);
  }
}

async function loadComments() {
  const comments = await api<AdminComment[]>("/api/admin/comments?status=pending");
  if (!Array.isArray(comments)) throw new Error("The comment list returned an invalid response.");
  elements.comments.innerHTML = comments.map((comment) => `
    <article class="comment-row">
      <h3>${escapeHtml(comment.author_name)}</h3>
      <p>${escapeHtml(comment.content)}</p>
      <p class="muted">/${escapeHtml(comment.job_slug)}</p>
      <div class="row-actions">
        <button data-action="comment-status" data-id="${escapeHtml(comment.id)}" data-status="approved" type="button">Approve</button>
        <button data-action="comment-status" data-id="${escapeHtml(comment.id)}" data-status="rejected" type="button">Reject</button>
        <button data-action="delete-comment" data-id="${escapeHtml(comment.id)}" type="button">Delete</button>
      </div>
    </article>
  `).join("") || "<p>No comments need review.</p>";
}

async function handleCommentAction(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.id) return;
  if (target.dataset.action === "delete-comment" && !confirm("Permanently delete this comment?")) return;
  if (target.dataset.action === "delete-comment") {
    await api(`/api/admin/comments?id=${encodeURIComponent(target.dataset.id)}`, { method: "DELETE" });
  } else {
    await api("/api/admin/comments", {
      method: "PATCH",
      body: JSON.stringify({ id: target.dataset.id, status: target.dataset.status }),
    });
  }
  await loadComments();
  showStatus("Comment moderation saved.");
}

async function loadSubscribers() {
  const subscribers = await api<Subscriber[]>("/api/admin/subscribers");
  if (!Array.isArray(subscribers)) throw new Error("The subscriber list returned an invalid response.");
  elements.subscribers.innerHTML = subscribers.map((subscriber) => `
    <article class="subscriber-row">
      <strong>${escapeHtml(subscriber.name || subscriber.email)}</strong>
      <p>${escapeHtml(subscriber.email)} · ${escapeHtml(subscriber.status)}</p>
      <button data-id="${escapeHtml(subscriber.id)}" data-status="${subscriber.status === "active" ? "unsubscribed" : "active"}" type="button">
        ${subscriber.status === "active" ? "Unsubscribe" : "Reactivate"}
      </button>
    </article>
  `).join("") || "<p>No subscribers yet.</p>";
}

async function handleSubscriberAction(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.id || !target.dataset.status) return;
  await api("/api/admin/subscribers", {
    method: "PATCH",
    body: JSON.stringify({ id: target.dataset.id, status: target.dataset.status }),
  });
  await loadSubscribers();
  showStatus("Subscriber status updated.");
}

function activateTab(tab: string) {
  document.querySelectorAll<HTMLButtonElement>("#tabs button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.tab === tab);
  });
  document.querySelectorAll<HTMLElement>(".panel").forEach((panel) => {
    panel.classList.toggle("selected", panel.id === `panel-${tab}`);
  });
}

document.querySelector<HTMLFormElement>("#auth-form")!.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidateOrigin = elements.apiOrigin.value.trim().replace(/\/+$/, "");
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(candidateOrigin);
  } catch {
    showStatus("Enter a valid Cloudflare site address.", true);
    return;
  }
  if (
    parsedOrigin.protocol !== "https:"
    || parsedOrigin.pathname !== "/"
    || parsedOrigin.search
    || parsedOrigin.hash
    || !(parsedOrigin.hostname === "www.dpsagovernmentjobs.co.za" || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pages\.dev$/.test(parsedOrigin.hostname))
  ) {
    showStatus("Use your website address or a Cloudflare Pages .pages.dev address.", true);
    return;
  }
  apiRoot = parsedOrigin.origin;
  adminSecret = elements.token.value;
  try {
    await loadJobs();
    await chrome.storage.session.set({ adminSecret, apiRoot });
    showStatus("Connected to the admin API.");
  } catch (error) {
    adminSecret = "";
    await chrome.storage.session.remove("adminSecret");
    showStatus(error instanceof Error ? error.message : "Could not connect.", true);
  }
});

document.querySelectorAll<HTMLButtonElement>("#tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab || "import");
    const loader = button.dataset.tab === "jobs" ? loadJobs
      : button.dataset.tab === "comments" ? loadComments
        : button.dataset.tab === "subscribers" ? loadSubscribers
          : null;
    if (loader) void loader().catch((error: unknown) => showStatus(error instanceof Error ? error.message : "Could not load this section.", true));
  });
});

elements.parseButton.addEventListener("click", () => {
  elements.parseButton.disabled = true;
  showStatus("Reading selected PDF files...");
  void parseCirculars()
    .catch((error: unknown) => showStatus(error instanceof Error ? error.message : "Could not parse the selected circulars.", true))
    .finally(() => { elements.parseButton.disabled = false; });
});

elements.importRows.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
  const index = Number(input.dataset.index);
  const field = input.dataset.field;
  const row = importRows[index];
  if (!row || !field) return;
  if (field === "included") row.included = (input as HTMLInputElement).checked;
  else if (field === "status") row.status = input.value === "published" ? "published" : "draft";
  else if (field === "title" || field === "department" || field === "location" || field === "closing_date" || field === "application_url") {
    row[field] = input.value;
  }
  const count = importRows.filter((item) => item.included).length;
  elements.saveImport.disabled = count === 0;
  elements.saveImport.textContent = `Save ${count} selected vacancies`;
});

elements.saveImport.addEventListener("click", () => {
  elements.saveImport.disabled = true;
  void saveImported()
    .catch((error: unknown) => showStatus(error instanceof Error ? error.message : "Could not save parsed vacancies.", true))
    .finally(() => { elements.saveImport.disabled = false; });
});

elements.jobs.addEventListener("click", (event) => {
  void handleJobAction(event).catch((error: unknown) => showStatus(error instanceof Error ? error.message : "Vacancy action failed.", true));
});
elements.comments.addEventListener("click", (event) => {
  void handleCommentAction(event).catch((error: unknown) => showStatus(error instanceof Error ? error.message : "Comment action failed.", true));
});
elements.subscribers.addEventListener("click", (event) => {
  void handleSubscriberAction(event).catch((error: unknown) => showStatus(error instanceof Error ? error.message : "Subscriber action failed.", true));
});
elements.jobFilter.addEventListener("input", renderJobs);
elements.editorForm.addEventListener("submit", (event) => {
  void saveJobEdit(event).catch((error: unknown) => showStatus(error instanceof Error ? error.message : "Could not save vacancy.", true));
});
document.querySelector<HTMLButtonElement>("#refresh-jobs")!.addEventListener("click", () => void loadJobs().catch((error: unknown) => showStatus(error instanceof Error ? error.message : "Could not load vacancies.", true)));
document.querySelector<HTMLButtonElement>("#refresh-comments")!.addEventListener("click", () => void loadComments().catch((error: unknown) => showStatus(error instanceof Error ? error.message : "Could not load comments.", true)));
document.querySelector<HTMLButtonElement>("#refresh-subscribers")!.addEventListener("click", () => void loadSubscribers().catch((error: unknown) => showStatus(error instanceof Error ? error.message : "Could not load subscribers.", true)));

void chrome.storage.session.get(["adminSecret", "apiRoot"]).then(async (values) => {
  if (typeof values.apiRoot === "string") {
    elements.apiOrigin.value = values.apiRoot;
    apiRoot = values.apiRoot;
  }
  if (typeof values.adminSecret === "string") {
    adminSecret = values.adminSecret;
    elements.token.value = adminSecret;
    try {
      await loadJobs();
      showStatus("Connected to the admin API.");
    } catch (error) {
      adminSecret = "";
      elements.token.value = "";
      await chrome.storage.session.remove("adminSecret");
      showStatus(error instanceof Error ? error.message : "Could not restore the admin session.", true);
    }
  }
}).catch((error: unknown) => {
  console.error("Could not restore the admin session.", error);
});
