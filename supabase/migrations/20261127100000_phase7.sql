-- LINGUA — Phase 7: server-authoritative learning records, data export/deletion, early access leads,
-- expert reviews, admin read functions. Learners READ their rows; all writes are server-signed (lingua_write).

-- 1. Learning records -------------------------------------------------------------------------------
create table public.lesson_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null,
  lesson_version int not null,
  item_key text not null,
  skill text not null,
  try_no int not null,
  ok boolean not null,
  answer text not null default '' check (char_length(answer) <= 500),
  ms int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id, lesson_version, item_key, try_no)
);
create index lesson_attempts_user_time on public.lesson_attempts (user_id, created_at desc);

create table public.lesson_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null,
  lesson_version int not null,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  graded int not null,
  first_try int not null,
  minutes int not null default 0,
  stages jsonb not null default '[]',
  self_assessment jsonb not null default '{}',
  objective_status text not null,
  mistakes jsonb not null default '[]',
  unique (user_id, lesson_id, lesson_version, completed_at)
);
create index lesson_results_user_time on public.lesson_results (user_id, completed_at desc);

create table public.srs_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null check (char_length(item_id) <= 200),
  kind text not null check (kind in ('word', 'error')),
  ok boolean not null,
  at timestamptz not null default now()
);
create index srs_events_user_time on public.srs_events (user_id, at desc);

