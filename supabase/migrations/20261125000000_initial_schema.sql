-- LINGUA — initial schema
-- Designed for a single learner now, multi-user ready (every learner-owned row has user_id + RLS).
-- Content tables (courses → modules → lessons → exercises, vocabulary, resources) mirror /content JSON
-- so content can later move from files into the database without changing the UI contracts.

-- gen_random_uuid() is built into PostgreSQL 13+ (no extension needed).

-- Shared enums ---------------------------------------------------------------
create type cefr_level as enum ('A1','A2','B1','B2','C1','C2');
create type skill as enum ('grammar','vocabulary','reading','listening','speaking','writing');
create type vocab_status as enum ('new','learning','review','learned');
create type assessment_type as enum ('initial','weekly','progress');

-- Learner profile & goals ----------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  current_level cefr_level,              -- self-reported until a validated assessment exists
  teaching_language text not null default 'ru+en' check (teaching_language in ('ru+en','en')),
  interface_language text not null default 'en',
  settings jsonb not null default '{}'::jsonb,   -- notifications, sample preview, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  target_level cefr_level not null default 'C1',
  main_goal text not null default 'Balanced development of all English skills',
  daily_minutes int not null default 60 check (daily_minutes between 5 and 480),
  focus_skills skill[] not null default array['grammar','vocabulary','reading','listening','speaking','writing']::skill[],
  target_exam text not null default 'none' check (target_exam in ('none','ielts','toefl')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Curriculum (content) -------------------------------------------------------
create table courses (
  id text primary key,                   -- e.g. 'general-english', later 'ielts-academic'
  title text not null,
  unlock_rule text not null default 'sequential' check (unlock_rule in ('sequential','open')),
  is_sample boolean not null default false,
  source text
);

create table modules (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  level cefr_level not null,
  skill skill not null,
  title text not null,
  description text,
  position int not null default 0
);

create table lessons (
  id text primary key,
  module_id text not null references modules(id) on delete cascade,
  title text not null,
  skill skill not null,
  minutes int not null default 15,
  objectives text[] not null default '{}',
  blocks jsonb not null default '[]'::jsonb,   -- same shape as LessonBlockSchema
  position int not null default 0
);

create table exercises (
  id text primary key,
  lesson_id text references lessons(id) on delete set null,
  kind text not null check (kind in ('reading','listening','speaking','writing','quiz')),
  level cefr_level not null,
  title text not null,
  payload jsonb not null,                 -- text/transcript/audio_url/questions/instructions
  rubric_id text,
  is_sample boolean not null default false
);

-- Progress -------------------------------------------------------------------
create table lesson_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id text not null references lessons(id) on delete cascade,
  status text not null check (status in ('in_progress','completed')),
  score int,
  total int,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  assessment_key text not null,           -- matches content/assessments/*.json id
  type assessment_type not null,
  score int not null,
  total int not null,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now()
);

create table skill_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  assessment_id uuid references assessments(id) on delete cascade,
  skill skill not null,
  score int not null,
  total int not null,
  estimated_level cefr_level,             -- NULL until a validated scoring model exists
  measured_at timestamptz not null default now()
);

-- Homework & submissions -----------------------------------------------------
create table homework (
  id text primary key,
  lesson_id text references lessons(id) on delete set null,
  title text not null,
  skill skill not null,
  level cefr_level not null,
  instructions text not null,
  submission_type text not null default 'text' check (submission_type in ('text','audio')),
  min_words int,
  due_in_days int not null default 1
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  homework_id text references homework(id) on delete set null,
  exercise_id text references exercises(id) on delete set null,
  kind text not null check (kind in ('homework','writing','speaking','reading','listening')),
  text_content text,
  audio_path text,                        -- Supabase Storage path
  status text not null default 'submitted' check (status in ('draft','submitted','reviewed')),
  score numeric,
  feedback jsonb,                         -- { summary, corrections[], rubric: {criterion: score} }
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Vocabulary -----------------------------------------------------------------
create table vocabulary (
  id text primary key,
  word text not null,
  pos text,
  ipa text,
  translation text not null,
  level cefr_level not null,
  topic text,
  examples text[] not null default '{}',
  is_sample boolean not null default false
);

create table user_vocabulary (
  user_id uuid not null references profiles(id) on delete cascade,
  vocabulary_id text not null references vocabulary(id) on delete cascade,
  status vocab_status not null default 'new',
  reviews int not null default 0,
  correct int not null default 0,
  last_reviewed timestamptz,
  next_review timestamptz,
  primary key (user_id, vocabulary_id)
);

-- Analytics ------------------------------------------------------------------
create table error_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  source text not null,                   -- 'assessment' | 'homework' | 'writing' | 'tutor'
  source_id text,
  category text not null,                 -- e.g. 'articles', 'present-perfect'
  original text,
  corrected text,
  created_at timestamptz not null default now()
);

create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  study_date date not null,
  block_id text not null,                 -- daily plan block id
  minutes int not null,
  completed_at timestamptz not null default now(),
  unique (user_id, study_date, block_id)
);

create table progress_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  summary text not null,
  recommendations text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,
  generated_by text,                      -- provider/model that produced it
  created_at timestamptz not null default now()
);

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mode text not null,                     -- teacher | examiner | planner | analyst | speaking | vocabulary
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table learning_resources (
  id text primary key,
  category skill not null,
  title text not null,
  author text,
  levels cefr_level[] not null default '{}',
  format text not null,
  url text,
  storage_path text,
  description text,
  tags text[] not null default '{}',
  rights text not null default 'link-only'
);

-- Indexes --------------------------------------------------------------------
create index on assessments (user_id, completed_at desc);
create index on submissions (user_id, submitted_at desc);
create index on error_records (user_id, category);
create index on study_sessions (user_id, study_date);
create index on ai_conversations (user_id, mode);

-- Row Level Security ---------------------------------------------------------
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['learning_goals','lesson_progress','assessments','skill_levels','submissions',
                           'user_vocabulary','error_records','study_sessions','progress_reports','ai_conversations']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Content tables: readable by any signed-in user, writable only with the service role.
do $$
declare t text;
begin
  foreach t in array array['courses','modules','lessons','exercises','homework','vocabulary','learning_resources']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "read content" on %I for select to authenticated using (true)', t);
  end loop;
end $$;

-- Create a profile automatically for each new auth user.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.learning_goals (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
