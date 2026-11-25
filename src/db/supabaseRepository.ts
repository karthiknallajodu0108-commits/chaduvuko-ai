import {
  getSupabaseClient,
  isSupabaseMissingTableError,
  markSupabaseSchemaUnavailable,
  SupabaseSchemaError,
} from './supabase.ts';
import type {
  AnalysisPoint,
  BulletImprovement,
  KeywordAnalysisItem,
  RoadmapMilestone,
  SectionScore,
  StarFeedback,
} from './schema.ts';

interface ProfileRow {
  id: string;
  uid: string;
  email: string;
  full_name: string | null;
  headline: string | null;
  current_role: string | null;
  target_role: string | null;
  career_goal: string | null;
  years_experience: number | null;
  education: string | null;
  experience_summary: string | null;
  skills: string[] | null;
  preferred_roles: string[] | null;
  preferred_locations: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ResumeRow {
  id: string;
  user_uid: string;
  title: string;
  file_name: string;
  file_mime: string;
  file_size: number;
  extracted_text: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface ResumeAnalysisRow {
  id: string;
  resume_id: string;
  user_uid: string;
  overall_score: number;
  ats_readiness_score: number;
  impact_score: number;
  clarity_score: number;
  keyword_score: number;
  career_summary: string;
  experience_analysis: string;
  education_analysis: string;
  extracted_skills: string[] | null;
  strengths: AnalysisPoint[] | null;
  weaknesses: AnalysisPoint[] | null;
  missing_skills: string[] | null;
  keyword_analysis: KeywordAnalysisItem[] | null;
  formatting_recommendations: string[] | null;
  summary_suggestions: string[] | null;
  bullet_improvements: BulletImprovement[] | null;
  section_scores: SectionScore[] | null;
  priority_recommendations: string[] | null;
  scoring_methodology: string;
  created_at: string;
}

interface JobMatchRow {
  id: string;
  user_uid: string;
  resume_id: string | null;
  job_title: string;
  company: string;
  job_description: string;
  match_score: number;
  explanation: string;
  experience_alignment: string | null;
  qualifications_alignment: string | null;
  strengths: string[] | null;
  skill_gaps: string[] | null;
  matched_keywords: string[] | null;
  missing_keywords: string[] | null;
  resume_recommendations: string[] | null;
  interview_suggestions: string[] | null;
  created_at: string;
}

interface SavedJobRow {
  id: string;
  user_uid: string;
  job_match_id: string | null;
  job_title: string;
  company: string;
  job_url: string | null;
  location: string | null;
  notes: string | null;
  match_score: number | null;
  created_at: string;
}

interface ApplicationRow {
  id: string;
  user_uid: string;
  company: string;
  job_title: string;
  job_link: string | null;
  location: string | null;
  status: string;
  applied_date: string | null;
  next_action: string | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TailoredResumeRow {
  id: string;
  user_uid: string;
  resume_id: string | null;
  job_title: string;
  company: string | null;
  tailored_summary: string;
  tailored_content: string;
  bullet_rewrites: BulletImprovement[] | null;
  optimized_keywords: string[] | null;
  created_at: string;
  updated_at: string;
}

interface CoverLetterRow {
  id: string;
  user_uid: string;
  resume_id: string | null;
  company: string;
  job_title: string;
  tone: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface InterviewSessionRow {
  id: string;
  user_uid: string;
  job_title: string;
  company: string | null;
  category: string;
  difficulty: string;
  average_score: number | null;
  created_at: string;
  updated_at: string;
}

interface InterviewMessageRow {
  id: string;
  session_id: string;
  user_uid: string;
  question_number: number;
  question: string;
  question_type: string;
  user_answer: string | null;
  score: number | null;
  star_feedback: StarFeedback | null;
  strengths: string[] | null;
  improvements: string[] | null;
  sample_answer: string | null;
  created_at: string;
}

interface CareerRoadmapRow {
  id: string;
  user_uid: string;
  target_role: string;
  career_goal: string;
  timeline_weeks: number;
  summary: string;
  milestones: RoadmapMilestone[] | null;
  skill_gaps: string[] | null;
  learning_priorities: string[] | null;
  created_at: string;
  updated_at: string;
}

interface SkillProgressRow {
  id: string;
  user_uid: string;
  skill_name: string;
  category: string;
  proficiency: number;
  target_proficiency: number;
  status: string;
  updated_at: string;
}

interface ChatConversationRow {
  id: string;
  user_uid: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessageRow {
  id: string;
  conversation_id: string;
  user_uid: string;
  role: string;
  content: string;
  created_at: string;
}

function wrapSupabaseError(context: string, error: unknown): never {
  if (error instanceof SupabaseSchemaError) {
    throw error;
  }
  if (error instanceof Error && error.message.startsWith('Database operation failed')) {
    throw error;
  }
  const msg =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Unknown error';
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';

  console.error(`Supabase error (${context}):`, msg);

  if (isSupabaseMissingTableError(error)) {
    markSupabaseSchemaUnavailable(msg);
    throw new SupabaseSchemaError(
      "Supabase database schema is not initialized (missing table in schema cache). Run supabase/migrations/001_careerpilot_schema.sql in Supabase SQL Editor and reload the schema cache."
    );
  }

  if (code === '42501' || msg.toLowerCase().includes('row-level security')) {
    throw new Error(
      'Supabase Row Level Security blocked the server request. Configure SUPABASE_SECRET_KEY in Settings > Secrets so verified backend requests can access user-scoped records.'
    );
  }

  throw new Error('Database operation failed. Please try again shortly.', { cause: error });
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapProfileRow(row: ProfileRow) {
  return {
    id: row.id,
    uid: row.uid,
    email: row.email,
    fullName: row.full_name ?? '',
    headline: row.headline ?? '',
    currentRole: row.current_role ?? '',
    targetRole: row.target_role ?? '',
    careerGoal: row.career_goal ?? '',
    yearsExperience: typeof row.years_experience === 'number' ? row.years_experience : 0,
    education: row.education ?? '',
    experienceSummary: row.experience_summary ?? '',
    skills: toStringArray(row.skills),
    preferredRoles: toStringArray(row.preferred_roles),
    preferredLocations: toStringArray(row.preferred_locations),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapResumeRow(row: ResumeRow) {
  return {
    id: row.id,
    userUid: row.user_uid,
    title: row.title,
    fileName: row.file_name,
    fileMime: row.file_mime,
    fileSize: row.file_size,
    extractedText: row.extracted_text,
    isPrimary: Boolean(row.is_primary),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapResumeAnalysisRow(row: ResumeAnalysisRow) {
  return {
    id: row.id,
    resumeId: row.resume_id,
    userUid: row.user_uid,
    overallScore: row.overall_score,
    atsReadinessScore: row.ats_readiness_score,
    impactScore: row.impact_score,
    clarityScore: row.clarity_score,
    keywordScore: row.keyword_score,
    careerSummary: row.career_summary,
    experienceAnalysis: row.experience_analysis,
    educationAnalysis: row.education_analysis,
    extractedSkills: toStringArray(row.extracted_skills),
    strengths: toArray<AnalysisPoint>(row.strengths),
    weaknesses: toArray<AnalysisPoint>(row.weaknesses),
    missingSkills: toStringArray(row.missing_skills),
    keywordAnalysis: toArray<KeywordAnalysisItem>(row.keyword_analysis),
    formattingRecommendations: toStringArray(row.formatting_recommendations),
    summarySuggestions: toStringArray(row.summary_suggestions),
    bulletImprovements: toArray<BulletImprovement>(row.bullet_improvements),
    sectionScores: toArray<SectionScore>(row.section_scores),
    priorityRecommendations: toStringArray(row.priority_recommendations),
    scoringMethodology: row.scoring_methodology,
    createdAt: new Date(row.created_at),
  };
}

function mapJobMatchRow(row: JobMatchRow) {
  return {
    id: row.id,
    userUid: row.user_uid,
    resumeId: row.resume_id,
    jobTitle: row.job_title,
    company: row.company,
    jobDescription: row.job_description,
    matchScore: row.match_score,
    explanation: row.explanation,
    experienceAlignment: row.experience_alignment ?? '',
    qualificationsAlignment: row.qualifications_alignment ?? '',
    strengths: toStringArray(row.strengths),
    skillGaps: toStringArray(row.skill_gaps),
    matchedKeywords: toStringArray(row.matched_keywords),
    missingKeywords: toStringArray(row.missing_keywords),
    resumeRecommendations: toStringArray(row.resume_recommendations),
    interviewSuggestions: toStringArray(row.interview_suggestions),
    createdAt: new Date(row.created_at),
  };
}

function mapSavedJobRow(row: SavedJobRow) {
  return {
    id: row.id,
    userUid: row.user_uid,
    jobMatchId: row.job_match_id,
    jobTitle: row.job_title,
    company: row.company,
    jobUrl: row.job_url ?? '',
    location: row.location ?? '',
    notes: row.notes ?? '',
    matchScore: row.match_score,
    createdAt: new Date(row.created_at),
  };
}

function mapApplicationRow(row: ApplicationRow) {
  return {
    id: row.id,
    userUid: row.user_uid,
    company: row.company,
    jobTitle: row.job_title,
    jobLink: row.job_link ?? '',
    location: row.location ?? '',
    status: row.status,
    appliedDate: row.applied_date ?? '',
    nextAction: row.next_action ?? '',
    followUpDate: row.follow_up_date ?? '',
    notes: row.notes ?? '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapTailoredResumeRow(row: TailoredResumeRow) {
  return {
    id: row.id,
    userUid: row.user_uid,
    resumeId: row.resume_id,
    jobTitle: row.job_title,
    company: row.company ?? '',
    tailoredSummary: row.tailored_summary,
    tailoredContent: row.tailored_content,
    bulletRewrites: toArray<BulletImprovement>(row.bullet_rewrites),
    optimizedKeywords: toStringArray(row.optimized_keywords),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapCoverLetterRow(row: CoverLetterRow) {
  return {
    id: row.id,
    userUid: row.user_uid,
    resumeId: row.resume_id,
    company: row.company,
    jobTitle: row.job_title,
    tone: row.tone,
    content: row.content,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapInterviewSessionRow(row: InterviewSessionRow) {
  return {
    id: row.id,
    userUid: row.user_uid,
    jobTitle: row.job_title,
    company: row.company ?? '',
    category: row.category,
    difficulty: row.difficulty,
    averageScore: row.average_score,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapInterviewMessageRow(row: InterviewMessageRow) {
  return {
    id: row.id,
    sessionId: row.session_id,
    userUid: row.user_uid,
    questionNumber: row.question_number,
    question: row.question,
    questionType: row.question_type,
    userAnswer: row.user_answer ?? '',
    score: row.score,
    starFeedback: row.star_feedback ?? null,
    strengths: toStringArray(row.strengths),
    improvements: toStringArray(row.improvements),
    sampleAnswer: row.sample_answer ?? '',
    createdAt: new Date(row.created_at),
  };
}

function mapCareerRoadmapRow(row: CareerRoadmapRow) {
  return {
    id: row.id,
    userUid: row.user_uid,
    targetRole: row.target_role,
    careerGoal: row.career_goal,
    timelineWeeks: row.timeline_weeks,
    summary: row.summary,
    milestones: toArray<RoadmapMilestone>(row.milestones),
    skillGaps: toStringArray(row.skill_gaps),
    learningPriorities: toStringArray(row.learning_priorities),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapSkillProgressRow(row: SkillProgressRow) {
  return {
    id: row.id,
    userUid: row.user_uid,
    skillName: row.skill_name,
    category: row.category,
    proficiency: row.proficiency,
    targetProficiency: row.target_proficiency,
    status: row.status,
    updatedAt: new Date(row.updated_at),
  };
}

function mapChatConversationRow(row: ChatConversationRow) {
  return {
    id: row.id,
    userUid: row.user_uid,
    title: row.title,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapChatMessageRow(row: ChatMessageRow) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userUid: row.user_uid,
    role: row.role,
    content: row.content,
    createdAt: new Date(row.created_at),
  };
}

// ============================================================================
// Profiles CRUD
// ============================================================================

export async function sbGetOrCreateProfile(uid: string, email: string, fullName = '') {
  const cleanUid = uid.trim();
  if (!cleanUid) {
    throw new Error('Authenticated user ID is required to load or create a profile.');
  }

  try {
    const supabase = getSupabaseClient();
    const { data: existing, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('uid', cleanUid)
      .maybeSingle<ProfileRow>();

    if (selectError) wrapSupabaseError('sbGetOrCreateProfile:select', selectError);
    if (existing) return mapProfileRow(existing);

    const safeEmail = email.trim();
    const safeFullName = fullName.trim() || (safeEmail ? safeEmail.split('@')[0] : '');

    // Concurrency-safe insert: ignoreDuplicates prevents parallel first-login requests
    // from racing or overwriting a user's saved profile fields.
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          uid: cleanUid,
          email: safeEmail,
          full_name: safeFullName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'uid', ignoreDuplicates: true }
      );

    if (upsertError) wrapSupabaseError('sbGetOrCreateProfile:upsert', upsertError);

    const { data: profile, error: refetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('uid', cleanUid)
      .single<ProfileRow>();

    if (refetchError || !profile) {
      wrapSupabaseError('sbGetOrCreateProfile:refetch', refetchError);
    }
    return mapProfileRow(profile);
  } catch (error) {
    wrapSupabaseError('sbGetOrCreateProfile', error);
  }
}

export async function sbUpdateProfile(
  uid: string,
  data: {
    fullName?: string;
    headline?: string;
    currentRole?: string;
    targetRole?: string;
    careerGoal?: string;
    yearsExperience?: number;
    education?: string;
    experienceSummary?: string;
    skills?: string[];
    preferredRoles?: string[];
    preferredLocations?: string[];
  }
) {
  try {
    const supabase = getSupabaseClient();
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.fullName !== undefined) updatePayload.full_name = data.fullName;
    if (data.headline !== undefined) updatePayload.headline = data.headline;
    if (data.currentRole !== undefined) updatePayload.current_role = data.currentRole;
    if (data.targetRole !== undefined) updatePayload.target_role = data.targetRole;
    if (data.careerGoal !== undefined) updatePayload.career_goal = data.careerGoal;
    if (data.yearsExperience !== undefined) updatePayload.years_experience = data.yearsExperience;
    if (data.education !== undefined) updatePayload.education = data.education;
    if (data.experienceSummary !== undefined) updatePayload.experience_summary = data.experienceSummary;
    if (data.skills !== undefined) updatePayload.skills = data.skills;
    if (data.preferredRoles !== undefined) updatePayload.preferred_roles = data.preferredRoles;
    if (data.preferredLocations !== undefined) updatePayload.preferred_locations = data.preferredLocations;

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('uid', uid)
      .select('*')
      .maybeSingle<ProfileRow>();

    if (error) wrapSupabaseError('sbUpdateProfile', error);
    return updated ? mapProfileRow(updated) : null;
  } catch (error) {
    wrapSupabaseError('sbUpdateProfile', error);
  }
}

// ============================================================================
// Resumes CRUD
// ============================================================================

export async function sbListResumes(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_uid', uid)
      .order('created_at', { ascending: false })
      .returns<ResumeRow[]>();

    if (error) wrapSupabaseError('sbListResumes', error);
    return (data ?? []).map(mapResumeRow);
  } catch (error) {
    wrapSupabaseError('sbListResumes', error);
  }
}

export async function sbGetResumeById(uid: string, resumeId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .eq('user_uid', uid)
      .maybeSingle<ResumeRow>();

    if (error) wrapSupabaseError('sbGetResumeById', error);
    return data ? mapResumeRow(data) : null;
  } catch (error) {
    wrapSupabaseError('sbGetResumeById', error);
  }
}

export async function sbCreateResume(
  uid: string,
  input: {
    title: string;
    fileName: string;
    fileMime: string;
    fileSize: number;
    extractedText: string;
    isPrimary?: boolean;
  }
) {
  try {
    const supabase = getSupabaseClient();
    if (input.isPrimary) {
      const { error: resetError } = await supabase
        .from('resumes')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('user_uid', uid);
      if (resetError) wrapSupabaseError('sbCreateResume:resetPrimary', resetError);
    }

    const { data: existing, error: existingError } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_uid', uid)
      .limit(1);
    if (existingError) wrapSupabaseError('sbCreateResume:checkExisting', existingError);

    const shouldBePrimary = input.isPrimary ?? (existing?.length ?? 0) === 0;
    const { data: inserted, error: insertError } = await supabase
      .from('resumes')
      .insert({
        user_uid: uid,
        title: input.title,
        file_name: input.fileName,
        file_mime: input.fileMime,
        file_size: input.fileSize,
        extracted_text: input.extractedText,
        is_primary: shouldBePrimary,
      })
      .select('*')
      .single<ResumeRow>();

    if (insertError || !inserted) wrapSupabaseError('sbCreateResume:insert', insertError);
    return mapResumeRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbCreateResume', error);
  }
}

export async function sbUpdateResume(
  uid: string,
  resumeId: string,
  input: Partial<{ title: string; isPrimary: boolean }>
) {
  try {
    const supabase = getSupabaseClient();
    if (input.isPrimary) {
      const { error: resetError } = await supabase
        .from('resumes')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('user_uid', uid);
      if (resetError) wrapSupabaseError('sbUpdateResume:resetPrimary', resetError);
    }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.isPrimary !== undefined) updatePayload.is_primary = input.isPrimary;

    const { data: updated, error } = await supabase
      .from('resumes')
      .update(updatePayload)
      .eq('id', resumeId)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<ResumeRow>();

    if (error) wrapSupabaseError('sbUpdateResume', error);
    return updated ? mapResumeRow(updated) : null;
  } catch (error) {
    wrapSupabaseError('sbUpdateResume', error);
  }
}

export async function sbDeleteResume(uid: string, resumeId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: deleted, error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', resumeId)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<ResumeRow>();

    if (error) wrapSupabaseError('sbDeleteResume', error);
    return deleted ? mapResumeRow(deleted) : null;
  } catch (error) {
    wrapSupabaseError('sbDeleteResume', error);
  }
}

// ============================================================================
// Resume Analyses CRUD
// ============================================================================

export async function sbListResumeAnalyses(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('resume_analysis')
      .select('*')
      .eq('user_uid', uid)
      .order('created_at', { ascending: false })
      .returns<ResumeAnalysisRow[]>();

    if (error) wrapSupabaseError('sbListResumeAnalyses', error);
    return (data ?? []).map(mapResumeAnalysisRow);
  } catch (error) {
    wrapSupabaseError('sbListResumeAnalyses', error);
  }
}

export async function sbCreateResumeAnalysis(
  uid: string,
  input: {
    resumeId: string;
    overallScore: number;
    atsReadinessScore: number;
    impactScore: number;
    clarityScore: number;
    keywordScore: number;
    careerSummary: string;
    experienceAnalysis: string;
    educationAnalysis: string;
    extractedSkills: string[];
    strengths: AnalysisPoint[];
    weaknesses: AnalysisPoint[];
    missingSkills: string[];
    keywordAnalysis: KeywordAnalysisItem[];
    formattingRecommendations: string[];
    summarySuggestions: string[];
    bulletImprovements: BulletImprovement[];
    sectionScores: SectionScore[];
    priorityRecommendations: string[];
    scoringMethodology: string;
  }
) {
  try {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('resume_analysis')
      .insert({
        user_uid: uid,
        resume_id: input.resumeId,
        overall_score: input.overallScore,
        ats_readiness_score: input.atsReadinessScore,
        impact_score: input.impactScore,
        clarity_score: input.clarityScore,
        keyword_score: input.keywordScore,
        career_summary: input.careerSummary,
        experience_analysis: input.experienceAnalysis,
        education_analysis: input.educationAnalysis,
        extracted_skills: input.extractedSkills,
        strengths: input.strengths,
        weaknesses: input.weaknesses,
        missing_skills: input.missingSkills,
        keyword_analysis: input.keywordAnalysis,
        formatting_recommendations: input.formattingRecommendations,
        summary_suggestions: input.summarySuggestions,
        bullet_improvements: input.bulletImprovements,
        section_scores: input.sectionScores,
        priority_recommendations: input.priorityRecommendations,
        scoring_methodology: input.scoringMethodology,
      })
      .select('*')
      .single<ResumeAnalysisRow>();

    if (error || !inserted) wrapSupabaseError('sbCreateResumeAnalysis', error);
    return mapResumeAnalysisRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbCreateResumeAnalysis', error);
  }
}

// ============================================================================
// Job Matches & Saved Jobs CRUD
// ============================================================================

export async function sbListJobMatches(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('job_matches')
      .select('*')
      .eq('user_uid', uid)
      .order('created_at', { ascending: false })
      .returns<JobMatchRow[]>();

    if (error) wrapSupabaseError('sbListJobMatches', error);
    return (data ?? []).map(mapJobMatchRow);
  } catch (error) {
    wrapSupabaseError('sbListJobMatches', error);
  }
}

export async function sbCreateJobMatch(
  uid: string,
  input: {
    resumeId?: string | null;
    jobTitle: string;
    company: string;
    jobDescription: string;
    matchScore: number;
    explanation: string;
    experienceAlignment?: string;
    qualificationsAlignment?: string;
    strengths: string[];
    skillGaps: string[];
    matchedKeywords: string[];
    missingKeywords: string[];
    resumeRecommendations: string[];
    interviewSuggestions: string[];
  }
) {
  try {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('job_matches')
      .insert({
        user_uid: uid,
        resume_id: input.resumeId ?? null,
        job_title: input.jobTitle,
        company: input.company,
        job_description: input.jobDescription,
        match_score: input.matchScore,
        explanation: input.explanation,
        experience_alignment: input.experienceAlignment ?? '',
        qualifications_alignment: input.qualificationsAlignment ?? '',
        strengths: input.strengths,
        skill_gaps: input.skillGaps,
        matched_keywords: input.matchedKeywords,
        missing_keywords: input.missingKeywords,
        resume_recommendations: input.resumeRecommendations,
        interview_suggestions: input.interviewSuggestions,
      })
      .select('*')
      .single<JobMatchRow>();

    if (error || !inserted) wrapSupabaseError('sbCreateJobMatch', error);
    return mapJobMatchRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbCreateJobMatch', error);
  }
}

export async function sbListSavedJobs(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_uid', uid)
      .order('created_at', { ascending: false })
      .returns<SavedJobRow[]>();

    if (error) wrapSupabaseError('sbListSavedJobs', error);
    return (data ?? []).map(mapSavedJobRow);
  } catch (error) {
    wrapSupabaseError('sbListSavedJobs', error);
  }
}

export async function sbCreateSavedJob(
  uid: string,
  input: {
    jobMatchId?: string | null;
    jobTitle: string;
    company: string;
    jobUrl?: string;
    location?: string;
    notes?: string;
    matchScore?: number | null;
  }
) {
  try {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('saved_jobs')
      .insert({
        user_uid: uid,
        job_match_id: input.jobMatchId ?? null,
        job_title: input.jobTitle,
        company: input.company,
        job_url: input.jobUrl ?? '',
        location: input.location ?? '',
        notes: input.notes ?? '',
        match_score: input.matchScore ?? null,
      })
      .select('*')
      .single<SavedJobRow>();

    if (error || !inserted) wrapSupabaseError('sbCreateSavedJob', error);
    return mapSavedJobRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbCreateSavedJob', error);
  }
}

export async function sbDeleteSavedJob(uid: string, id: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: deleted, error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('id', id)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<SavedJobRow>();

    if (error) wrapSupabaseError('sbDeleteSavedJob', error);
    return deleted ? mapSavedJobRow(deleted) : null;
  } catch (error) {
    wrapSupabaseError('sbDeleteSavedJob', error);
  }
}

// ============================================================================
// Applications CRUD
// ============================================================================

export async function sbListApplications(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_uid', uid)
      .order('updated_at', { ascending: false })
      .returns<ApplicationRow[]>();

    if (error) wrapSupabaseError('sbListApplications', error);
    return (data ?? []).map(mapApplicationRow);
  } catch (error) {
    wrapSupabaseError('sbListApplications', error);
  }
}

export async function sbCreateApplication(
  uid: string,
  input: {
    company: string;
    jobTitle: string;
    jobLink?: string;
    location?: string;
    status?: string;
    appliedDate?: string;
    nextAction?: string;
    followUpDate?: string;
    notes?: string;
  }
) {
  try {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('applications')
      .insert({
        user_uid: uid,
        company: input.company,
        job_title: input.jobTitle,
        job_link: input.jobLink ?? '',
        location: input.location ?? '',
        status: input.status ?? 'Interested',
        applied_date: input.appliedDate ?? '',
        next_action: input.nextAction ?? '',
        follow_up_date: input.followUpDate ?? '',
        notes: input.notes ?? '',
      })
      .select('*')
      .single<ApplicationRow>();

    if (error || !inserted) wrapSupabaseError('sbCreateApplication', error);
    return mapApplicationRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbCreateApplication', error);
  }
}

export async function sbUpdateApplication(
  uid: string,
  id: string,
  input: Partial<{
    company: string;
    jobTitle: string;
    jobLink: string;
    location: string;
    status: string;
    appliedDate: string;
    nextAction: string;
    followUpDate: string;
    notes: string;
  }>
) {
  try {
    const supabase = getSupabaseClient();
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.company !== undefined) updatePayload.company = input.company;
    if (input.jobTitle !== undefined) updatePayload.job_title = input.jobTitle;
    if (input.jobLink !== undefined) updatePayload.job_link = input.jobLink;
    if (input.location !== undefined) updatePayload.location = input.location;
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.appliedDate !== undefined) updatePayload.applied_date = input.appliedDate;
    if (input.nextAction !== undefined) updatePayload.next_action = input.nextAction;
    if (input.followUpDate !== undefined) updatePayload.follow_up_date = input.followUpDate;
    if (input.notes !== undefined) updatePayload.notes = input.notes;

    const { data: updated, error } = await supabase
      .from('applications')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<ApplicationRow>();

    if (error) wrapSupabaseError('sbUpdateApplication', error);
    return updated ? mapApplicationRow(updated) : null;
  } catch (error) {
    wrapSupabaseError('sbUpdateApplication', error);
  }
}

export async function sbDeleteApplication(uid: string, id: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: deleted, error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<ApplicationRow>();

    if (error) wrapSupabaseError('sbDeleteApplication', error);
    return deleted ? mapApplicationRow(deleted) : null;
  } catch (error) {
    wrapSupabaseError('sbDeleteApplication', error);
  }
}

// ============================================================================
// Tailored Resumes CRUD
// ============================================================================

export async function sbListTailoredResumes(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('tailored_resumes')
      .select('*')
      .eq('user_uid', uid)
      .order('updated_at', { ascending: false })
      .returns<TailoredResumeRow[]>();

    if (error) wrapSupabaseError('sbListTailoredResumes', error);
    return (data ?? []).map(mapTailoredResumeRow);
  } catch (error) {
    wrapSupabaseError('sbListTailoredResumes', error);
  }
}

export async function sbCreateTailoredResume(
  uid: string,
  input: {
    resumeId?: string | null;
    jobTitle: string;
    company?: string;
    tailoredSummary: string;
    tailoredContent: string;
    bulletRewrites: BulletImprovement[];
    optimizedKeywords: string[];
  }
) {
  try {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('tailored_resumes')
      .insert({
        user_uid: uid,
        resume_id: input.resumeId ?? null,
        job_title: input.jobTitle,
        company: input.company ?? '',
        tailored_summary: input.tailoredSummary,
        tailored_content: input.tailoredContent,
        bullet_rewrites: input.bulletRewrites,
        optimized_keywords: input.optimizedKeywords,
      })
      .select('*')
      .single<TailoredResumeRow>();

    if (error || !inserted) wrapSupabaseError('sbCreateTailoredResume', error);
    return mapTailoredResumeRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbCreateTailoredResume', error);
  }
}

export async function sbUpdateTailoredResume(
  uid: string,
  id: string,
  tailoredContent: string,
  tailoredSummary?: string
) {
  try {
    const supabase = getSupabaseClient();
    const { data: updated, error } = await supabase
      .from('tailored_resumes')
      .update({
        tailored_content: tailoredContent,
        ...(tailoredSummary !== undefined ? { tailored_summary: tailoredSummary } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<TailoredResumeRow>();

    if (error) wrapSupabaseError('sbUpdateTailoredResume', error);
    return updated ? mapTailoredResumeRow(updated) : null;
  } catch (error) {
    wrapSupabaseError('sbUpdateTailoredResume', error);
  }
}

// ============================================================================
// Cover Letters CRUD
// ============================================================================

export async function sbListCoverLetters(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('user_uid', uid)
      .order('updated_at', { ascending: false })
      .returns<CoverLetterRow[]>();

    if (error) wrapSupabaseError('sbListCoverLetters', error);
    return (data ?? []).map(mapCoverLetterRow);
  } catch (error) {
    wrapSupabaseError('sbListCoverLetters', error);
  }
}

export async function sbCreateCoverLetter(
  uid: string,
  input: {
    resumeId?: string | null;
    company: string;
    jobTitle: string;
    tone: string;
    content: string;
  }
) {
  try {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('cover_letters')
      .insert({
        user_uid: uid,
        resume_id: input.resumeId ?? null,
        company: input.company,
        job_title: input.jobTitle,
        tone: input.tone,
        content: input.content,
      })
      .select('*')
      .single<CoverLetterRow>();

    if (error || !inserted) wrapSupabaseError('sbCreateCoverLetter', error);
    return mapCoverLetterRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbCreateCoverLetter', error);
  }
}

export async function sbUpdateCoverLetter(uid: string, id: string, content: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: updated, error } = await supabase
      .from('cover_letters')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<CoverLetterRow>();

    if (error) wrapSupabaseError('sbUpdateCoverLetter', error);
    return updated ? mapCoverLetterRow(updated) : null;
  } catch (error) {
    wrapSupabaseError('sbUpdateCoverLetter', error);
  }
}

export async function sbDeleteCoverLetter(uid: string, id: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: deleted, error } = await supabase
      .from('cover_letters')
      .delete()
      .eq('id', id)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<CoverLetterRow>();

    if (error) wrapSupabaseError('sbDeleteCoverLetter', error);
    return deleted ? mapCoverLetterRow(deleted) : null;
  } catch (error) {
    wrapSupabaseError('sbDeleteCoverLetter', error);
  }
}

// ============================================================================
// Interview Sessions & Messages CRUD
// ============================================================================

export async function sbListInterviewSessions(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('user_uid', uid)
      .order('updated_at', { ascending: false })
      .returns<InterviewSessionRow[]>();

    if (error) wrapSupabaseError('sbListInterviewSessions', error);
    return (data ?? []).map(mapInterviewSessionRow);
  } catch (error) {
    wrapSupabaseError('sbListInterviewSessions', error);
  }
}

export async function sbGetInterviewSessionWithMessages(uid: string, sessionId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: session, error: sessError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_uid', uid)
      .maybeSingle<InterviewSessionRow>();

    if (sessError) wrapSupabaseError('sbGetInterviewSessionWithMessages:session', sessError);
    if (!session) return null;

    const { data: messages, error: msgError } = await supabase
      .from('interview_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_uid', uid)
      .order('question_number', { ascending: true })
      .returns<InterviewMessageRow[]>();

    if (msgError) wrapSupabaseError('sbGetInterviewSessionWithMessages:messages', msgError);
    return {
      session: mapInterviewSessionRow(session),
      messages: (messages ?? []).map(mapInterviewMessageRow),
    };
  } catch (error) {
    wrapSupabaseError('sbGetInterviewSessionWithMessages', error);
  }
}

export async function sbCreateInterviewSessionWithQuestions(
  uid: string,
  input: {
    jobTitle: string;
    company?: string;
    category: string;
    difficulty: string;
    questions: { question: string; questionType: string; sampleAnswer: string }[];
  }
) {
  try {
    const supabase = getSupabaseClient();
    const { data: session, error: sessError } = await supabase
      .from('interview_sessions')
      .insert({
        user_uid: uid,
        job_title: input.jobTitle,
        company: input.company ?? '',
        category: input.category,
        difficulty: input.difficulty,
      })
      .select('*')
      .single<InterviewSessionRow>();

    if (sessError || !session) wrapSupabaseError('sbCreateInterviewSession:session', sessError);

    const { data: messageRows, error: msgError } = await supabase
      .from('interview_messages')
      .insert(
        input.questions.map((q, idx) => ({
          session_id: session.id,
          user_uid: uid,
          question_number: idx + 1,
          question: q.question,
          question_type: q.questionType,
          sample_answer: q.sampleAnswer,
        }))
      )
      .select('*')
      .returns<InterviewMessageRow[]>();

    if (msgError) wrapSupabaseError('sbCreateInterviewSession:messages', msgError);
    return {
      session: mapInterviewSessionRow(session),
      messages: (messageRows ?? []).map(mapInterviewMessageRow),
    };
  } catch (error) {
    wrapSupabaseError('sbCreateInterviewSessionWithQuestions', error);
  }
}

export async function sbSaveInterviewAnswerEvaluation(
  uid: string,
  sessionId: string,
  messageId: string,
  evaluation: {
    userAnswer: string;
    score: number;
    starFeedback: StarFeedback;
    strengths: string[];
    improvements: string[];
    sampleAnswer: string;
  }
) {
  try {
    const supabase = getSupabaseClient();
    const { data: updatedMessage, error: updateError } = await supabase
      .from('interview_messages')
      .update({
        user_answer: evaluation.userAnswer,
        score: evaluation.score,
        star_feedback: evaluation.starFeedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        sample_answer: evaluation.sampleAnswer,
      })
      .eq('id', messageId)
      .eq('session_id', sessionId)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<InterviewMessageRow>();

    if (updateError) wrapSupabaseError('sbSaveInterviewAnswerEvaluation:update', updateError);
    if (!updatedMessage) return null;

    const { data: allMsgs, error: avgError } = await supabase
      .from('interview_messages')
      .select('score')
      .eq('session_id', sessionId)
      .eq('user_uid', uid);

    if (avgError) wrapSupabaseError('sbSaveInterviewAnswerEvaluation:avg', avgError);

    const scored = (allMsgs ?? [])
      .filter((m) => typeof m.score === 'number')
      .map((m) => m.score as number);
    const avg = scored.length > 0 ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;

    await supabase
      .from('interview_sessions')
      .update({ average_score: avg, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_uid', uid);

    return { message: mapInterviewMessageRow(updatedMessage), averageScore: avg };
  } catch (error) {
    wrapSupabaseError('sbSaveInterviewAnswerEvaluation', error);
  }
}

// ============================================================================
// Career Roadmaps & Skills Progress CRUD
// ============================================================================

export async function sbListCareerRoadmaps(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('career_roadmaps')
      .select('*')
      .eq('user_uid', uid)
      .order('updated_at', { ascending: false })
      .returns<CareerRoadmapRow[]>();

    if (error) wrapSupabaseError('sbListCareerRoadmaps', error);
    return (data ?? []).map(mapCareerRoadmapRow);
  } catch (error) {
    wrapSupabaseError('sbListCareerRoadmaps', error);
  }
}

export async function sbCreateCareerRoadmap(
  uid: string,
  input: {
    targetRole: string;
    careerGoal: string;
    timelineWeeks: number;
    summary: string;
    milestones: RoadmapMilestone[];
    skillGaps: string[];
    learningPriorities?: string[];
  }
) {
  try {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('career_roadmaps')
      .insert({
        user_uid: uid,
        target_role: input.targetRole,
        career_goal: input.careerGoal,
        timeline_weeks: input.timelineWeeks,
        summary: input.summary,
        milestones: input.milestones,
        skill_gaps: input.skillGaps,
        learning_priorities: input.learningPriorities ?? [],
      })
      .select('*')
      .single<CareerRoadmapRow>();

    if (error || !inserted) wrapSupabaseError('sbCreateCareerRoadmap', error);
    return mapCareerRoadmapRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbCreateCareerRoadmap', error);
  }
}

export async function sbUpdateCareerRoadmapMilestones(
  uid: string,
  roadmapId: string,
  milestones: RoadmapMilestone[]
) {
  try {
    const supabase = getSupabaseClient();
    const { data: updated, error } = await supabase
      .from('career_roadmaps')
      .update({ milestones, updated_at: new Date().toISOString() })
      .eq('id', roadmapId)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<CareerRoadmapRow>();

    if (error) wrapSupabaseError('sbUpdateCareerRoadmapMilestones', error);
    return updated ? mapCareerRoadmapRow(updated) : null;
  } catch (error) {
    wrapSupabaseError('sbUpdateCareerRoadmapMilestones', error);
  }
}

export async function sbListSkillsProgress(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('skills_progress')
      .select('*')
      .eq('user_uid', uid)
      .order('updated_at', { ascending: false })
      .returns<SkillProgressRow[]>();

    if (error) wrapSupabaseError('sbListSkillsProgress', error);
    return (data ?? []).map(mapSkillProgressRow);
  } catch (error) {
    wrapSupabaseError('sbListSkillsProgress', error);
  }
}

export async function sbUpsertSkillProgress(
  uid: string,
  input: {
    id?: string;
    skillName: string;
    category: string;
    proficiency: number;
    targetProficiency: number;
    status: string;
  }
) {
  try {
    const supabase = getSupabaseClient();
    if (input.id) {
      const { data: updated, error } = await supabase
        .from('skills_progress')
        .update({
          skill_name: input.skillName,
          category: input.category,
          proficiency: input.proficiency,
          target_proficiency: input.targetProficiency,
          status: input.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('user_uid', uid)
        .select('*')
        .maybeSingle<SkillProgressRow>();

      if (error) wrapSupabaseError('sbUpsertSkillProgress:update', error);
      return updated ? mapSkillProgressRow(updated) : null;
    }

    const { data: inserted, error } = await supabase
      .from('skills_progress')
      .insert({
        user_uid: uid,
        skill_name: input.skillName,
        category: input.category,
        proficiency: input.proficiency,
        target_proficiency: input.targetProficiency,
        status: input.status,
      })
      .select('*')
      .single<SkillProgressRow>();

    if (error || !inserted) wrapSupabaseError('sbUpsertSkillProgress:insert', error);
    return mapSkillProgressRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbUpsertSkillProgress', error);
  }
}

export async function sbDeleteSkillProgress(uid: string, id: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: deleted, error } = await supabase
      .from('skills_progress')
      .delete()
      .eq('id', id)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<SkillProgressRow>();

    if (error) wrapSupabaseError('sbDeleteSkillProgress', error);
    return deleted ? mapSkillProgressRow(deleted) : null;
  } catch (error) {
    wrapSupabaseError('sbDeleteSkillProgress', error);
  }
}

// ============================================================================
// Chat Conversations & Messages CRUD
// ============================================================================

export async function sbListChatConversations(uid: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_uid', uid)
      .order('updated_at', { ascending: false })
      .returns<ChatConversationRow[]>();

    if (error) wrapSupabaseError('sbListChatConversations', error);
    return (data ?? []).map(mapChatConversationRow);
  } catch (error) {
    wrapSupabaseError('sbListChatConversations', error);
  }
}

