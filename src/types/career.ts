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

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  headline: string;
  currentRole: string;
  targetRole: string;
  careerGoal: string;
  yearsExperience: number;
  education: string;
  experienceSummary: string;
  skills: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ResumeRecord {
  id: string;
  userUid: string;
  title: string;
  fileName: string;
  fileMime: string;
  fileSize: number;
  extractedText: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeAnalysisRecord {
  id: string;
  resumeId: string;
  userUid: string;
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
  createdAt: string;
}

export interface JobMatchRecord {
  id: string;
  userUid: string;
  resumeId: string | null;
  jobTitle: string;
  company: string;
  jobDescription: string;
  matchScore: number;
  explanation: string;
  experienceAlignment: string;
  qualificationsAlignment: string;
  strengths: string[];
  skillGaps: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  resumeRecommendations: string[];
  interviewSuggestions: string[];
  createdAt: string;
}

export interface SavedJobRecord {
  id: string;
  userUid: string;
  jobMatchId: string | null;
  jobTitle: string;
  company: string;
  jobUrl: string;
  location: string;
  notes: string;
  matchScore: number | null;
  createdAt: string;
}

export type ApplicationStatus =
  | 'Interested'
  | 'Applied'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export interface ApplicationRecord {
  id: string;
  userUid: string;
  company: string;
  jobTitle: string;
  jobLink: string;
  location: string;
  status: ApplicationStatus;
  appliedDate: string;
  nextAction: string;
  followUpDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewSessionRecord {
  id: string;
  userUid: string;
  jobTitle: string;
  company: string;
  category: string;
  difficulty: string;
  averageScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewMessageRecord {
  id: string;
  sessionId: string;
  userUid: string;
  questionNumber: number;
  question: string;
  questionType: string;
  userAnswer: string;
  score: number | null;
  starFeedback: StarFeedback | null;
  strengths: string[];
  improvements: string[];
  sampleAnswer: string;
  createdAt: string;
}

export interface CoverLetterRecord {
  id: string;
  userUid: string;
  resumeId: string | null;
  company: string;
  jobTitle: string;
  tone: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TailoredResumeRecord {
  id: string;
  userUid: string;
  resumeId: string | null;
  jobTitle: string;
  company: string;
  tailoredSummary: string;
  tailoredContent: string;
  bulletRewrites: BulletImprovement[];
  optimizedKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CareerRoadmapRecord {
  id: string;
  userUid: string;
  targetRole: string;
  careerGoal: string;
  timelineWeeks: number;
  summary: string;
  milestones: RoadmapMilestone[];
  skillGaps: string[];
  learningPriorities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillProgressRecord {
  id: string;
  userUid: string;
  skillName: string;
  category: string;
  proficiency: number;
  targetProficiency: number;
  status: string;
  updatedAt: string;
}

export interface ChatConversationRecord {
  id: string;
  userUid: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  userUid: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface DashboardSummary {
  profile: UserProfile;
  resumesCount: number;
  latestResumeAnalysis: ResumeAnalysisRecord | null;
  jobMatchesCount: number;
  averageMatchScore: number | null;
  recentJobMatches: JobMatchRecord[];
  applications: ApplicationRecord[];
  interviewsCount: number;
  averageInterviewScore: number | null;
  latestRoadmap: CareerRoadmapRecord | null;
  skills: SkillProgressRecord[];
  coverLettersCount: number;
  tailoredResumesCount: number;
}
