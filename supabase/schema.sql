create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 180),
  slug text not null unique,
  department text,
  location text,
  closing_date date,
  reference_number text,
  province text,
  employment_type text,
  salary_text text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  job_level text,
  dpsa_post_number text,
  source_url text,
  source_published_at date,
  structured_details jsonb not null default '{}'::jsonb,
  description text not null,
  application_url text check (application_url is null or application_url like 'https://%'),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 2 and 80),
  content text not null check (char_length(content) between 2 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.job_alert_subscribers (
  id uuid primary key default gen_random_uuid(),
  name text check (name is null or char_length(trim(name)) between 2 and 80),
  email text not null unique check (email = lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.comments enable row level security;
alter table public.job_alert_subscribers enable row level security;

drop policy if exists "Users and admins can read profiles" on public.profiles;
create policy "Users and admins can read profiles"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "Published vacancies are public" on public.jobs;
create policy "Published vacancies are public"
on public.jobs for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage vacancies" on public.jobs;
create policy "Admins can manage vacancies"
on public.jobs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Approved comments are public" on public.comments;
create policy "Approved comments are public"
on public.comments for select
to anon, authenticated
using (status = 'approved');

drop policy if exists "Visitors can submit comments for published vacancies" on public.comments;
create policy "Visitors can submit comments for published vacancies"
on public.comments for insert
to anon, authenticated
with check (
  status = 'pending'
  and exists (
    select 1 from public.jobs
    where jobs.id = comments.job_id and jobs.status = 'published'
  )
);

drop policy if exists "Admins can moderate comments" on public.comments;
create policy "Admins can moderate comments"
on public.comments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Visitors can subscribe to job alerts" on public.job_alert_subscribers;
create policy "Visitors can subscribe to job alerts"
on public.job_alert_subscribers for insert
to anon, authenticated
with check (status = 'active');

drop policy if exists "Admins can manage subscribers" on public.job_alert_subscribers;
create policy "Admins can manage subscribers"
on public.job_alert_subscribers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.jobs, public.comments to anon, authenticated;
grant insert, update, delete on public.jobs, public.comments to authenticated;
grant insert on public.comments to anon;
grant select on public.profiles to authenticated;
grant insert on public.job_alert_subscribers to anon, authenticated;
grant select, update, delete on public.job_alert_subscribers to authenticated;

create index if not exists jobs_status_created_at_idx on public.jobs (status, created_at desc);
create index if not exists comments_job_status_created_at_idx on public.comments (job_id, status, created_at desc);
create index if not exists job_alert_subscribers_status_created_at_idx on public.job_alert_subscribers (status, created_at desc);

create table if not exists public.imported_dpsa_circulars (
  year integer not null check (year between 2000 and 2100),
  circular_number integer not null check (circular_number between 1 and 100),
  source_pdf_url text not null unique,
  imported_at timestamptz not null default now(),
  job_count integer not null check (job_count between 1 and 1000),
  primary key (year, circular_number)
);

alter table public.imported_dpsa_circulars enable row level security;

drop policy if exists "Admins can view imported DPSA circulars" on public.imported_dpsa_circulars;
create policy "Admins can view imported DPSA circulars"
on public.imported_dpsa_circulars for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can record imported DPSA circulars" on public.imported_dpsa_circulars;
create policy "Admins can record imported DPSA circulars"
on public.imported_dpsa_circulars for insert
to authenticated
with check (public.is_admin());

grant select, insert on public.imported_dpsa_circulars to authenticated;

create or replace function public.import_dpsa_circular_jobs(
  p_year integer,
  p_circular_number integer,
  p_pdf_url text,
  p_jobs jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  expected_pdf_url text;
  inserted_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_year is null or p_circular_number is null
    or p_year < 2000 or p_year > extract(year from now())::integer + 1
    or p_circular_number < 1 or p_circular_number > 100 then
    raise exception 'Invalid DPSA circular number or year';
  end if;

  expected_pdf_url := format(
    'https://www.dpsa.gov.za/dpsa2g/documents/vacancies/%s/PSV%%20CIRCULAR%%20%s%%20of%%20%s.pdf',
    p_year,
    p_circular_number,
    p_year
  );
  if p_pdf_url is distinct from expected_pdf_url then
    raise exception 'Invalid DPSA circular PDF URL';
  end if;

  if p_jobs is null or jsonb_typeof(p_jobs) <> 'array' then
    raise exception 'Vacancies must be provided as a JSON array';
  end if;
  if jsonb_array_length(p_jobs) not between 1 and 1000 then
    raise exception 'Select between 1 and 1,000 vacancies to import';
  end if;

  insert into public.jobs (
    title,
    slug,
    department,
    location,
    closing_date,
    reference_number,
    province,
    employment_type,
    salary_text,
    salary_min,
    salary_max,
    salary_currency,
    job_level,
    dpsa_post_number,
    source_url,
    source_published_at,
    structured_details,
    description,
    application_url,
    status
  )
  select
    vacancy.title,
    vacancy.slug,
    vacancy.department,
    vacancy.location,
    nullif(vacancy.closing_date, '')::date,
    vacancy.reference_number,
    vacancy.province,
    vacancy.employment_type,
    vacancy.salary_text,
    vacancy.salary_min,
    vacancy.salary_max,
    vacancy.salary_currency,
    vacancy.job_level,
    vacancy.dpsa_post_number,
    vacancy.source_url,
    nullif(vacancy.source_published_at, '')::date,
    coalesce(vacancy.structured_details, '{}'::jsonb),
    vacancy.description,
    vacancy.application_url,
    vacancy.status
  from jsonb_to_recordset(p_jobs) as vacancy(
    title text,
    slug text,
    department text,
    location text,
    closing_date text,
    reference_number text,
    province text,
    employment_type text,
    salary_text text,
    salary_min numeric,
    salary_max numeric,
    salary_currency text,
    job_level text,
    dpsa_post_number text,
    source_url text,
    source_published_at text,
    structured_details jsonb,
    description text,
    application_url text,
    status text
  );
  get diagnostics inserted_count = row_count;

  insert into public.imported_dpsa_circulars (
    year,
    circular_number,
    source_pdf_url,
    job_count
  )
  values (p_year, p_circular_number, p_pdf_url, inserted_count);

  return inserted_count;
end;
$$;

revoke all on function public.import_dpsa_circular_jobs(integer, integer, text, jsonb) from public, anon;
grant execute on function public.import_dpsa_circular_jobs(integer, integer, text, jsonb) to authenticated;
