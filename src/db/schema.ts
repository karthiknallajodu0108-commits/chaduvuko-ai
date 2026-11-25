import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export interface AnalysisPoint {
  title: string;
  detail: string;
}

export interface KeywordAnalysisItem {
  keyword: string;
  status: 'present' | 'missing' | 'weak';
  importance: 'high' | 'medium' | 'low';
}

export interface BulletImprovement {
  original: string;
  improved: string;
  reason: string;
}

export interface SectionScore {
  section: string;
  score: number;
  notes: string;
}

export interface StarFeedback {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface RoadmapMilestone {
  id: string;
  phase: string;
  title: string;
  duration: string;
  description: string;
  topics: string[];
  projects: string[];
  activities: string[];
  completed: boolean;
}

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').default(''),
  headline: text('headline').default(''),
  currentRole: text('current_role').default(''),
  targetRole: text('target_role').default(''),
  careerGoal: text('career_goal').default(''),
  yearsExperience: integer('years_experience').default(0).notNull(),
  education: text('education').default(''),
  experienceSummary: text('experience_summary').default(''),
  skills: jsonb('skills').$type<string[]>().default([]).notNull(),
  preferredRoles: jsonb('preferred_roles').$type<string[]>().default([]).notNull(),
  preferredLocations: jsonb('preferred_locations').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    fileName: text('file_name').notNull(),
    fileMime: text('file_mime').notNull(),
    fileSize: integer('file_size').notNull(),
    extractedText: text('extracted_text').notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_resumes_user_uid').on(table.userUid)]
);

export const resumeAnalysis = pgTable(
  'resume_analysis',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resumeId: uuid('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    overallScore: integer('overall_score').notNull(),
    atsReadinessScore: integer('ats_readiness_score').notNull(),
    impactScore: integer('impact_score').notNull(),
    clarityScore: integer('clarity_score').notNull(),
    keywordScore: integer('keyword_score').notNull(),
    careerSummary: text('career_summary').notNull(),
    experienceAnalysis: text('experience_analysis').notNull(),
    educationAnalysis: text('education_analysis').notNull(),
    extractedSkills: jsonb('extracted_skills').$type<string[]>().default([]).notNull(),
    strengths: jsonb('strengths').$type<AnalysisPoint[]>().default([]).notNull(),
    weaknesses: jsonb('weaknesses').$type<AnalysisPoint[]>().default([]).notNull(),
    missingSkills: jsonb('missing_skills').$type<string[]>().default([]).notNull(),
    keywordAnalysis: jsonb('keyword_analysis').$type<KeywordAnalysisItem[]>().default([]).notNull(),
    formattingRecommendations: jsonb('formatting_recommendations').$type<string[]>().default([]).notNull(),
    summarySuggestions: jsonb('summary_suggestions').$type<string[]>().default([]).notNull(),
    bulletImprovements: jsonb('bullet_improvements').$type<BulletImprovement[]>().default([]).notNull(),
    sectionScores: jsonb('section_scores').$type<SectionScore[]>().default([]).notNull(),
    priorityRecommendations: jsonb('priority_recommendations').$type<string[]>().default([]).notNull(),
    scoringMethodology: text('scoring_methodology').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_resume_analysis_user_uid').on(table.userUid),
    index('idx_resume_analysis_resume_id').on(table.resumeId),
  ]
);

export const jobMatches = pgTable(
  'job_matches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    jobTitle: text('job_title').notNull(),
    company: text('company').notNull(),
    jobDescription: text('job_description').notNull(),
    matchScore: integer('match_score').notNull(),
    explanation: text('explanation').notNull(),
    experienceAlignment: text('experience_alignment').default('').notNull(),
    qualificationsAlignment: text('qualifications_alignment').default('').notNull(),
    strengths: jsonb('strengths').$type<string[]>().default([]).notNull(),
    skillGaps: jsonb('skill_gaps').$type<string[]>().default([]).notNull(),
    matchedKeywords: jsonb('matched_keywords').$type<string[]>().default([]).notNull(),
    missingKeywords: jsonb('missing_keywords').$type<string[]>().default([]).notNull(),
    resumeRecommendations: jsonb('resume_recommendations').$type<string[]>().default([]).notNull(),
    interviewSuggestions: jsonb('interview_suggestions').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_job_matches_user_uid').on(table.userUid)]
);

