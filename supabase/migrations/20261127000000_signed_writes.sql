-- LINGUA — Phase 6: tamper-proof server writes, placement disagreement, AI usage accounting.
--
-- Placement data must not be editable by the learner through the public API (their own session).
-- Learners keep SELECT on their rows; every write goes through public.lingua_write(payload, sig):
-- the payload is signed by the Next.js server with HMAC-SHA256 using a secret that only the server
-- and this database know. The secret lives in private.app_secrets and is inserted out of band
-- (it is NOT in this repository):
--   insert into private.app_secrets (name, value) values ('write_signing', '<random 64 hex>');

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.app_secrets (name text primary key, value text not null);
revoke all on private.app_secrets from public, anon, authenticated;

-- Re-check after "I disagree with my level" (14 §15) is a short placement linked to its parent.
alter table public.placements drop constraint if exists placements_mode_check;
alter table public.placements add constraint placements_mode_check check (mode in ('full', 'zero', 'recheck'));
alter table public.placements add column if not exists parent_id uuid references public.placements(id) on delete cascade;

create table public.placement_feedback (
  id bigint generated always as identity primary key,
  placement_id uuid not null references public.placements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  direction text not null check (direction in ('higher', 'lower', 'other')),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

-- AIUsageRecord (13 §14): one row per provider call (also failed ones), used for budgets and cost reports.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  at timestamptz not null default now(),
  mode text not null,
  task text not null,
  provider text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  ok boolean not null,
  error_code text
);
create index ai_usage_user_at on public.ai_usage (user_id, at desc);

alter table public.placement_feedback enable row level security;
alter table public.ai_usage enable row level security;
create policy "own feedback: read" on public.placement_feedback for select using (auth.uid() = user_id);
create policy "own usage: read" on public.ai_usage for select using (auth.uid() = user_id);

revoke all on public.placement_feedback, public.ai_usage from anon, authenticated;
grant select on public.placement_feedback, public.ai_usage to authenticated;
-- Transitional: until LINGUA_SIGNING_SECRET is configured on the server, the app may still write directly.
-- 20261127000100_close_direct_writes.sql removes these grants (and the older table grants) once signing is live.
grant insert on public.placement_feedback, public.ai_usage to authenticated;
create policy "own feedback: add" on public.placement_feedback for insert with check (auth.uid() = user_id);
create policy "own usage: add" on public.ai_usage for insert with check (auth.uid() = user_id);

create or replace function public.lingua_write(p_payload text, p_sig text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_secret text;
  v jsonb;
  d jsonb;
  n int := 0;
begin
  if v_uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  select value into v_secret from private.app_secrets where name = 'write_signing';
  if v_secret is null then
    raise exception 'signing secret not configured' using errcode = '55000';
  end if;
  if p_sig is null or encode(extensions.hmac(convert_to(p_payload, 'UTF8'), convert_to(v_secret, 'UTF8'), 'sha256'), 'hex') <> p_sig then
    raise exception 'bad signature' using errcode = '42501';
  end if;
  v := p_payload::jsonb;
  if (v->>'uid')::uuid is distinct from v_uid then
    raise exception 'wrong user' using errcode = '42501';
  end if;
  if (v->>'exp')::bigint < extract(epoch from now())::bigint then
    raise exception 'expired' using errcode = '42501';
  end if;
  d := v->'d';

  case v->>'op'
    when 'placement.create' then
      insert into public.placements (id, user_id, status, mode, config_version, bank_version, intake, state, parent_id)
      values ((d->>'id')::uuid, v_uid, 'in_progress', d->>'mode', d->>'configVersion', d->>'bankVersion', d->'intake', d->'state', nullif(d->>'parentId', '')::uuid);
      n := 1;
    when 'placement.save' then
      update public.placements
         set state = d->'state', result = d->'result', seq = (d->>'seq')::int, status = d->>'status',
             completed_at = nullif(d->>'completedAt', '')::timestamptz, updated_at = now()
       where id = (d->>'id')::uuid and user_id = v_uid and seq = (d->>'expectedSeq')::int;
      get diagnostics n = row_count;
    when 'placement.status' then
      update public.placements set status = d->>'status', updated_at = now()
       where id = (d->>'id')::uuid and user_id = v_uid;
      get diagnostics n = row_count;
    when 'placement.result' then
      -- Attach the outcome of a re-check to a completed parent placement.
      update public.placements set result = d->'result', updated_at = now()
       where id = (d->>'id')::uuid and user_id = v_uid and status = 'completed';
      get diagnostics n = row_count;
    when 'placement.response' then
      insert into public.placement_responses (placement_id, user_id, item_id, item_version, seq, section, band, response, correct, ms, suspect_guess)
      select p.id, v_uid, d->>'itemId', d->>'itemVersion', (d->>'seq')::int, d->>'section', nullif(d->>'band', '')::smallint,
             d->'response', (d->>'correct')::boolean, coalesce((d->>'ms')::int, 0), coalesce((d->>'suspectGuess')::boolean, false)
        from public.placements p
       where p.id = (d->>'placementId')::uuid and p.user_id = v_uid and p.status = 'in_progress'
      on conflict (placement_id, seq) do nothing;
      get diagnostics n = row_count;
    when 'placement.feedback' then
      insert into public.placement_feedback (placement_id, user_id, direction, comment)
      select p.id, v_uid, d->>'direction', left(d->>'comment', 1000)
        from public.placements p where p.id = (d->>'placementId')::uuid and p.user_id = v_uid;
      get diagnostics n = row_count;
    when 'consent.set' then
      insert into public.learner_consents (user_id, kind, granted, decided_at)
      values (v_uid, d->>'kind', (d->>'granted')::boolean, now())
      on conflict (user_id, kind) do update set granted = excluded.granted, decided_at = excluded.decided_at;
      n := 1;
    when 'ai.usage' then
      insert into public.ai_usage (user_id, mode, task, provider, model, input_tokens, output_tokens, cost_usd, ok, error_code)
      values (v_uid, d->>'mode', d->>'task', d->>'provider', d->>'model', coalesce((d->>'inputTokens')::int, 0), coalesce((d->>'outputTokens')::int, 0),
              coalesce((d->>'costUsd')::numeric, 0), (d->>'ok')::boolean, d->>'errorCode');
      n := 1;
    else
      raise exception 'unknown op' using errcode = '22023';
  end case;
  return jsonb_build_object('n', n);
end;
$$;

revoke all on function public.lingua_write(text, text) from public, anon;
grant execute on function public.lingua_write(text, text) to authenticated;

-- Health check: does the server's signing secret match ours? Only accepts "ping:" payloads; returns a boolean.
create or replace function public.lingua_signing_check(p_payload text, p_sig text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select p_payload like 'ping:%' and exists (
    select 1 from private.app_secrets s
     where s.name = 'write_signing'
       and encode(extensions.hmac(convert_to(p_payload, 'UTF8'), convert_to(s.value, 'UTF8'), 'sha256'), 'hex') = p_sig
  );
$$;
revoke all on function public.lingua_signing_check(text, text) from public;
grant execute on function public.lingua_signing_check(text, text) to anon, authenticated;
