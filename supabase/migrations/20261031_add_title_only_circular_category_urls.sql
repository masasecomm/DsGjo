alter table public.jobs
  add column if not exists legacy_slugs text[] not null default '{}';

create index if not exists jobs_legacy_slugs_gin_idx
  on public.jobs using gin (legacy_slugs);

update public.jobs
set
  legacy_slugs = case
    when slug = any(coalesce(legacy_slugs, '{}'::text[])) then coalesce(legacy_slugs, '{}'::text[])
    else array_append(coalesce(legacy_slugs, '{}'::text[]), slug)
  end,
  slug = '__url_migration__/' || id::text;

do $$
declare
  job record;
  circular_match text[];
  circular_slug text;
  title_slug text;
  base_slug text;
  candidate_slug text;
  duplicate_number integer;
begin
  for job in
    select id, title, description, source_url
    from public.jobs
    order by created_at, id
  loop
    circular_match := regexp_match(
      concat_ws(' ', job.description, job.source_url),
      'DPSA[[:space:]_-]+CIRCULAR[[:space:]_-]+([0-9]{1,3})[[:space:]]+OF[[:space:]]+(20[0-9]{2})',
      'i'
    );
    circular_slug := case
      when circular_match is null then 'dpsa-circular'
      else 'dpsa-circular-' || circular_match[1] || '-of-' || circular_match[2]
    end;
    title_slug := coalesce(
      nullif(trim(both '-' from regexp_replace(lower(job.title), '[^a-z0-9]+', '-', 'g')), ''),
      'vacancy'
    );
    base_slug := circular_slug || '/' || left(title_slug, 100) || '-ref';
    candidate_slug := base_slug;
    duplicate_number := 2;

    while exists (
      select 1
      from public.jobs
      where slug = candidate_slug
        and id <> job.id
    ) loop
      candidate_slug := base_slug || '-' || duplicate_number;
      duplicate_number := duplicate_number + 1;
    end loop;

    update public.jobs
    set slug = candidate_slug
    where id = job.id;
  end loop;
end;
$$;

create or replace function public.set_circular_job_slug()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  circular_match text[];
  circular_slug text;
  title_slug text;
  base_slug text;
  candidate_slug text;
  duplicate_number integer := 2;
begin
  circular_match := regexp_match(
    concat_ws(' ', new.description, new.source_url),
    'DPSA[[:space:]_-]+CIRCULAR[[:space:]_-]+([0-9]{1,3})[[:space:]]+OF[[:space:]]+(20[0-9]{2})',
    'i'
  );
  circular_slug := case
    when circular_match is null then 'dpsa-circular'
    else 'dpsa-circular-' || circular_match[1] || '-of-' || circular_match[2]
  end;
  title_slug := coalesce(
    nullif(trim(both '-' from regexp_replace(lower(new.title), '[^a-z0-9]+', '-', 'g')), ''),
    'vacancy'
  );
  base_slug := circular_slug || '/' || left(title_slug, 100) || '-ref';

  perform pg_advisory_xact_lock(hashtext(base_slug)::bigint);
  candidate_slug := base_slug;
  while exists (
    select 1
    from public.jobs
    where slug = candidate_slug
      and id is distinct from new.id
  ) loop
    candidate_slug := base_slug || '-' || duplicate_number;
    duplicate_number := duplicate_number + 1;
  end loop;

  if tg_op = 'UPDATE' and old.slug is distinct from candidate_slug then
    if old.slug <> all(coalesce(new.legacy_slugs, '{}'::text[])) then
      new.legacy_slugs := array_append(coalesce(new.legacy_slugs, '{}'::text[]), old.slug);
    end if;
  end if;

  new.slug := candidate_slug;
  new.legacy_slugs := coalesce(new.legacy_slugs, '{}'::text[]);
  return new;
end;
$$;

drop trigger if exists set_circular_job_slug on public.jobs;
create trigger set_circular_job_slug
before insert or update of title, description, reference_number, source_url
on public.jobs
for each row
execute function public.set_circular_job_slug();

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
  circular_match text[];
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
  elsif normalized_path ~ '^/jobs/.+$' then
    normalized_slug := substring(normalized_path from '^/jobs/(.*)$');
    select jobs.title into page_label
    from public.jobs as jobs
    where jobs.status = 'published'
      and (
        jobs.slug = normalized_slug
        or jobs.legacy_slugs @> array[normalized_slug]
      )
    limit 1;
    if page_label is null then
      return false;
    end if;
  elsif normalized_path ~ '^/dpsa-circular-[0-9]{1,3}-of-20[0-9]{2}$' then
    circular_match := regexp_match(normalized_path, '^/dpsa-circular-([0-9]{1,3})-of-(20[0-9]{2})$');
    if not exists (
      select 1
      from public.jobs
      where status = 'published'
        and description ilike '%DPSA CIRCULAR ' || circular_match[1] || ' of ' || circular_match[2] || '%'
        and (closing_date is null or closing_date >= local_date)
    ) then
      return false;
    end if;
    page_label := 'DPSA Circular ' || circular_match[1] || ' of ' || circular_match[2];
  elsif normalized_path ~ '^/[a-z0-9-]+/[a-z0-9-]+$' then
    normalized_slug := substring(normalized_path from '^/(.*)$');
    select jobs.title into page_label
    from public.jobs as jobs
    where jobs.status = 'published'
      and jobs.slug = normalized_slug
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

revoke all on function public.record_public_page_view(text) from public;
grant execute on function public.record_public_page_view(text) to anon, authenticated;
