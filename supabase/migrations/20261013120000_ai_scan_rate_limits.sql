create schema if not exists private;

create table if not exists private.ai_scan_rate_limits (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (scope, key_hash, window_started_at)
);

alter table private.ai_scan_rate_limits enable row level security;
revoke all on private.ai_scan_rate_limits from public, anon, authenticated;

create or replace function public.consume_ai_scan_quota(p_key_hash text)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = private, pg_temp
as $$
declare
  ten_minute_window timestamptz := date_trunc('hour', now()) + floor(extract(minute from now()) / 10) * interval '10 minutes';
  daily_window timestamptz := date_trunc('day', now());
  short_count integer;
  ip_daily_count integer;
  global_daily_count integer;
begin
  if p_key_hash is null or length(p_key_hash) <> 64 then
    raise exception 'invalid quota key';
  end if;

  insert into private.ai_scan_rate_limits(scope, key_hash, window_started_at, request_count)
  values ('ip-10m', p_key_hash, ten_minute_window, 1)
  on conflict (scope, key_hash, window_started_at)
  do update set request_count = private.ai_scan_rate_limits.request_count + 1
  returning request_count into short_count;

  insert into private.ai_scan_rate_limits(scope, key_hash, window_started_at, request_count)
  values ('ip-day', p_key_hash, daily_window, 1)
  on conflict (scope, key_hash, window_started_at)
  do update set request_count = private.ai_scan_rate_limits.request_count + 1
  returning request_count into ip_daily_count;

  insert into private.ai_scan_rate_limits(scope, key_hash, window_started_at, request_count)
  values ('global-day', 'all', daily_window, 1)
  on conflict (scope, key_hash, window_started_at)
  do update set request_count = private.ai_scan_rate_limits.request_count + 1
  returning request_count into global_daily_count;

  delete from private.ai_scan_rate_limits where window_started_at < now() - interval '8 days';

  allowed := short_count <= 6 and ip_daily_count <= 30 and global_daily_count <= 250;
  retry_after_seconds := case
    when global_daily_count > 250 or ip_daily_count > 30 then greatest(1, extract(epoch from (daily_window + interval '1 day' - now()))::integer)
    when short_count > 6 then greatest(1, extract(epoch from (ten_minute_window + interval '10 minutes' - now()))::integer)
    else 0
  end;
  return next;
end;
$$;

revoke all on function public.consume_ai_scan_quota(text) from public, anon, authenticated;
grant execute on function public.consume_ai_scan_quota(text) to service_role;
