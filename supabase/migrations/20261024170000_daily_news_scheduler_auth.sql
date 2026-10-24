-- Require the scheduler credential to exist before replacing the one daily job.
-- The value is managed out of band in both Vault and Edge Function secrets; it
-- is intentionally never stored in source control or migration history.

do $$
declare
  scheduler_secret_count integer;
  existing_job bigint;
  scheduled_job bigint;
begin
  select count(*) into scheduler_secret_count
  from vault.decrypted_secrets
  where name = 'website_daily_news_scheduler_secret'
    and length(decrypted_secret) >= 32;

  if scheduler_secret_count <> 1 then
    raise exception 'Expected exactly one 32+ byte website daily news scheduler secret in Vault.';
  end if;

  for existing_job in
    select jobid from cron.job where jobname = 'website-daily-news-refresh'
  loop
    perform cron.unschedule(existing_job);
  end loop;

  select cron.schedule(
    'website-daily-news-refresh',
    '15 6 * * *',
    $schedule$
      select net.http_post(
        url := 'https://mihmykgxbneuhlcxolzm.supabase.co/functions/v1/website-daily-news',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'website_daily_news_scheduler_secret'
          )
        ),
        body := '{"source":"database-cron"}'::jsonb,
        timeout_milliseconds := 150000
      ) as request_id;
    $schedule$
  ) into scheduled_job;

  if (
    select count(*)
    from cron.job
    where jobname = 'website-daily-news-refresh'
      and schedule = '15 6 * * *'
      and active
  ) <> 1 then
    raise exception 'Failed to install exactly one active daily news schedule.';
  end if;
end;
$$;
