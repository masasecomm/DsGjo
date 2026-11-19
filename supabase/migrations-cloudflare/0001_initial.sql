CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  job_slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS comments_public_job
  ON comments (job_slug, status, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_moderation
  ON comments (status, created_at DESC);

CREATE TABLE IF NOT EXISTS draft_jobs (
  slug TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('draft', 'closed')),
  job_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_alert_subscribers (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS subscribers_status
  ON job_alert_subscribers (status, created_at DESC);

CREATE TABLE IF NOT EXISTS page_view_counts (
  page_path TEXT NOT NULL,
  view_date TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (page_path, view_date)
);

CREATE TABLE IF NOT EXISTS popular_job_searches (
  search_date TEXT NOT NULL,
  search_term TEXT NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (search_date, search_term)
);
