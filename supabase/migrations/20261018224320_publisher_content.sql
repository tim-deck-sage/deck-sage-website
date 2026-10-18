-- Publisher schema applied to the authorized TEST project after Tim's explicit
-- approval and private entry of DECK_SAGE_PUBLISHER_PIN in the Supabase secrets UI.

create table public.ds_publications (
  id uuid primary key,
  operation_id uuid not null unique,
  kind text not null check (kind in ('lore', 'song')),
  title text not null check (char_length(title) between 1 and 120),
  commander_name text check (commander_name is null or char_length(commander_name) between 1 and 120),
  body text,
  categories text[] not null default '{}',
  artwork_path text not null check (artwork_path ~ '^(lore|song)/[0-9a-f-]{36}/artwork\\.(jpg|png|webp)$'),
  artwork_mime text not null check (artwork_mime in ('image/jpeg', 'image/png', 'image/webp')),
  artwork_bytes integer not null check (artwork_bytes between 1 and 4194304),
  audio_path text,
  audio_mime text,
  audio_bytes integer,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  published_at timestamptz not null default now(),
  check (
    (kind = 'lore' and body is not null and char_length(body) between 20 and 20000 and audio_path is null and audio_mime is null and audio_bytes is null and cardinality(categories) = 0)
    or
    (kind = 'song' and body is null and audio_path is not null and audio_mime in ('audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/x-wav') and audio_bytes between 1 and 6291456 and cardinality(categories) between 1 and 5)
  ),
  check (categories <@ array['fan-favorites','dragon-commanders','tribal-leaders','villains','celestial']::text[])
);

create index ds_publications_published_at_idx
  on public.ds_publications (published_at desc, id desc);

alter table public.ds_publications enable row level security;
revoke all on table public.ds_publications from public, anon, authenticated;
grant select, insert on table public.ds_publications to service_role;

create table public.ds_publisher_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz not null default now(),
  check (expires_at > created_at and expires_at <= created_at + interval '15 minutes')
);

create index ds_publisher_sessions_expires_at_idx
  on public.ds_publisher_sessions (expires_at);

alter table public.ds_publisher_sessions enable row level security;
revoke all on table public.ds_publisher_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.ds_publisher_sessions to service_role;

create table public.ds_publisher_login_attempts (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts between 0 and 5),
  blocked_until timestamptz
);

create index ds_publisher_login_attempts_blocked_until_idx
  on public.ds_publisher_login_attempts (blocked_until)
  where blocked_until is not null;

alter table public.ds_publisher_login_attempts enable row level security;
revoke all on table public.ds_publisher_login_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.ds_publisher_login_attempts to service_role;

create or replace function public.ds_consume_publisher_login_attempt(
  p_key_hash text,
  p_failed boolean,
  p_now timestamptz default now()
)
returns table (allowed boolean, retry_after_seconds integer, attempts_remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.ds_publisher_login_attempts%rowtype;
  next_attempts integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid publisher attempt key';
  end if;

  insert into public.ds_publisher_login_attempts (key_hash, window_started_at, attempts)
  values (p_key_hash, p_now, 0)
  on conflict (key_hash) do nothing;

  select * into current_row
  from public.ds_publisher_login_attempts
  where key_hash = p_key_hash
  for update;

  if current_row.blocked_until is not null and current_row.blocked_until > p_now then
    return query select false, greatest(1, ceil(extract(epoch from current_row.blocked_until - p_now))::integer), 0;
    return;
  end if;

  if not p_failed then
    delete from public.ds_publisher_login_attempts where key_hash = p_key_hash;
    return query select true, 0, 5;
    return;
  end if;

  if current_row.window_started_at <= p_now - interval '15 minutes' then
    current_row.window_started_at := p_now;
    current_row.attempts := 0;
    current_row.blocked_until := null;
  end if;

  next_attempts := current_row.attempts + 1;
  if next_attempts >= 5 then
    update public.ds_publisher_login_attempts
    set window_started_at = current_row.window_started_at,
        attempts = 5,
        blocked_until = p_now + interval '30 minutes'
    where key_hash = p_key_hash;
    return query select false, 1800, 0;
  else
    update public.ds_publisher_login_attempts
    set window_started_at = current_row.window_started_at,
        attempts = next_attempts,
        blocked_until = null
    where key_hash = p_key_hash;
    return query select true, 0, 5 - next_attempts;
  end if;
end;
$$;

revoke all on function public.ds_consume_publisher_login_attempt(text, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.ds_consume_publisher_login_attempt(text, boolean, timestamptz) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deck-sage-published-media',
  'deck-sage-published-media',
  true,
  6291456,
  array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/x-m4a','audio/ogg','audio/wav','audio/x-wav']
);

-- No storage.objects write policy is created. Only the Edge Function's server
-- key may upload or remove objects. Public bucket URLs are intentionally read-only.
