import { and, desc, eq } from 'drizzle-orm';
import { db, isCloudSqlConfigured } from './index.ts';
import {
  profiles,
  resumes,
  resumeAnalysis,
  jobMatches,
  savedJobs,
  applications,
  interviewSessions,
  interviewMessages,
  coverLetters,
  tailoredResumes,
  careerRoadmaps,
  skillsProgress,
  chatConversations,
  chatMessages,
  type AnalysisPoint,
  type KeywordAnalysisItem,
  type BulletImprovement,
  type SectionScore,
  type StarFeedback,
  type RoadmapMilestone,
} from './schema.ts';
import {
  isSupabaseConfigured,
  isSupabaseSchemaReady,
  SupabaseSchemaError,
} from './supabase.ts';
import {
  sbGetOrCreateProfile,
  sbUpdateProfile,
  sbListResumes,
  sbGetResumeById,
  sbCreateResume,
  sbUpdateResume,
  sbDeleteResume,
  sbListResumeAnalyses,
  sbCreateResumeAnalysis,
  sbListJobMatches,
  sbCreateJobMatch,
  sbListSavedJobs,
  sbCreateSavedJob,
  sbDeleteSavedJob,
  sbListApplications,
  sbCreateApplication,
  sbUpdateApplication,
  sbDeleteApplication,
  sbListTailoredResumes,
  sbCreateTailoredResume,
  sbUpdateTailoredResume,
  sbListCoverLetters,
  sbCreateCoverLetter,
  sbUpdateCoverLetter,
  sbDeleteCoverLetter,
  sbListInterviewSessions,
  sbGetInterviewSessionWithMessages,
  sbCreateInterviewSessionWithQuestions,
  sbSaveInterviewAnswerEvaluation,
  sbListCareerRoadmaps,
  sbCreateCareerRoadmap,
  sbUpdateCareerRoadmapMilestones,
  sbListSkillsProgress,
  sbUpsertSkillProgress,
  sbDeleteSkillProgress,
  sbListChatConversations,
  sbCreateChatConversation,
  sbDeleteChatConversation,
  sbListChatMessages,
  sbAddChatMessage,
} from './supabaseRepository.ts';

async function shouldUseSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }
  const ready = await isSupabaseSchemaReady();
  if (ready) {
    return true;
  }
  if (isCloudSqlConfigured()) {
    return false;
  }
  throw new SupabaseSchemaError(
    "Supabase table 'public.profiles' was not found in the schema cache. Run supabase/migrations/001_careerpilot_schema.sql in Supabase SQL Editor and reload the schema cache."
  );
}

function wrapDbError(context: string, error: unknown): never {
  if (error instanceof SupabaseSchemaError) {
    throw error;
  }
  console.error(`Database error (${context}):`, error instanceof Error ? error.message : 'Unknown error');
  throw new Error('Database operation failed. Please try again shortly.', { cause: error });
}

export async function getOrCreateProfile(uid: string, email: string, fullName = '') {
  if (await shouldUseSupabase()) {
    return await sbGetOrCreateProfile(uid, email, fullName);
  }

  try {
    const existing = await db.select().from(profiles).where(eq(profiles.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }

    const inserted = await db
      .insert(profiles)
      .values({
        uid,
        email,
        fullName: fullName || email.split('@')[0] || '',
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: { email, updatedAt: new Date() },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    wrapDbError('getOrCreateProfile', error);
  }
}

export async function updateProfile(
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
  if (await shouldUseSupabase()) {
    return await sbUpdateProfile(uid, data);
  }

  try {
    const updated = await db
      .update(profiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(profiles.uid, uid))
      .returning();

    return updated[0] ?? null;
  } catch (error) {
    wrapDbError('updateProfile', error);
  }
}

export async function listResumes(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListResumes(uid);
  }

  try {
    return await db
      .select()
      .from(resumes)
      .where(eq(resumes.userUid, uid))
      .orderBy(desc(resumes.createdAt));
  } catch (error) {
    wrapDbError('listResumes', error);
  }
}

export async function getResumeById(uid: string, resumeId: string) {
  if (await shouldUseSupabase()) {
    return await sbGetResumeById(uid, resumeId);
  }

  try {
    const rows = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userUid, uid)))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    wrapDbError('getResumeById', error);
  }
}