-- 2. Expert review of placement writing (confirmed evaluation, separate from the AI one) -----------
create table public.expert_reviews (
  id bigint generated always as identity primary key,
  placement_id uuid not null references public.placements(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  evaluation jsonb not null,
  created_at timestamptz not null default now()
);

-- 3. Data deletion requests (13 §14 DeletionRequest) ----------------------------------------------
create table public.deletion_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  scope text not null check (scope in ('all', 'texts', 'voice')),
  status text not null check (status in ('received', 'completed', 'account_removal_pending')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  log jsonb not null default '{}'
);

-- 4. Early access leads (no account) --------------------------------------------------------------
create table public.early_access_leads (
  id bigint generated always as identity primary key,
  contact text not null check (char_length(contact) between 3 and 200),
  contact_type text not null check (contact_type in ('email', 'telegram')),
  name text check (char_length(name) <= 80),
  level text check (char_length(level) <= 40),
  consent boolean not null check (consent),
  consent_version text not null,
  utm jsonb not null default '{}',
  referrer text check (char_length(referrer) <= 300),
  ip_hash text,
  created_at timestamptz not null default now()
);
create index early_access_leads_time on public.early_access_leads (created_at desc);
create unique index early_access_leads_contact on public.early_access_leads (lower(contact));

create table if not exists private.admins (user_id uuid primary key);
revoke all on private.admins from public, anon, authenticated;

alter table public.lesson_attempts enable row level security;
alter table public.lesson_results enable row level security;
alter table public.srs_events enable row level security;
alter table public.expert_reviews enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.early_access_leads enable row level security;

create policy "own attempts" on public.lesson_attempts for select using (auth.uid() = user_id);
create policy "own results" on public.lesson_results for select using (auth.uid() = user_id);
create policy "own srs events" on public.srs_events for select using (auth.uid() = user_id);
create policy "own deletion requests" on public.deletion_requests for select using (auth.uid() = user_id);
create policy "reviews of own placements" on public.expert_reviews for select
  using (exists (select 1 from public.placements p where p.id = placement_id and p.user_id = auth.uid()));
-- early_access_leads: no policy → nobody reads it through the API (admin uses a checked function).

revoke all on public.lesson_attempts, public.lesson_results, public.srs_events, public.expert_reviews,
  public.deletion_requests, public.early_access_leads from anon, authenticated;
grant select on public.lesson_attempts, public.lesson_results, public.srs_events, public.expert_reviews, public.deletion_requests to authenticated;

-- Legacy tables from the first schema are not used by the app: read-only for learners.
revoke insert, update, delete on public.learning_goals, public.lesson_progress, public.assessments, public.skill_levels,
  public.submissions, public.user_vocabulary, public.error_records, public.study_sessions, public.progress_reports,
  public.ai_conversations from authenticated;

-- 5. Signed writes: new operations --------------------------------------------------------------------
create or replace function private.verify_signed(p_payload text, p_sig text, p_uid uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_secret text; v jsonb;
begin
  select value into v_secret from private.app_secrets where name = 'write_signing';
  if v_secret is null then raise exception 'signing secret not configured' using errcode = '55000'; end if;
  if p_sig is null or encode(extensions.hmac(convert_to(p_payload, 'UTF8'), convert_to(v_secret, 'UTF8'), 'sha256'), 'hex') <> p_sig then
    raise exception 'bad signature' using errcode = '42501';
  end if;
  v := p_payload::jsonb;
  if p_uid is not null and (v->>'uid')::uuid is distinct from p_uid then raise exception 'wrong user' using errcode = '42501'; end if;
  if (v->>'exp')::bigint < extract(epoch from now())::bigint then raise exception 'expired' using errcode = '42501'; end if;
  return v;
end; $$;
revoke all on function private.verify_signed(text, text, uuid) from public, anon, authenticated;

create or replace function public.lingua_write2(p_payload text, p_sig text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v jsonb; d jsonb; n int := 0; c jsonb := '{}';
begin
  if v_uid is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  v := private.verify_signed(p_payload, p_sig, v_uid);
  d := v->'d';
  case v->>'op'
    when 'lesson.attempt' then
      insert into public.lesson_attempts (user_id, lesson_id, lesson_version, item_key, skill, try_no, ok, answer, ms)
      values (v_uid, d->>'lessonId', (d->>'version')::int, d->>'key', d->>'skill', (d->>'tryNo')::int, (d->>'ok')::boolean, left(coalesce(d->>'answer', ''), 500), coalesce((d->>'ms')::int, 0))
      on conflict do nothing;
      get diagnostics n = row_count;
    when 'lesson.result' then
      insert into public.lesson_results (user_id, lesson_id, lesson_version, started_at, completed_at, graded, first_try, minutes, stages, self_assessment, objective_status, mistakes)
      values (v_uid, d->>'lessonId', (d->>'version')::int, nullif(d->>'startedAt', '')::timestamptz, (d->>'completedAt')::timestamptz, (d->>'graded')::int, (d->>'firstTry')::int,
              coalesce((d->>'minutes')::int, 0), coalesce(d->'stages', '[]'), coalesce(d->'selfAssessment', '{}'), d->>'objectiveStatus', coalesce(d->'mistakes', '[]'))
      on conflict do nothing;
      get diagnostics n = row_count;
    when 'srs.event' then
      insert into public.srs_events (user_id, item_id, kind, ok) values (v_uid, left(d->>'itemId', 200), d->>'kind', (d->>'ok')::boolean);
      n := 1;
    when 'account.delete' then
      if d->>'scope' = 'all' then
        with x as (delete from public.placements where user_id = v_uid returning 1) select count(*) into n from x;
        c := c || jsonb_build_object('placements', n);
        delete from public.lesson_attempts where user_id = v_uid; get diagnostics n = row_count; c := c || jsonb_build_object('lesson_attempts', n);
        delete from public.lesson_results where user_id = v_uid; get diagnostics n = row_count; c := c || jsonb_build_object('lesson_results', n);
        delete from public.srs_events where user_id = v_uid; get diagnostics n = row_count; c := c || jsonb_build_object('srs_events', n);
        delete from public.ai_usage where user_id = v_uid; get diagnostics n = row_count; c := c || jsonb_build_object('ai_usage', n);
        delete from public.learner_consents where user_id = v_uid;
        delete from public.learner_state where user_id = v_uid; get diagnostics n = row_count; c := c || jsonb_build_object('learner_state', n);
        insert into public.deletion_requests (user_id, scope, status, completed_at, log) values (v_uid, 'all', 'account_removal_pending', now(), c);
      elsif d->>'scope' = 'texts' then
        update public.placement_responses set response = '{"redacted": true}'::jsonb where user_id = v_uid and section = 'writing';
        get diagnostics n = row_count; c := c || jsonb_build_object('placement_writing', n);
        update public.lesson_attempts set answer = '' where user_id = v_uid and skill = 'writing';
        insert into public.deletion_requests (user_id, scope, status, completed_at, log) values (v_uid, 'texts', 'completed', now(), c);
      elsif d->>'scope' = 'voice' then
        insert into public.deletion_requests (user_id, scope, status, completed_at, log) values (v_uid, 'voice', 'completed', now(), '{"stored_audio": 0}'::jsonb);
      else
        raise exception 'bad scope' using errcode = '22023';
      end if;
      n := 1;
    else
      raise exception 'unknown op' using errcode = '22023';
  end case;
  return jsonb_build_object('n', n, 'log', c);
end; $$;
revoke all on function public.lingua_write2(text, text) from public, anon;
grant execute on function public.lingua_write2(text, text) to authenticated;

-- 6. Early access: the server signs the lead (visitors have no account), the DB verifies and rate-limits.
create or replace function public.lingua_lead_submit(p_payload text, p_sig text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb; d jsonb; recent int;
begin
  v := private.verify_signed(p_payload, p_sig, null);
  if v->>'op' <> 'lead.submit' then raise exception 'bad op' using errcode = '22023'; end if;
  d := v->'d';
  select count(*) into recent from public.early_access_leads where ip_hash = d->>'ipHash' and created_at > now() - interval '1 hour';
  if recent >= 3 then return jsonb_build_object('ok', false, 'reason', 'rate_limited'); end if;
  insert into public.early_access_leads (contact, contact_type, name, level, consent, consent_version, utm, referrer, ip_hash)
  values (d->>'contact', d->>'contactType', nullif(d->>'name', ''), nullif(d->>'level', ''), (d->>'consent')::boolean, d->>'consentVersion', coalesce(d->'utm', '{}'), left(nullif(d->>'referrer', ''), 300), d->>'ipHash')
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.lingua_lead_submit(text, text) from public;
grant execute on function public.lingua_lead_submit(text, text) to anon, authenticated;

-- 7. Admin (owner) functions: every one checks private.admins ------------------------------------------
create or replace function public.lingua_is_admin() returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from private.admins where user_id = auth.uid());
$$;
revoke all on function public.lingua_is_admin() from public, anon;
grant execute on function public.lingua_is_admin() to authenticated;

create or replace function public.lingua_admin_stats() returns jsonb language plpgsql security definer set search_path = '' stable as $$
begin
  if not exists (select 1 from private.admins where user_id = auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'leads_total', (select count(*) from public.early_access_leads),
    'leads_7d', (select count(*) from public.early_access_leads where created_at > now() - interval '7 days'),
    'leads_by_source', coalesce((select jsonb_object_agg(src, n) from (select coalesce(utm->>'utm_source', 'direct') src, count(*) n from public.early_access_leads group by 1) s), '{}'),
    'leads_by_day', coalesce((select jsonb_object_agg(dkey, n) from (select to_char(created_at, 'YYYY-MM-DD') as dkey, count(*) n from public.early_access_leads where created_at > now() - interval '30 days' group by 1) s), '{}'),
    'learners', (select count(*) from public.profiles),
    'placements_completed', (select count(*) from public.placements where status = 'completed' and mode <> 'recheck'),
    'lessons_completed', (select count(*) from public.lesson_results),
    'pending_account_removals', (select count(*) from public.deletion_requests where status = 'account_removal_pending'),
    'ai_cost_7d', (select coalesce(sum(cost_usd), 0) from public.ai_usage where at > now() - interval '7 days'),
    'ai_requests_7d', (select count(*) from public.ai_usage where at > now() - interval '7 days')
  );
end; $$;
revoke all on function public.lingua_admin_stats() from public, anon;
grant execute on function public.lingua_admin_stats() to authenticated;

create or replace function public.lingua_admin_leads(p_limit int default 50) returns jsonb language plpgsql security definer set search_path = '' stable as $$
begin
  if not exists (select 1 from private.admins where user_id = auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(l order by l.created_at desc) from (
    select id, contact, contact_type, name, level, utm, referrer, created_at from public.early_access_leads order by created_at desc limit least(p_limit, 500)) l), '[]');
end; $$;
revoke all on function public.lingua_admin_leads(int) from public, anon;
grant execute on function public.lingua_admin_leads(int) to authenticated;

-- Writing texts awaiting expert review (pilot: the owner reviews; later — a sample, 07 §5).
create or replace function public.lingua_admin_writing_queue() returns jsonb language plpgsql security definer set search_path = '' stable as $$
begin
  if not exists (select 1 from private.admins where user_id = auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(q order by q.completed_at desc) from (
    select p.id, p.completed_at, r.item_id as task_id, r.response->>'text' as text, p.result->'writingAi' as ai,
           (select e.evaluation from public.expert_reviews e where e.placement_id = p.id order by e.created_at desc limit 1) as expert
      from public.placements p join public.placement_responses r on r.placement_id = p.id and r.section = 'writing'
     where p.status = 'completed' and r.response ? 'text' order by p.completed_at desc limit 100) q), '[]');
end; $$;
revoke all on function public.lingua_admin_writing_queue() from public, anon;
grant execute on function public.lingua_admin_writing_queue() to authenticated;

create or replace function public.lingua_admin_review_writing(p_placement uuid, p_evaluation jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.admins where user_id = auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.expert_reviews (placement_id, reviewer_id, evaluation) values (p_placement, auth.uid(), p_evaluation);
  update public.placements set result = jsonb_set(result, '{writingExpert}', p_evaluation || jsonb_build_object('at', now())), updated_at = now()
   where id = p_placement and status = 'completed' and result is not null;
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.lingua_admin_review_writing(uuid, jsonb) from public, anon;
grant execute on function public.lingua_admin_review_writing(uuid, jsonb) to authenticated;

revoke truncate, trigger, references on all tables in schema public from authenticated, anon;
