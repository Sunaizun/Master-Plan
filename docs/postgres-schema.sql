-- Optional migration for moving Master's Application OS to Supabase/PostgreSQL.
-- Not used by the running app (which stores data in the Artifact db or localStorage).
-- Every table is owned by auth.uid() and protected by row-level security.

create extension if not exists pgcrypto;

create type status as enum ('not_started','in_progress','waiting','needs_verification','blocked','complete','not_applicable');
create type currency as enum ('KZT','USD','GBP');

create table user_profile (
  user_id uuid primary key references auth.users on delete cascade,
  full_name text, university text, degree text, graduation text, gpa text,
  mobility text, experience text, projects text, skills text, interests text, goals text,
  settings jsonb not null default '{}'::jsonb
);

create table universities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null, country text not null, city text, website text, notes text
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  university_id uuid not null references universities on delete cascade,
  name text not null, program_url text, admissions_url text, intake text, duration text,
  opening_date date, deadline date,
  deadline_type text check (deadline_type in ('final','priority','rolling','staged','unknown')) default 'unknown',
  deadline_note text, target_date date,
  app_fee numeric, app_fee_currency currency, tuition numeric, tuition_currency currency, living_estimate numeric,
  ielts_req text, gpa_req text, prerequisites text, gre_req text, documents_req text, lor_req text, sop_req text, cv_req text,
  funding text, sop_word_limit int,
  fit text check (fit in ('stronger','ambitious','unclear')) default 'unclear', fit_evidence text, fit_score int check (fit_score between 0 and 5),
  eligibility text default 'unknown', submission text default 'not_started', submitted_on date,
  decision text default 'none', decision_on date, bolashak_list text default 'unknown', bolashak_note text,
  portal_url text, notes text, archived boolean not null default false
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null, category text not null, status status not null default 'not_started',
  issue_date date, expiry_date date, language text,
  translation_required boolean default false, notarization_required boolean default false,
  storage_path text,             -- private Supabase Storage object, never a public URL
  final_version_id uuid, notes text
);

create table document_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  document_id uuid not null references documents on delete cascade,
  label text not null, stage text default 'draft', body text, word_count int, feedback text, notes text,
  created_at timestamptz not null default now()
);

create table document_submissions (
  user_id uuid not null references auth.users on delete cascade,
  document_id uuid not null references documents on delete cascade,
  program_id uuid not null references programs on delete cascade,
  version_id uuid references document_versions on delete set null,
  submitted_on date,
  primary key (document_id, program_id)
);

create table requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  program_id uuid not null references programs on delete cascade,
  category text not null check (category in ('academic','english','materials','financial')),
  title text not null, required text not null default 'unknown', official_value text,
  my_status status not null default 'not_started',
  verified boolean not null default false, verified_on date,
  deadline date, document_id uuid references documents on delete set null,
  evidence text, source_url text, notes text, sort_order int default 0,
  constraint verified_needs_source check (not verified or source_url is not null)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null, description text, category text, priority text default 'medium',
  status status not null default 'not_started', start_date date, deadline date,
  est_hours numeric, completed_at date,
  requirement_id uuid references requirements on delete set null,
  link_action text default 'none', notes text, link text
);
create table task_programs (task_id uuid references tasks on delete cascade, program_id uuid references programs on delete cascade, user_id uuid not null, primary key (task_id, program_id));
create table task_dependencies (task_id uuid references tasks on delete cascade, depends_on uuid references tasks on delete cascade, user_id uuid not null, primary key (task_id, depends_on), check (task_id <> depends_on));

create table ielts_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  date date not null, kind text not null default 'mock', provider text,
  l numeric(2,1), r numeric(2,1), w numeric(2,1), s numeric(2,1), overall numeric(2,1),
  writing_feedback text, speaking_feedback text, weaknesses text, notes text
);
create table ielts_practice_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  date date not null, activity text not null, section text, score text, minutes int not null default 0,
  mistakes text, lessons text, next_action text
);

create table recommenders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  name text not null, position text, institution text, relationship text, email text, phone text, notes text
);
create table recommendation_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  recommender_id uuid not null references recommenders on delete cascade,
  program_id uuid not null references programs on delete cascade,
  status text not null default 'not_requested', request_date date, deadline date, follow_up_date date, confirmed_on date, notes text
);

create table scholarship_requirements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  area text not null, rule text not null, official_value text,
  verified boolean not null default false, last_verified date, source_url text,
  my_status status not null default 'not_started', deadline date,
  document_id uuid references documents on delete set null, notes text
);

create table expenses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  title text not null, category text not null, program_id uuid references programs on delete set null,
  currency currency not null, estimated numeric, actual numeric, due_date date,
  payment_status text default 'planned', refundable text default 'unknown', verified boolean default false, source_url text, notes text
);

create table source_verifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  program_id uuid references programs on delete set null, label text not null, url text, checked_on date, finding text
);

create table notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  program_id uuid references programs on delete set null, title text not null, body text, created_at timestamptz default now()
);

-- Row-level security: each user sees only their own rows.
do $$
declare t text;
begin
  foreach t in array array['user_profile','universities','programs','documents','document_versions','document_submissions',
    'requirements','tasks','task_programs','task_dependencies','ielts_attempts','ielts_practice_logs','recommenders',
    'recommendation_requests','scholarship_requirements','expenses','source_verifications','notes']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy own_rows on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Private storage bucket for document files (no public access).
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
-- create policy "own files" on storage.objects for all
--   using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
--   with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