export async function createResume(
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
  if (await shouldUseSupabase()) {
    return await sbCreateResume(uid, input);
  }

  try {
    if (input.isPrimary) {
      await db
        .update(resumes)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(resumes.userUid, uid));
    }

    const existing = await db.select({ id: resumes.id }).from(resumes).where(eq(resumes.userUid, uid)).limit(1);
    const shouldBePrimary = input.isPrimary ?? existing.length === 0;

    const inserted = await db
      .insert(resumes)
      .values({
        userUid: uid,
        title: input.title,
        fileName: input.fileName,
        fileMime: input.fileMime,
        fileSize: input.fileSize,
        extractedText: input.extractedText,
        isPrimary: shouldBePrimary,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    wrapDbError('createResume', error);
  }
}

export async function updateResume(
  uid: string,
  resumeId: string,
  input: Partial<{
    title: string;
    isPrimary: boolean;
  }>
) {
  if (await shouldUseSupabase()) {
    return await sbUpdateResume(uid, resumeId, input);
  }

  try {
    if (input.isPrimary) {
      await db
        .update(resumes)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(resumes.userUid, uid));
    }

    const updated = await db
      .update(resumes)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(resumes.id, resumeId), eq(resumes.userUid, uid)))
      .returning();

    return updated[0] ?? null;
  } catch (error) {
    wrapDbError('updateResume', error);
  }
}

export async function deleteResume(uid: string, resumeId: string) {
  if (await shouldUseSupabase()) {
    return await sbDeleteResume(uid, resumeId);
  }

  try {
    const deleted = await db
      .delete(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userUid, uid)))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    wrapDbError('deleteResume', error);
  }
}

export async function listResumeAnalyses(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListResumeAnalyses(uid);
  }

  try {
    return await db
      .select()
      .from(resumeAnalysis)
      .where(eq(resumeAnalysis.userUid, uid))
      .orderBy(desc(resumeAnalysis.createdAt));
  } catch (error) {
    wrapDbError('listResumeAnalyses', error);
  }
}

