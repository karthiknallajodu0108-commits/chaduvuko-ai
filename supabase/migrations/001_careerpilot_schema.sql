-- CHADHUVUKO / CareerPilot Complete Supabase PostgreSQL Schema, RLS Policies, & Schema Cache Reload
-- Paste and run this entire script in: Supabase Dashboard -> SQL Editor -> New Query -> Run.
-- Safe to re-run (idempotent).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Automatic updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Core User Profiles Table (public.profiles)
-- ============================================================================
-- Note: `uid` (text, unique) stores the verified authenticated user identifier
-- (Firebase Auth UID or Supabase Auth UUID as text) referenced by all user tables.
-- `auth_user_id` optionally links directly to Supabase `auth.users(id)` when
-- authenticating through Supabase Auth without breaking Firebase Auth UIDs.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid text UNIQUE NOT NULL,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  full_name text DEFAULT '',
  headline text DEFAULT '',
  "current_role" text DEFAULT '',
  target_role text DEFAULT '',
  career_goal text DEFAULT '',
  years_experience integer NOT NULL DEFAULT 0,
  education text DEFAULT '',
  experience_summary text DEFAULT '',
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_uid ON public.profiles(uid);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. Dependent Application Tables (all scoped via user_uid -> profiles.uid)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  title text NOT NULL,
  file_name text NOT NULL,
  file_mime text NOT NULL,
  file_size integer NOT NULL,
  extracted_text text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resumes_user_uid ON public.resumes(user_uid);

CREATE TABLE IF NOT EXISTS public.resume_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  overall_score integer NOT NULL,
  ats_readiness_score integer NOT NULL,
  impact_score integer NOT NULL,
  clarity_score integer NOT NULL,
  keyword_score integer NOT NULL,
  career_summary text NOT NULL,
  experience_analysis text NOT NULL,
  education_analysis text NOT NULL,
  extracted_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  keyword_analysis jsonb NOT NULL DEFAULT '[]'::jsonb,
  formatting_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  bullet_improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  section_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  scoring_methodology text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resume_analysis_user_uid ON public.resume_analysis(user_uid);
CREATE INDEX IF NOT EXISTS idx_resume_analysis_resume_id ON public.resume_analysis(resume_id);

CREATE TABLE IF NOT EXISTS public.job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  resume_id uuid REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_title text NOT NULL,
  company text NOT NULL,
  job_description text NOT NULL,
  match_score integer NOT NULL,
  explanation text NOT NULL,
  experience_alignment text NOT NULL DEFAULT '',
  qualifications_alignment text NOT NULL DEFAULT '',
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  skill_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  matched_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  resume_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  interview_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_matches_user_uid ON public.job_matches(user_uid);

CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  job_match_id uuid REFERENCES public.job_matches(id) ON DELETE SET NULL,
  job_title text NOT NULL,
  company text NOT NULL,
  job_url text DEFAULT '',
  location text DEFAULT '',
  notes text DEFAULT '',
  match_score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_uid ON public.saved_jobs(user_uid);

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  company text NOT NULL,
  job_title text NOT NULL,
  job_link text DEFAULT '',
  location text DEFAULT '',
  status text NOT NULL DEFAULT 'Interested',
  applied_date text DEFAULT '',
  next_action text DEFAULT '',
  follow_up_date text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_applications_user_uid ON public.applications(user_uid);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  job_title text NOT NULL,
  company text DEFAULT '',
  category text NOT NULL,
  difficulty text NOT NULL,
  average_score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_uid ON public.interview_sessions(user_uid);

CREATE TABLE IF NOT EXISTS public.interview_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question text NOT NULL,
  question_type text NOT NULL,
  user_answer text DEFAULT '',
  score integer,
  star_feedback jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  sample_answer text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interview_messages_session_id ON public.interview_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_messages_user_uid ON public.interview_messages(user_uid);

CREATE TABLE IF NOT EXISTS public.cover_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  resume_id uuid REFERENCES public.resumes(id) ON DELETE SET NULL,
  company text NOT NULL,
  job_title text NOT NULL,
  tone text NOT NULL DEFAULT 'Executive',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user_uid ON public.cover_letters(user_uid);

