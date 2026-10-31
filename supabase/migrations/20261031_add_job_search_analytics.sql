create table if not exists public.job_search_analytics (
  search_date date not null,
  search_term text not null check (char_length(search_term) between 2 and 80),
  search_count bigint not null default 1 check (search_count > 0),
  primary key (search_date, search_term)
);

alter table public.job_search_analytics enable row level security;
revoke all on table public.job_search_analytics from public, anon, authenticated;

create or replace function public.record_public_job_search(p_search_term text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_term text;
  local_date date := (now() at time zone 'Africa/Johannesburg')::date;
begin
  normalized_term := lower(regexp_replace(
    regexp_replace(trim(coalesce(p_search_term, '')), '[^[:alnum:] -]', '', 'g'),
    '[[:space:]]+',
    ' ',
    'g'
  ));

  if char_length(normalized_term) not between 2 and 80
    or normalized_term !~ '[[:alpha:]]'
    or normalized_term ~ '^[[:space:]-]+$'
    or normalized_term ~ '^[0-9[:space:]-]+$' then
    return false;
  end if;

  if not exists (
    select 1
    from public.jobs
    where status = 'published'
      and (closing_date is null or closing_date >= local_date)
      and concat_ws(' ', title, department, location, description)
        ilike '%' || normalized_term || '%'
  ) then
    return false;
  end if;

  insert into public.job_search_analytics (search_date, search_term, search_count)
  values (local_date, normalized_term, 1)
  on conflict (search_date, search_term)
  do update set search_count = public.job_search_analytics.search_count + 1;

  return true;
end;
$$;

create or replace function public.get_popular_job_searches(p_limit integer default 6)
returns table(search_term text, search_count bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select analytics.search_term, sum(analytics.search_count)::bigint as search_count
  from public.job_search_analytics as analytics
  where analytics.search_date >= (now() at time zone 'Africa/Johannesburg')::date - 29
  group by analytics.search_term
  having sum(analytics.search_count) >= 2
  order by search_count desc, analytics.search_term asc
  limit least(greatest(coalesce(p_limit, 6), 1), 8);
$$;

revoke all on function public.record_public_job_search(text) from public;
revoke all on function public.get_popular_job_searches(integer) from public;
grant execute on function public.record_public_job_search(text) to anon, authenticated;
grant execute on function public.get_popular_job_searches(integer) to anon, authenticated;
