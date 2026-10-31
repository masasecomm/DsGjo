create table if not exists public.imported_dpsa_circulars (
  year integer not null check (year between 2000 and 2100),
  circular_number integer not null check (circular_number between 1 and 100),
  source_pdf_url text not null unique,
  imported_at timestamptz not null default now(),
  job_count integer not null check (job_count between 1 and 100),
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
  if jsonb_array_length(p_jobs) not between 1 and 100 then
    raise exception 'Select between 1 and 100 vacancies to import';
  end if;

  insert into public.jobs (
    title,
    slug,
    department,
    location,
    closing_date,
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
    vacancy.description,
    vacancy.application_url,
    vacancy.status
  from jsonb_to_recordset(p_jobs) as vacancy(
    title text,
    slug text,
    department text,
    location text,
    closing_date text,
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