export const savedJobs = pgTable(
  'saved_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    jobMatchId: uuid('job_match_id').references(() => jobMatches.id, { onDelete: 'set null' }),
    jobTitle: text('job_title').notNull(),
    company: text('company').notNull(),
    jobUrl: text('job_url').default(''),
    location: text('location').default(''),
    notes: text('notes').default(''),
    matchScore: integer('match_score'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_saved_jobs_user_uid').on(table.userUid)]
);

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    company: text('company').notNull(),
    jobTitle: text('job_title').notNull(),
    jobLink: text('job_link').default(''),
    location: text('location').default(''),
    status: text('status').default('Interested').notNull(),
    appliedDate: text('applied_date').default(''),
    nextAction: text('next_action').default(''),
    followUpDate: text('follow_up_date').default(''),
    notes: text('notes').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_applications_user_uid').on(table.userUid),
    index('idx_applications_status').on(table.status),
  ]
);

export const interviewSessions = pgTable(
  'interview_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    jobTitle: text('job_title').notNull(),
    company: text('company').default(''),
    category: text('category').notNull(),
    difficulty: text('difficulty').notNull(),
    averageScore: integer('average_score'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_interview_sessions_user_uid').on(table.userUid)]
);

export const interviewMessages = pgTable(
  'interview_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    questionNumber: integer('question_number').notNull(),
    question: text('question').notNull(),
    questionType: text('question_type').notNull(),
    userAnswer: text('user_answer').default(''),
    score: integer('score'),
    starFeedback: jsonb('star_feedback').$type<StarFeedback | null>().default(null),
    strengths: jsonb('strengths').$type<string[]>().default([]).notNull(),
    improvements: jsonb('improvements').$type<string[]>().default([]).notNull(),
    sampleAnswer: text('sample_answer').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_interview_messages_session_id').on(table.sessionId),
    index('idx_interview_messages_user_uid').on(table.userUid),
  ]
);

export const coverLetters = pgTable(
  'cover_letters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    company: text('company').notNull(),
    jobTitle: text('job_title').notNull(),
    tone: text('tone').default('Executive').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_cover_letters_user_uid').on(table.userUid)]
);

export const tailoredResumes = pgTable(
  'tailored_resumes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    jobTitle: text('job_title').notNull(),
    company: text('company').default(''),
    tailoredSummary: text('tailored_summary').notNull(),
    tailoredContent: text('tailored_content').notNull(),
    bulletRewrites: jsonb('bullet_rewrites').$type<BulletImprovement[]>().default([]).notNull(),
    optimizedKeywords: jsonb('optimized_keywords').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_tailored_resumes_user_uid').on(table.userUid)]
);

export const careerRoadmaps = pgTable(
  'career_roadmaps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    targetRole: text('target_role').notNull(),
    careerGoal: text('career_goal').notNull(),
    timelineWeeks: integer('timeline_weeks').default(12).notNull(),
    summary: text('summary').notNull(),
    milestones: jsonb('milestones').$type<RoadmapMilestone[]>().default([]).notNull(),
    skillGaps: jsonb('skill_gaps').$type<string[]>().default([]).notNull(),
    learningPriorities: jsonb('learning_priorities').$type<string[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_career_roadmaps_user_uid').on(table.userUid)]
);

export const skillsProgress = pgTable(
  'skills_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    skillName: text('skill_name').notNull(),
    category: text('category').default('Core').notNull(),
    proficiency: integer('proficiency').default(30).notNull(),
    targetProficiency: integer('target_proficiency').default(85).notNull(),
    status: text('status').default('In Progress').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_skills_progress_user_uid').on(table.userUid)]
);

export const chatConversations = pgTable(
  'chat_conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_chat_conversations_user_uid').on(table.userUid)]
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    userUid: text('user_uid')
      .notNull()
      .references(() => profiles.uid, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_chat_messages_conversation_id').on(table.conversationId),
    index('idx_chat_messages_user_uid').on(table.userUid),
  ]
);