export async function createResumeAnalysis(
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
  if (await shouldUseSupabase()) {
    return await sbCreateResumeAnalysis(uid, input);
  }

  try {
    const inserted = await db
      .insert(resumeAnalysis)
      .values({
        userUid: uid,
        ...input,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    wrapDbError('createResumeAnalysis', error);
  }
}

export async function listJobMatches(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListJobMatches(uid);
  }

  try {
    return await db
      .select()
      .from(jobMatches)
      .where(eq(jobMatches.userUid, uid))
      .orderBy(desc(jobMatches.createdAt));
  } catch (error) {
    wrapDbError('listJobMatches', error);
  }
}

export async function createJobMatch(
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
  if (await shouldUseSupabase()) {
    return await sbCreateJobMatch(uid, input);
  }

  try {
    const inserted = await db
      .insert(jobMatches)
      .values({
        userUid: uid,
        resumeId: input.resumeId ?? null,
        jobTitle: input.jobTitle,
        company: input.company,
        jobDescription: input.jobDescription,
        matchScore: input.matchScore,
        explanation: input.explanation,
        experienceAlignment: input.experienceAlignment ?? '',
        qualificationsAlignment: input.qualificationsAlignment ?? '',
        strengths: input.strengths,
        skillGaps: input.skillGaps,
        matchedKeywords: input.matchedKeywords,
        missingKeywords: input.missingKeywords,
        resumeRecommendations: input.resumeRecommendations,
        interviewSuggestions: input.interviewSuggestions,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    wrapDbError('createJobMatch', error);
  }
}

export async function listSavedJobs(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListSavedJobs(uid);
  }

  try {
    return await db
      .select()
      .from(savedJobs)
      .where(eq(savedJobs.userUid, uid))
      .orderBy(desc(savedJobs.createdAt));
  } catch (error) {
    wrapDbError('listSavedJobs', error);
  }
}

export async function createSavedJob(
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
  if (await shouldUseSupabase()) {
    return await sbCreateSavedJob(uid, input);
  }

  try {
    const inserted = await db
      .insert(savedJobs)
      .values({
        userUid: uid,
        jobMatchId: input.jobMatchId ?? null,
        jobTitle: input.jobTitle,
        company: input.company,
        jobUrl: input.jobUrl ?? '',
        location: input.location ?? '',
        notes: input.notes ?? '',
        matchScore: input.matchScore ?? null,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    wrapDbError('createSavedJob', error);
  }
}

export async function deleteSavedJob(uid: string, id: string) {
  if (await shouldUseSupabase()) {
    return await sbDeleteSavedJob(uid, id);
  }

  try {
    const deleted = await db
      .delete(savedJobs)
      .where(and(eq(savedJobs.id, id), eq(savedJobs.userUid, uid)))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    wrapDbError('deleteSavedJob', error);
  }
}

export async function listApplications(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListApplications(uid);
  }

  try {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.userUid, uid))
      .orderBy(desc(applications.updatedAt));
  } catch (error) {
    wrapDbError('listApplications', error);
  }
}

export async function createApplication(
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
  if (await shouldUseSupabase()) {
    return await sbCreateApplication(uid, input);
  }

  try {
    const inserted = await db
      .insert(applications)
      .values({
        userUid: uid,
        company: input.company,
        jobTitle: input.jobTitle,
        jobLink: input.jobLink ?? '',
        location: input.location ?? '',
        status: input.status ?? 'Interested',
        appliedDate: input.appliedDate ?? '',
        nextAction: input.nextAction ?? '',
        followUpDate: input.followUpDate ?? '',
        notes: input.notes ?? '',
      })
      .returning();
    return inserted[0];
  } catch (error) {
    wrapDbError('createApplication', error);
  }
}

export async function updateApplication(
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
  if (await shouldUseSupabase()) {
    return await sbUpdateApplication(uid, id, input);
  }

  try {
    const updated = await db
      .update(applications)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(applications.id, id), eq(applications.userUid, uid)))
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    wrapDbError('updateApplication', error);
  }
}

export async function deleteApplication(uid: string, id: string) {
  if (await shouldUseSupabase()) {
    return await sbDeleteApplication(uid, id);
  }

  try {
    const deleted = await db
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userUid, uid)))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    wrapDbError('deleteApplication', error);
  }
}

export async function listTailoredResumes(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListTailoredResumes(uid);
  }

  try {
    return await db
      .select()
      .from(tailoredResumes)
      .where(eq(tailoredResumes.userUid, uid))
      .orderBy(desc(tailoredResumes.updatedAt));
  } catch (error) {
    wrapDbError('listTailoredResumes', error);
  }
}

