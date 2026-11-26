-- LINGUA — Phase 5: placement test (docs/curriculum/13 §4, §14; 14).
-- One row per diagnostic attempt, append-only item responses, and learner consents.
-- Every row belongs to one learner; RLS limits all access to the owner's rows.

create table public.placements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  mode text not null check (mode in ('full', 'zero')),
  config_version text not null,
  bank_version text not null,
  intake jsonb not null,
  state jsonb not null,
  result jsonb,
  seq int not null default 0,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint placements_state_size check (pg_column_size(state) < 200000),
  constraint placements_result_size check (result is null or pg_column_size(result) < 200000)
);
create index placements_user_started on public.placements (user_id, started_at desc);
-- At most one diagnostic in progress per learner.
create unique index placements_one_active on public.placements (user_id) where status = 'in_progress';

-- PlacementItemResponse (13 §14). Immutable: no update policy.
create table public.placement_responses (
  id bigint generated always as identity primary key,
  placement_id uuid not null references public.placements(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  item_id text not null,
  item_version text not null,
  -- State sequence number the answer was given at; unique per placement → a double submit cannot be stored twice.
  seq int not null,
  section text not null check (section in ('zero', 'vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking')),
  band smallint,
  response jsonb not null,
  correct boolean,
  ms int not null default 0,
  suspect_guess boolean not null default false,
  created_at timestamptz not null default now(),
  constraint placement_responses_size check (pg_column_size(response) < 40000)
);
create unique index placement_responses_placement_seq on public.placement_responses (placement_id, seq);

-- Consent (13 §4): voice recording, storing texts, using data to improve models.
create table public.learner_consents (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('voice_recording', 'text_storage', 'model_training')),
  granted boolean not null,
  decided_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.placements enable row level security;
alter table public.placement_responses enable row level security;
alter table public.learner_consents enable row level security;

create policy "own placements: read" on public.placements for select using (auth.uid() = user_id);
create policy "own placements: create" on public.placements for insert with check (auth.uid() = user_id);
create policy "own placements: update" on public.placements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own placements: delete" on public.placements for delete using (auth.uid() = user_id);

create policy "own responses: read" on public.placement_responses for select using (auth.uid() = user_id);
create policy "own responses: add" on public.placement_responses for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.placements p where p.id = placement_id and p.user_id = auth.uid() and p.status = 'in_progress')
);

create policy "own consents" on public.learner_consents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.placements, public.placement_responses, public.learner_consents from anon;
grant select, insert, update, delete on public.placements to authenticated;
grant select, insert on public.placement_responses to authenticated;
grant select, insert, update, delete on public.learner_consents to authenticated;
