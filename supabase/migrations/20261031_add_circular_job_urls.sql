alter table public.jobs
  add column if not exists legacy_slugs text[] not null default '{}';

create index if not exists jobs_legacy_slugs_gin_idx
  on public.jobs using gin (legacy_slugs);

update public.jobs
set legacy_slugs = array_append(legacy_slugs, slug)
where not (slug = any(legacy_slugs));

with parsed as (
  select
    id,
    created_at,
    coalesce(
      case
        when circular_match.value is null then null
        else 'dpsa-circular-' || circular_match.value[1] || '-of-' || circular_match.value[2]
      end,
      'dpsa-circular'
    ) as circular_slug,
    coalesce(
      nullif(btrim(reference_number), ''),
      nullif(
        (regexp_match(
          description,
          '(?:reference(?:[[:space:]]+number)?|ref\.?[[:space:]]*(?:no\.?|number)?)[[:space:]]*[:.-][[:space:]]*([A-Za-z0-9/.-]+)',
          'i'
        ))[1],
        ''
      ),
      ''
    ) as reference_value,
    coalesce(
      nullif(
        trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'vacancy'
    ) as title_slug,
    left(replace(id::text, '-', ''), 8) as unique_suffix
  from public.jobs
  cross join lateral (
    select regexp_match(
      concat_ws(' ', description, source_url),
      'DPSA[[:space:]_-]+CIRCULAR[[:space:]_-]+([0-9]{1,3})[[:space:]]+OF[[:space:]]+(20[0-9]{2})',
      'i'
    ) as value
  ) as circular_match
), bases as (
  select
    id,
    created_at,
    circular_slug || '/' || left(title_slug, 100) || '-' ||
      case
        when reference_value <> '' then
          'ref-' || coalesce(
            nullif(left(trim(both '-' from regexp_replace(lower(reference_value), '[^a-z0-9]+', '-', 'g')), 60), ''),
            unique_suffix
          )
        else unique_suffix
      end as base_slug
  from parsed
), numbered as (
  select
    id,
    base_slug,
    row_number() over (partition by base_slug order by created_at, id) as duplicate_number
  from bases
)
update public.jobs as job
set slug = numbered.base_slug ||
  case when numbered.duplicate_number = 1 then '' else '-' || numbered.duplicate_number end
from numbered
where job.id = numbered.id;

create or replace function public.set_circular_job_slug()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  circular_match text[];
  reference_value text;
  circular_slug text;
  title_slug text;
  reference_slug text;
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
  reference_value := coalesce(
    nullif(btrim(new.reference_number), ''),
    nullif(
      (regexp_match(
        new.description,
        '(?:reference(?:[[:space:]]+number)?|ref\.?[[:space:]]*(?:no\.?|number)?)[[:space:]]*[:.-][[:space:]]*([A-Za-z0-9/.-]+)',
        'i'
      ))[1],
      ''
    ),
    ''
  );
  reference_slug := left(
    trim(both '-' from regexp_replace(lower(reference_value), '[^a-z0-9]+', '-', 'g')),
    60
  );

  base_slug := circular_slug || '/' || left(title_slug, 100) || '-' ||
    case
      when reference_value <> '' then 'ref-' || coalesce(nullif(reference_slug, ''), left(replace(new.id::text, '-', ''), 8))
      else left(replace(new.id::text, '-', ''), 8)
    end;

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
