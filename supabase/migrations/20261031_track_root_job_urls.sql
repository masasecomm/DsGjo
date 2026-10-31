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
