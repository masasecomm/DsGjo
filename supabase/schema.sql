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
