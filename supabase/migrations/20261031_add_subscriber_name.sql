alter table public.job_alert_subscribers
add column if not exists name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'job_alert_subscribers_name_length_check'
      and conrelid = 'public.job_alert_subscribers'::regclass
  ) then
    alter table public.job_alert_subscribers
    add constraint job_alert_subscribers_name_length_check
    check (name is null or char_length(trim(name)) between 2 and 80);
  end if;
end;
$$;
