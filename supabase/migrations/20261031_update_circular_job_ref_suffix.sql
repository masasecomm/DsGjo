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