export async function sbCreateChatConversation(uid: string, title: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('chat_conversations')
      .insert({ user_uid: uid, title })
      .select('*')
      .single<ChatConversationRow>();

    if (error || !inserted) wrapSupabaseError('sbCreateChatConversation', error);
    return mapChatConversationRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbCreateChatConversation', error);
  }
}

export async function sbDeleteChatConversation(uid: string, id: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: deleted, error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', id)
      .eq('user_uid', uid)
      .select('*')
      .maybeSingle<ChatConversationRow>();

    if (error) wrapSupabaseError('sbDeleteChatConversation', error);
    return deleted ? mapChatConversationRow(deleted) : null;
  } catch (error) {
    wrapSupabaseError('sbDeleteChatConversation', error);
  }
}

export async function sbListChatMessages(uid: string, conversationId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_uid', uid)
      .order('created_at', { ascending: true })
      .returns<ChatMessageRow[]>();

    if (error) wrapSupabaseError('sbListChatMessages', error);
    return (data ?? []).map(mapChatMessageRow);
  } catch (error) {
    wrapSupabaseError('sbListChatMessages', error);
  }
}

export async function sbAddChatMessage(
  uid: string,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  try {
    const supabase = getSupabaseClient();
    const { data: inserted, error } = await supabase
      .from('chat_messages')
      .insert({
        user_uid: uid,
        conversation_id: conversationId,
        role,
        content,
      })
      .select('*')
      .single<ChatMessageRow>();

    if (error || !inserted) wrapSupabaseError('sbAddChatMessage', error);

    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_uid', uid);

    return mapChatMessageRow(inserted);
  } catch (error) {
    wrapSupabaseError('sbAddChatMessage', error);
  }
}