CREATE TABLE IF NOT EXISTS public.tailored_resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  resume_id uuid REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_title text NOT NULL,
  company text DEFAULT '',
  tailored_summary text NOT NULL,
  tailored_content text NOT NULL,
  bullet_rewrites jsonb NOT NULL DEFAULT '[]'::jsonb,
  optimized_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tailored_resumes_user_uid ON public.tailored_resumes(user_uid);

CREATE TABLE IF NOT EXISTS public.career_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  target_role text NOT NULL,
  career_goal text NOT NULL,
  timeline_weeks integer NOT NULL DEFAULT 12,
  summary text NOT NULL,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  skill_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  learning_priorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_career_roadmaps_user_uid ON public.career_roadmaps(user_uid);

CREATE TABLE IF NOT EXISTS public.skills_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  skill_name text NOT NULL,
  category text NOT NULL DEFAULT 'Core',
  proficiency integer NOT NULL DEFAULT 30,
  target_proficiency integer NOT NULL DEFAULT 85,
  status text NOT NULL DEFAULT 'In Progress',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skills_progress_user_uid ON public.skills_progress(user_uid);

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Career Strategy Session',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_uid ON public.chat_conversations(user_uid);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_uid text NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_uid ON public.chat_messages(user_uid);

-- ============================================================================
-- 4. Row Level Security (strict per-user isolation)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailored_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: authenticated users can only read, insert, and update their own profile
DROP POLICY IF EXISTS "profiles_own_row" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id OR auth.uid()::text = uid);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id OR auth.uid()::text = uid);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id OR auth.uid()::text = uid)
  WITH CHECK (auth.uid() = auth_user_id OR auth.uid()::text = uid);

-- Child tables: strict owner-only policies
DROP POLICY IF EXISTS "resumes_own_row" ON public.resumes;
CREATE POLICY "resumes_own_row" ON public.resumes FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "resume_analysis_own_row" ON public.resume_analysis;
CREATE POLICY "resume_analysis_own_row" ON public.resume_analysis FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "job_matches_own_row" ON public.job_matches;
CREATE POLICY "job_matches_own_row" ON public.job_matches FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "saved_jobs_own_row" ON public.saved_jobs;
CREATE POLICY "saved_jobs_own_row" ON public.saved_jobs FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "applications_own_row" ON public.applications;
CREATE POLICY "applications_own_row" ON public.applications FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "interview_sessions_own_row" ON public.interview_sessions;
CREATE POLICY "interview_sessions_own_row" ON public.interview_sessions FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "interview_messages_own_row" ON public.interview_messages;
CREATE POLICY "interview_messages_own_row" ON public.interview_messages FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "cover_letters_own_row" ON public.cover_letters;
CREATE POLICY "cover_letters_own_row" ON public.cover_letters FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "tailored_resumes_own_row" ON public.tailored_resumes;
CREATE POLICY "tailored_resumes_own_row" ON public.tailored_resumes FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "career_roadmaps_own_row" ON public.career_roadmaps;
CREATE POLICY "career_roadmaps_own_row" ON public.career_roadmaps FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "skills_progress_own_row" ON public.skills_progress;
CREATE POLICY "skills_progress_own_row" ON public.skills_progress FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "chat_conversations_own_row" ON public.chat_conversations;
CREATE POLICY "chat_conversations_own_row" ON public.chat_conversations FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

DROP POLICY IF EXISTS "chat_messages_own_row" ON public.chat_messages;
CREATE POLICY "chat_messages_own_row" ON public.chat_messages FOR ALL TO authenticated
  USING (auth.uid()::text = user_uid) WITH CHECK (auth.uid()::text = user_uid);

-- ============================================================================
-- 5. API Role Grants & Private Resume Storage Bucket
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  5242880,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "resumes_storage_read_own" ON storage.objects;
CREATE POLICY "resumes_storage_read_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "resumes_storage_insert_own" ON storage.objects;
CREATE POLICY "resumes_storage_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "resumes_storage_delete_own" ON storage.objects;
CREATE POLICY "resumes_storage_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- 6. Reload PostgREST schema cache so public.profiles is immediately accessible
-- ============================================================================
NOTIFY pgrst, 'reload schema';
