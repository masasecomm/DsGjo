alter table public.jobs
  add column if not exists reference_number text,
  add column if not exists province text,
  add column if not exists employment_type text,
  add column if not exists salary_text text,
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists salary_currency text,
  add column if not exists job_level text,
  add column if not exists dpsa_post_number text,
  add column if not exists source_url text,
  add column if not exists source_published_at date,
  add column if not exists structured_details jsonb not null default '{}'::jsonb;

alter table public.imported_dpsa_circulars
  drop constraint if exists imported_dpsa_circulars_job_count_check;

alter table public.imported_dpsa_circulars
  add constraint imported_dpsa_circulars_job_count_check check (job_count between 1 and 1000);

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
