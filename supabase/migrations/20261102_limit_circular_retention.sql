drop policy if exists "Admins can delete imported DPSA circulars" on public.imported_dpsa_circulars;
create policy "Admins can delete imported DPSA circulars"
on public.imported_dpsa_circulars for delete
to authenticated
using (public.is_admin());

grant delete on public.imported_dpsa_circulars to authenticated;

create or replace function public.finish_dpsa_circular_import(
  p_year integer,
  p_circular_number integer,
  p_pdf_url text,
  p_total_jobs integer,
  p_keep integer default 3
)
returns table(year integer, circular_number integer, job_count integer)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  expected_pdf_url text;
  saved_count integer;
  retired record;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_year is null or p_year < 2000 or p_year > extract(year from now())::integer + 1
    or p_circular_number is null or p_circular_number < 1 or p_circular_number > 100 then
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
  if p_total_jobs is null or p_total_jobs < 1 or p_total_jobs > 1000 then
    raise exception 'Invalid DPSA circular vacancy count';
  end if;
  if p_keep is null or p_keep < 1 or p_keep > 10 then
    raise exception 'Invalid circular retention limit';
  end if;

  select count(*) into saved_count
  from public.jobs
  where source_url = p_pdf_url;
  if saved_count < p_total_jobs then
    raise exception 'Only % of % vacancies are confirmed as posted', saved_count, p_total_jobs;
  end if;

  insert into public.imported_dpsa_circulars (
    year, circular_number, source_pdf_url, job_count
  ) values (
    p_year, p_circular_number, p_pdf_url, p_total_jobs
  )
  on conflict (year, circular_number) do nothing;

  for retired in
    select ranked.year, ranked.circular_number, ranked.source_pdf_url, ranked.job_count
    from (
      select
        history.year,
        history.circular_number,
        history.source_pdf_url,
        history.job_count,
        row_number() over (
          order by history.imported_at desc, history.year desc, history.circular_number desc
        ) as retention_rank
      from public.imported_dpsa_circulars as history
    ) as ranked
    where ranked.retention_rank > p_keep
    order by ranked.retention_rank desc
  loop
    delete from public.jobs where source_url = retired.source_pdf_url;
    delete from public.imported_dpsa_circulars
      where imported_dpsa_circulars.year = retired.year
        and imported_dpsa_circulars.circular_number = retired.circular_number;
    year := retired.year;
    circular_number := retired.circular_number;
    job_count := retired.job_count;
    return next;
  end loop;
end;
$$;

grant execute on function public.finish_dpsa_circular_import(integer, integer, text, integer, integer) to authenticated;
