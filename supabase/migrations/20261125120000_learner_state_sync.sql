-- LINGUA — synced learner progress + explicit API grants

-- One synced progress document per learner (source of truth for the app's client state).
create table public.learner_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  constraint learner_state_size check (pg_column_size(state) < 2000000)
);

alter table public.learner_state enable row level security;
create policy "own state" on public.learner_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atomic save with optimistic concurrency. Runs as the caller (RLS applies).
-- Returns ok=false plus the current server copy when p_base_version is stale.
create function public.save_learner_state(p_state jsonb, p_base_version int)
returns table (ok boolean, version int, state jsonb, updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur public.learner_state%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into cur from public.learner_state ls where ls.user_id = uid for update;

  if not found then
    insert into public.learner_state (user_id, state, version)
    values (uid, p_state, 1)
    returning true, learner_state.version, learner_state.state, learner_state.updated_at
    into ok, version, state, updated_at;
    return next;
    return;
  end if;

  if cur.version <> p_base_version then
    ok := false; version := cur.version; state := cur.state; updated_at := cur.updated_at;
    return next;
    return;
  end if;

  update public.learner_state ls
     set state = p_state, version = ls.version + 1, updated_at = now()
   where ls.user_id = uid
  returning true, ls.version, ls.state, ls.updated_at
  into ok, version, state, updated_at;
  return next;
end $$;

revoke execute on function public.save_learner_state(jsonb, int) from public, anon;
grant execute on function public.save_learner_state(jsonb, int) to authenticated;

-- Some projects do not auto-grant table privileges to API roles, so grant them explicitly.
-- RLS policies still restrict every learner table to the owner's rows.
revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;

grant select, insert, update, delete on
  public.profiles, public.learning_goals, public.lesson_progress, public.assessments, public.skill_levels,
  public.submissions, public.user_vocabulary, public.error_records, public.study_sessions,
  public.progress_reports, public.ai_conversations, public.learner_state
to authenticated;

grant select on
  public.courses, public.modules, public.lessons, public.exercises, public.homework,
  public.vocabulary, public.learning_resources
to authenticated;