export async function createTailoredResume(
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
  if (await shouldUseSupabase()) {
    return await sbCreateTailoredResume(uid, input);
  }

  try {
    const inserted = await db
      .insert(tailoredResumes)
      .values({
        userUid: uid,
        resumeId: input.resumeId ?? null,
        jobTitle: input.jobTitle,
        company: input.company ?? '',
        tailoredSummary: input.tailoredSummary,
        tailoredContent: input.tailoredContent,
        bulletRewrites: input.bulletRewrites,
        optimizedKeywords: input.optimizedKeywords,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    wrapDbError('createTailoredResume', error);
  }
}

export async function updateTailoredResume(
  uid: string,
  id: string,
  tailoredContent: string,
  tailoredSummary?: string
) {
  if (await shouldUseSupabase()) {
    return await sbUpdateTailoredResume(uid, id, tailoredContent, tailoredSummary);
  }

  try {
    const updated = await db
      .update(tailoredResumes)
      .set({
        tailoredContent,
        ...(tailoredSummary !== undefined ? { tailoredSummary } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(tailoredResumes.id, id), eq(tailoredResumes.userUid, uid)))
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    wrapDbError('updateTailoredResume', error);
  }
}

export async function listCoverLetters(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListCoverLetters(uid);
  }

  try {
    return await db
      .select()
      .from(coverLetters)
      .where(eq(coverLetters.userUid, uid))
      .orderBy(desc(coverLetters.updatedAt));
  } catch (error) {
    wrapDbError('listCoverLetters', error);
  }
}

export async function createCoverLetter(
  uid: string,
  input: {
    resumeId?: string | null;
    company: string;
    jobTitle: string;
    tone: string;
    content: string;
  }
) {
  if (await shouldUseSupabase()) {
    return await sbCreateCoverLetter(uid, input);
  }

  try {
    const inserted = await db
      .insert(coverLetters)
      .values({
        userUid: uid,
        resumeId: input.resumeId ?? null,
        company: input.company,
        jobTitle: input.jobTitle,
        tone: input.tone,
        content: input.content,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    wrapDbError('createCoverLetter', error);
  }
}

export async function updateCoverLetter(uid: string, id: string, content: string) {
  if (await shouldUseSupabase()) {
    return await sbUpdateCoverLetter(uid, id, content);
  }

  try {
    const updated = await db
      .update(coverLetters)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(coverLetters.id, id), eq(coverLetters.userUid, uid)))
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    wrapDbError('updateCoverLetter', error);
  }
}

export async function deleteCoverLetter(uid: string, id: string) {
  if (await shouldUseSupabase()) {
    return await sbDeleteCoverLetter(uid, id);
  }

  try {
    const deleted = await db
      .delete(coverLetters)
      .where(and(eq(coverLetters.id, id), eq(coverLetters.userUid, uid)))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    wrapDbError('deleteCoverLetter', error);
  }
}

export async function listInterviewSessions(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListInterviewSessions(uid);
  }

  try {
    return await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.userUid, uid))
      .orderBy(desc(interviewSessions.updatedAt));
  } catch (error) {
    wrapDbError('listInterviewSessions', error);
  }
}

export async function getInterviewSessionWithMessages(uid: string, sessionId: string) {
  if (await shouldUseSupabase()) {
    return await sbGetInterviewSessionWithMessages(uid, sessionId);
  }

  try {
    const sessions = await db
      .select()
      .from(interviewSessions)
      .where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.userUid, uid)))
      .limit(1);
    if (!sessions.length) return null;

    const messages = await db
      .select()
      .from(interviewMessages)
      .where(and(eq(interviewMessages.sessionId, sessionId), eq(interviewMessages.userUid, uid)))
      .orderBy(interviewMessages.questionNumber);

    return { session: sessions[0], messages };
  } catch (error) {
    wrapDbError('getInterviewSessionWithMessages', error);
  }
}

export async function createInterviewSessionWithQuestions(
  uid: string,
  input: {
    jobTitle: string;
    company?: string;
    category: string;
    difficulty: string;
    questions: { question: string; questionType: string; sampleAnswer: string }[];
  }
) {
  if (await shouldUseSupabase()) {
    return await sbCreateInterviewSessionWithQuestions(uid, input);
  }

  try {
    const [session] = await db
      .insert(interviewSessions)
      .values({
        userUid: uid,
        jobTitle: input.jobTitle,
        company: input.company ?? '',
        category: input.category,
        difficulty: input.difficulty,
      })
      .returning();

    const messageRows = await db
      .insert(interviewMessages)
      .values(
        input.questions.map((q, idx) => ({
          sessionId: session.id,
          userUid: uid,
          questionNumber: idx + 1,
          question: q.question,
          questionType: q.questionType,
          sampleAnswer: q.sampleAnswer,
        }))
      )
      .returning();

    return { session, messages: messageRows };
  } catch (error) {
    wrapDbError('createInterviewSessionWithQuestions', error);
  }
}

