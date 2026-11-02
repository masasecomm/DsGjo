alter table public.jobs
  drop constraint if exists jobs_title_check;

alter table public.jobs
  add constraint jobs_title_check check (char_length(title) between 5 and 250);
