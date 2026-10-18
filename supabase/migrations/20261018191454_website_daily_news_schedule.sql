-- Reuse the original app's daily_news_* cache in the authorized TEST project.
-- The Edge Function is the only writer. A public GET returns the active cache;
-- no website visit can start a paid OpenAI request.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create unique index if not exists daily_news_runs_one_running_per_date_idx
  on public.daily_news_runs (dispatch_date)
  where status = 'running';

create or replace function public.begin_website_daily_news_run(
  p_dispatch_date date default ((now() at time zone 'utc')::date)
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_run_id uuid;
begin
  update public.daily_news_runs
  set
    status = 'failed',
    completed_at = now(),
    error_message = 'Previous refresh exceeded the 30 minute run lease.'
  where dispatch_date = p_dispatch_date
    and status = 'running'
    and started_at < now() - interval '30 minutes';

  if exists (
    select 1
    from public.daily_news_runs
    where dispatch_date = p_dispatch_date
      and status = 'success'
      and is_active
  ) then
    return null;
  end if;

  insert into public.daily_news_runs (dispatch_date, status)
  values (p_dispatch_date, 'running')
  returning id into created_run_id;

  return created_run_id;
exception
  when unique_violation then
    return null;
end;
$$;

create or replace function public.activate_website_daily_news_run(
  p_run_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_date date;
begin
  select dispatch_date into target_date
  from public.daily_news_runs
  where id = p_run_id
    and status = 'running'
  for update;

  if target_date is null then
    raise exception 'News run is not available for activation.';
  end if;

  if not exists (
    select 1 from public.daily_news_dispatch_items where run_id = p_run_id
  ) then
    raise exception 'A news run cannot be activated without items.';
  end if;

  update public.daily_news_runs
  set is_active = false
  where is_active
    and id <> p_run_id;

  update public.daily_news_runs
  set
    status = 'success',
    is_active = true,
    activated_at = now(),
    completed_at = now(),
    error_message = null
  where id = p_run_id;
end;
$$;

revoke all on function public.begin_website_daily_news_run(date)
  from public, anon, authenticated;
revoke all on function public.activate_website_daily_news_run(uuid)
  from public, anon, authenticated;
grant execute on function public.begin_website_daily_news_run(date) to service_role;
grant execute on function public.activate_website_daily_news_run(uuid) to service_role;

do $$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'website-daily-news-refresh'
  loop
    perform cron.unschedule(existing_job);
  end loop;
end;
$$;

select cron.schedule(
  'website-daily-news-refresh',
  '15 6 * * *',
  $schedule$
    select net.http_post(
      url := 'https://mihmykgxbneuhlcxolzm.supabase.co/functions/v1/website-daily-news',
      headers := '{"Content-Type":"application/json","x-deck-sage-scheduler":"daily"}'::jsonb,
      body := '{"source":"database-cron"}'::jsonb,
      timeout_milliseconds := 150000
    ) as request_id;
  $schedule$
);