export async function saveInterviewAnswerEvaluation(
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
  if (await shouldUseSupabase()) {
    return await sbSaveInterviewAnswerEvaluation(uid, sessionId, messageId, evaluation);
  }

  try {
    const [updatedMessage] = await db
      .update(interviewMessages)
      .set({
        userAnswer: evaluation.userAnswer,
        score: evaluation.score,
        starFeedback: evaluation.starFeedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        sampleAnswer: evaluation.sampleAnswer,
      })
      .where(
        and(
          eq(interviewMessages.id, messageId),
          eq(interviewMessages.sessionId, sessionId),
          eq(interviewMessages.userUid, uid)
        )
      )
      .returning();

    if (!updatedMessage) return null;

    const allMsgs = await db
      .select({ score: interviewMessages.score })
      .from(interviewMessages)
      .where(and(eq(interviewMessages.sessionId, sessionId), eq(interviewMessages.userUid, uid)));

    const scored = allMsgs.filter((m) => typeof m.score === 'number').map((m) => m.score as number);
    const avg = scored.length > 0 ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;

    await db
      .update(interviewSessions)
      .set({ averageScore: avg, updatedAt: new Date() })
      .where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.userUid, uid)));

    return { message: updatedMessage, averageScore: avg };
  } catch (error) {
    wrapDbError('saveInterviewAnswerEvaluation', error);
  }
}

export async function listCareerRoadmaps(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListCareerRoadmaps(uid);
  }

  try {
    return await db
      .select()
      .from(careerRoadmaps)
      .where(eq(careerRoadmaps.userUid, uid))
      .orderBy(desc(careerRoadmaps.updatedAt));
  } catch (error) {
    wrapDbError('listCareerRoadmaps', error);
  }
}

export async function createCareerRoadmap(
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
  if (await shouldUseSupabase()) {
    return await sbCreateCareerRoadmap(uid, input);
  }

  try {
    const [inserted] = await db
      .insert(careerRoadmaps)
      .values({
        userUid: uid,
        targetRole: input.targetRole,
        careerGoal: input.careerGoal,
        timelineWeeks: input.timelineWeeks,
        summary: input.summary,
        milestones: input.milestones,
        skillGaps: input.skillGaps,
        learningPriorities: input.learningPriorities ?? [],
      })
      .returning();
    return inserted;
  } catch (error) {
    wrapDbError('createCareerRoadmap', error);
  }
}

export async function updateCareerRoadmapMilestones(
  uid: string,
  roadmapId: string,
  milestones: RoadmapMilestone[]
) {
  if (await shouldUseSupabase()) {
    return await sbUpdateCareerRoadmapMilestones(uid, roadmapId, milestones);
  }

  try {
    const [updated] = await db
      .update(careerRoadmaps)
      .set({ milestones, updatedAt: new Date() })
      .where(and(eq(careerRoadmaps.id, roadmapId), eq(careerRoadmaps.userUid, uid)))
      .returning();
    return updated ?? null;
  } catch (error) {
    wrapDbError('updateCareerRoadmapMilestones', error);
  }
}

export async function listSkillsProgress(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListSkillsProgress(uid);
  }

  try {
    return await db
      .select()
      .from(skillsProgress)
      .where(eq(skillsProgress.userUid, uid))
      .orderBy(desc(skillsProgress.updatedAt));
  } catch (error) {
    wrapDbError('listSkillsProgress', error);
  }
}

export async function upsertSkillProgress(
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
  if (await shouldUseSupabase()) {
    return await sbUpsertSkillProgress(uid, input);
  }

  try {
    if (input.id) {
      const [updated] = await db
        .update(skillsProgress)
        .set({
          skillName: input.skillName,
          category: input.category,
          proficiency: input.proficiency,
          targetProficiency: input.targetProficiency,
          status: input.status,
          updatedAt: new Date(),
        })
        .where(and(eq(skillsProgress.id, input.id), eq(skillsProgress.userUid, uid)))
        .returning();
      return updated ?? null;
    }

    const [inserted] = await db
      .insert(skillsProgress)
      .values({
        userUid: uid,
        skillName: input.skillName,
        category: input.category,
        proficiency: input.proficiency,
        targetProficiency: input.targetProficiency,
        status: input.status,
      })
      .returning();
    return inserted;
  } catch (error) {
    wrapDbError('upsertSkillProgress', error);
  }
}

