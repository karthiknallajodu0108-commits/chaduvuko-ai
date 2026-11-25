import { apiRequest } from './apiClient';
import type {
  CareerRoadmapRecord,
  ChatConversationRecord,
  ChatMessageRecord,
  CoverLetterRecord,
  InterviewMessageRecord,
  InterviewSessionRecord,
  JobMatchRecord,
  ResumeAnalysisRecord,
  RoadmapMilestone,
  TailoredResumeRecord,
} from '../types/career';

const AI_REQUEST_TIMEOUT_MS = 90_000;

export const aiApi = {
  // Chat / AI Assistant
  listConversations: () => apiRequest<ChatConversationRecord[]>('/api/chat/conversations'),

  createConversation: (title?: string) =>
    apiRequest<ChatConversationRecord>('/api/chat/conversations', {
      method: 'POST',
      body: { title: title || 'Career Strategy Session' },
    }),

  deleteConversation: (conversationId: string) =>
    apiRequest<{ deleted: boolean }>(`/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    }),

  listMessages: (conversationId: string) =>
    apiRequest<ChatMessageRecord[]>(`/api/chat/conversations/${conversationId}/messages`),

  sendChatMessage: (conversationId: string, content: string) =>
    apiRequest<{
      userMessage: ChatMessageRecord;
      assistantMessage: ChatMessageRecord;
    }>(`/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content },
      timeoutMs: AI_REQUEST_TIMEOUT_MS,
    }),

  // Resume Analysis
  listResumeAnalyses: () => apiRequest<ResumeAnalysisRecord[]>('/api/resume-analyses'),

  analyzeResume: (payload: { resumeId: string; targetRole?: string }) =>
    apiRequest<ResumeAnalysisRecord>('/api/ai/resume-analysis', {
      method: 'POST',
      body: payload,
      timeoutMs: AI_REQUEST_TIMEOUT_MS,
    }),

  // Smart Job Matcher
  listJobMatches: () => apiRequest<JobMatchRecord[]>('/api/job-matches'),

  evaluateJobMatch: (payload: {
    resumeId: string;
    jobTitle: string;
    company: string;
    jobDescription: string;
  }) =>
    apiRequest<JobMatchRecord>('/api/ai/job-match', {
      method: 'POST',
      body: payload,
      timeoutMs: AI_REQUEST_TIMEOUT_MS,
    }),

  // Career Roadmap
  listRoadmaps: () => apiRequest<CareerRoadmapRecord[]>('/api/roadmaps'),

  generateRoadmap: (payload: {
    targetRole: string;
    careerGoal: string;
    education?: string;
    experience?: string;
    currentSkills?: string[];
    learningPreference?: string;
    timelineWeeks?: number;
  }) =>
    apiRequest<CareerRoadmapRecord>('/api/ai/roadmap', {
      method: 'POST',
      body: payload,
      timeoutMs: AI_REQUEST_TIMEOUT_MS,
    }),

  updateRoadmapMilestones: (roadmapId: string, milestones: RoadmapMilestone[]) =>
    apiRequest<CareerRoadmapRecord>(`/api/roadmaps/${roadmapId}/milestones`, {
      method: 'PUT',
      body: { milestones },
    }),

  // Resume Tailor
  tailorResume: (payload: {
    resumeId: string;
    jobTitle: string;
    company?: string;
    jobDescription: string;
  }) =>
    apiRequest<TailoredResumeRecord>('/api/tailored-resumes', {
      method: 'POST',
      body: payload,
      timeoutMs: AI_REQUEST_TIMEOUT_MS,
    }),

  // Cover Letters
  generateCoverLetter: (payload: {
    resumeId: string;
    company: string;
    jobTitle: string;
    tone: string;
    jobDescription: string;
  }) =>
    apiRequest<CoverLetterRecord>('/api/cover-letters', {
      method: 'POST',
      body: payload,
      timeoutMs: AI_REQUEST_TIMEOUT_MS,
    }),

  // Interview Coach
  startInterviewSession: (payload: {
    jobTitle: string;
    company?: string;
    category: string;
    difficulty: string;
    resumeId?: string;
  }) =>
    apiRequest<{
      session?: InterviewSessionRecord;
      messages?: InterviewMessageRecord[];
    }>('/api/interviews', {
      method: 'POST',
      body: payload,
      timeoutMs: AI_REQUEST_TIMEOUT_MS,
    }),

  evaluateInterviewAnswer: (sessionId: string, messageId: string, userAnswer: string) =>
    apiRequest<{
      message: InterviewMessageRecord;
      averageScore: number | null;
    }>(`/api/interviews/${sessionId}/messages/${messageId}/evaluate`, {
      method: 'POST',
      body: { userAnswer },
      timeoutMs: AI_REQUEST_TIMEOUT_MS,
    }),
};
