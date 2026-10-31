create table if not exists public.job_search_analytics (
  search_date date not null,
  search_term text not null check (char_length(search_term) between 2 and 80),
  search_count bigint not null default 1 check (search_count > 0),
  primary key (search_date, search_term)
);

alter table public.job_search_analytics enable row level security;
revoke all on table public.job_search_analytics from public, anon, authenticated;

drop policy if exists "Admins can view job search analytics" on public.job_search_analytics;
create policy "Admins can view job search analytics"
on public.job_search_analytics for select
to authenticated
using (public.is_admin());
grant select on public.job_search_analytics to authenticated;

create table if not exists public.job_page_view_analytics (
  view_date date not null,
  page_path text not null,
  page_title text not null,
  view_count bigint not null default 1 check (view_count > 0),
  primary key (view_date, page_path)
);

alter table public.job_page_view_analytics enable row level security;
revoke all on table public.job_page_view_analytics from public, anon, authenticated;

drop policy if exists "Admins can view page view analytics" on public.job_page_view_analytics;
create policy "Admins can view page view analytics"
on public.job_page_view_analytics for select
to authenticated
using (public.is_admin());
grant select on public.job_page_view_analytics to authenticated;

create or replace function public.record_public_page_view(p_page_path text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_path text;
  normalized_slug text;
  page_label text;
  local_date date := (now() at time zone 'Africa/Johannesburg')::date;
begin
  normalized_path := trim(coalesce(p_page_path, ''));

  if normalized_path = '/' then
    page_label := 'Home';
  elsif normalized_path = '/jobs' then
    page_label := 'All vacancies';
  elsif normalized_path in (
    '/about',
    '/contact',
    '/privacy',
    '/privacy-policy',
    '/cookie-statement',
    '/terms-and-conditions'
  ) then
    page_label := case normalized_path
      when '/about' then 'About us'
      when '/contact' then 'Contact'
      when '/privacy' then 'Privacy'
      when '/privacy-policy' then 'Privacy policy'
      when '/cookie-statement' then 'Cookie statement'
      when '/terms-and-conditions' then 'Terms and conditions'
    end;
  elsif normalized_path ~ '^/jobs/province/[a-z0-9-]+$' then
    normalized_slug := substring(normalized_path from '^/jobs/province/(.*)$');
    select province.name into page_label
    from (values
      ('Eastern Cape'), ('Free State'), ('Gauteng'), ('KwaZulu-Natal'),
      ('Limpopo'), ('Mpumalanga'), ('Northern Cape'), ('North West'), ('Western Cape')
    ) as province(name)
    where regexp_replace(
      lower(regexp_replace(province.name, '[^a-zA-Z0-9]+', '-', 'g')),
      '(^-|-$)',
      '',
      'g'
    ) = normalized_slug
      and exists (
        select 1
        from public.jobs
        where status = 'published'
          and description ilike '%Province: ' || province.name || '%'
          and (closing_date is null or closing_date >= local_date)
      )
    limit 1;
    if page_label is null then
      return false;
    end if;
    page_label := 'Province: ' || page_label;
  elsif normalized_path ~ '^/jobs/department/[a-z0-9-]+$' then
    normalized_slug := substring(normalized_path from '^/jobs/department/(.*)$');
    select min(trim(jobs.department)) into page_label
    from public.jobs as jobs
    where jobs.status = 'published'
      and jobs.department is not null
      and btrim(regexp_replace(lower(trim(jobs.department)), '[^a-z0-9]+', '-', 'g'), '-') = normalized_slug
      and (jobs.closing_date is null or jobs.closing_date >= local_date);
    if page_label is null then
      return false;
    end if;
    page_label := 'Department: ' || page_label;
  elsif normalized_path ~ '^/jobs/[a-z0-9-]+$' then
    select jobs.title into page_label
    from public.jobs as jobs
    where jobs.status = 'published'
      and jobs.slug = substring(normalized_path from '^/jobs/(.*)$')
    limit 1;
    if page_label is null then
      return false;
    end if;
  else
    return false;
  end if;

  insert into public.job_page_view_analytics (view_date, page_path, page_title, view_count)
  values (local_date, normalized_path, page_label, 1)
  on conflict (view_date, page_path)
  do update set
    page_title = excluded.page_title,
    view_count = public.job_page_view_analytics.view_count + 1;

  return true;
end;
$$;

create or replace function public.get_popular_job_searches(p_limit integer default 5)
returns table(search_term text, search_count bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select analytics.search_term, sum(analytics.search_count)::bigint as search_count
  from public.job_search_analytics as analytics
  where analytics.search_date >= (now() at time zone 'Africa/Johannesburg')::date - 29
  group by analytics.search_term
  having sum(analytics.search_count) >= 1
  order by 2 desc, 1 asc
  limit least(greatest(coalesce(p_limit, 5), 1), 8);
$$;

create or replace function public.get_admin_popular_job_searches(p_limit integer default 5)
returns table(search_term text, search_count bigint)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
  select analytics.search_term, sum(analytics.search_count)::bigint as search_count
  from public.job_search_analytics as analytics
  where analytics.search_date >= (now() at time zone 'Africa/Johannesburg')::date - 29
  group by analytics.search_term
  having sum(analytics.search_count) >= 1
  order by 2 desc, 1 asc
  limit least(greatest(coalesce(p_limit, 5), 1), 10);
end;
$$;

create or replace function public.get_admin_top_viewed_pages(p_limit integer default 10)
returns table(page_path text, page_title text, view_count bigint)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
  select analytics.page_path, analytics.page_title, sum(analytics.view_count)::bigint as view_count
  from public.job_page_view_analytics as analytics
  where analytics.view_date >= (now() at time zone 'Africa/Johannesburg')::date - 29
  group by analytics.page_path, analytics.page_title
  order by 3 desc, 2 asc
  limit least(greatest(coalesce(p_limit, 10), 1), 20);
end;
$$;

revoke all on function public.record_public_page_view(text) from public;
revoke all on function public.get_admin_popular_job_searches(integer) from public, anon;
revoke all on function public.get_admin_top_viewed_pages(integer) from public, anon;
grant execute on function public.record_public_page_view(text) to anon, authenticated;
grant execute on function public.get_admin_popular_job_searches(integer) to authenticated;
grant execute on function public.get_admin_top_viewed_pages(integer) to authenticated;