export async function deleteSkillProgress(uid: string, id: string) {
  if (await shouldUseSupabase()) {
    return await sbDeleteSkillProgress(uid, id);
  }

  try {
    const [deleted] = await db
      .delete(skillsProgress)
      .where(and(eq(skillsProgress.id, id), eq(skillsProgress.userUid, uid)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    wrapDbError('deleteSkillProgress', error);
  }
}

export async function listChatConversations(uid: string) {
  if (await shouldUseSupabase()) {
    return await sbListChatConversations(uid);
  }

  try {
    return await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userUid, uid))
      .orderBy(desc(chatConversations.updatedAt));
  } catch (error) {
    wrapDbError('listChatConversations', error);
  }
}

export async function createChatConversation(uid: string, title: string) {
  if (await shouldUseSupabase()) {
    return await sbCreateChatConversation(uid, title);
  }

  try {
    const [inserted] = await db
      .insert(chatConversations)
      .values({ userUid: uid, title })
      .returning();
    return inserted;
  } catch (error) {
    wrapDbError('createChatConversation', error);
  }
}

export async function deleteChatConversation(uid: string, id: string) {
  if (await shouldUseSupabase()) {
    return await sbDeleteChatConversation(uid, id);
  }

  try {
    const [deleted] = await db
      .delete(chatConversations)
      .where(and(eq(chatConversations.id, id), eq(chatConversations.userUid, uid)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    wrapDbError('deleteChatConversation', error);
  }
}

export async function listChatMessages(uid: string, conversationId: string) {
  if (await shouldUseSupabase()) {
    return await sbListChatMessages(uid, conversationId);
  }

  try {
    return await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          eq(chatMessages.userUid, uid)
        )
      )
      .orderBy(chatMessages.createdAt);
  } catch (error) {
    wrapDbError('listChatMessages', error);
  }
}

export async function addChatMessage(
  uid: string,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  if (await shouldUseSupabase()) {
    return await sbAddChatMessage(uid, conversationId, role, content);
  }

  try {
    const [inserted] = await db
      .insert(chatMessages)
      .values({
        userUid: uid,
        conversationId,
        role,
        content,
      })
      .returning();

    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(and(eq(chatConversations.id, conversationId), eq(chatConversations.userUid, uid)));

    return inserted;
  } catch (error) {
    wrapDbError('addChatMessage', error);
  }
}

export async function getDashboardSummary(uid: string, email: string, name: string) {
  try {
    const [
      profile,
      userResumes,
      analyses,
      matches,
      userApps,
      interviews,
      roadmaps,
      skills,
      letters,
      tailored,
    ] = await Promise.all([
      getOrCreateProfile(uid, email, name),
      listResumes(uid),
      listResumeAnalyses(uid),
      listJobMatches(uid),
      listApplications(uid),
      listInterviewSessions(uid),
      listCareerRoadmaps(uid),
      listSkillsProgress(uid),
      listCoverLetters(uid),
      listTailoredResumes(uid),
    ]);

    const avgMatch =
      matches.length > 0
        ? Math.round(matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length)
        : null;

    const scoredInterviews = interviews.filter((i) => typeof i.averageScore === 'number');
    const avgInterview =
      scoredInterviews.length > 0
        ? Math.round(
            scoredInterviews.reduce((sum, i) => sum + (i.averageScore ?? 0), 0) /
              scoredInterviews.length
          )
        : null;

    return {
      profile,
      resumesCount: userResumes.length,
      latestResumeAnalysis: analyses[0] ?? null,
      jobMatchesCount: matches.length,
      averageMatchScore: avgMatch,
      recentJobMatches: matches.slice(0, 5),
      applications: userApps,
      interviewsCount: interviews.length,
      averageInterviewScore: avgInterview,
      latestRoadmap: roadmaps[0] ?? null,
      skills,
      coverLettersCount: letters.length,
      tailoredResumesCount: tailored.length,
    };
  } catch (error) {
    wrapDbError('getDashboardSummary', error);
  }
}
