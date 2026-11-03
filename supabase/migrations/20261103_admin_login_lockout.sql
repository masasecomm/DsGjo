create table if not exists public.admin_login_attempts (
  email text primary key check (email = lower(email) and char_length(email) between 1 and 254),
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 2),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.admin_login_attempts enable row level security;

create or replace function public.is_admin_login_locked(p_email text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_login_attempts as attempts
    join public.profiles as profile
      on lower(trim(profile.email)) = attempts.email
    where attempts.email = lower(trim(p_email))
      and profile.role = 'admin'
      and attempts.locked_until > now()
  );
$$;

create or replace function public.record_admin_login_failure(p_email text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  attempt_count integer;
begin
  if p_email is null or char_length(trim(p_email)) not between 1 and 254 then
    raise exception 'Invalid admin email';
  end if;

  if not exists (
    select 1
    from public.profiles
    where lower(trim(email)) = lower(trim(p_email))
      and role = 'admin'
  ) then
    return 0;
  end if;

  insert into public.admin_login_attempts (email, failed_attempts)
  values (lower(trim(p_email)), 1)
  on conflict (email) do update
  set failed_attempts = case
        when admin_login_attempts.locked_until > now() then admin_login_attempts.failed_attempts
        when admin_login_attempts.locked_until is not null then 1
        else admin_login_attempts.failed_attempts + 1
      end,
      locked_until = case
        when admin_login_attempts.locked_until > now() then admin_login_attempts.locked_until
        when admin_login_attempts.locked_until is not null then null
        when admin_login_attempts.failed_attempts >= 1 then now() + interval '24 hours'
        else null
      end,
      updated_at = now()
  returning failed_attempts into attempt_count;

  return attempt_count;
end;
$$;

create or replace function public.clear_admin_login_failures(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.admin_login_attempts
  where email = lower(trim(p_email));
  return true;
end;
$$;

revoke all on table public.admin_login_attempts from public, anon, authenticated;
revoke all on function public.is_admin_login_locked(text) from public, anon, authenticated;
revoke all on function public.record_admin_login_failure(text) from public, anon, authenticated;
revoke all on function public.clear_admin_login_failures(text) from public, anon, authenticated;
grant execute on function public.is_admin_login_locked(text) to service_role;
grant execute on function public.record_admin_login_failure(text) to service_role;
grant execute on function public.clear_admin_login_failures(text) to service_role;
