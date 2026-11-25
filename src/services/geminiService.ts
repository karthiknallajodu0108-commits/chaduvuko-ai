import { GoogleGenAI, Type } from '@google/genai';
import type {
  AnalysisPoint,
  BulletImprovement,
  KeywordAnalysisItem,
  RoadmapMilestone,
  SectionScore,
  StarFeedback,
} from '../db/schema.ts';

/**
 * Central Gemini model configuration.
 * Override via server-side GEMINI_MODEL environment variable if desired.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

const DEPRECATED_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
]);

export class GeminiConfigError extends Error {
  readonly statusCode = 503;
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

export class GeminiRateLimitError extends Error {
  readonly statusCode = 429;
  constructor(message: string) {
    super(message);
    this.name = 'GeminiRateLimitError';
  }
}

export class GeminiUpstreamError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'GeminiUpstreamError';
    this.statusCode = statusCode;
  }
}

const VALID_GEMINI_MODEL_REGEX = /^(models\/)?gemini-[0-9][a-z0-9._-]{1,50}$/i;

export function getConfiguredGeminiModel(): string {
  const raw = process.env.GEMINI_MODEL?.trim();
  if (!raw) return DEFAULT_GEMINI_MODEL;
  const normalized = raw.replace(/^models\//i, '');
  if (
    VALID_GEMINI_MODEL_REGEX.test(raw) &&
    !DEPRECATED_MODELS.has(normalized.toLowerCase())
  ) {
    return normalized;
  }
  return DEFAULT_GEMINI_MODEL;
}

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiConfigError(
      'Gemini AI is not configured yet. Please add GEMINI_API_KEY in Settings > Secrets to enable AI features.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function classifyGeminiError(error: unknown): Error {
  if (
    error instanceof GeminiConfigError ||
    error instanceof GeminiRateLimitError ||
    error instanceof GeminiUpstreamError
  ) {
    return error;
  }
  const rawMessage = error instanceof Error ? error.message : String(error);
  const upper = rawMessage.toUpperCase();

  if (upper.includes('API_KEY_INVALID') || upper.includes('PERMISSION_DENIED') || upper.includes('403')) {
    return new GeminiConfigError(
      'The configured Gemini API key was rejected. Please verify GEMINI_API_KEY in Settings > Secrets.'
    );
  }
  if (upper.includes('RESOURCE_EXHAUSTED') || upper.includes('429')) {
    return new GeminiRateLimitError(
      'Gemini API quota or rate limit was reached. Please wait a moment and try again.'
    );
  }
  if (upper.includes('NOT_FOUND') || upper.includes('404')) {
    return new GeminiUpstreamError(
      `The configured Gemini model (${getConfiguredGeminiModel()}) is not available for this API key. Check GEMINI_MODEL or API access in Settings > Secrets.`,
      502
    );
  }
  if (upper.includes('INVALID_ARGUMENT') || upper.includes('400')) {
    return new GeminiUpstreamError(
      'The AI request could not be processed due to invalid input formatting. Please shorten or rephrase your input and retry.',
      400
    );
  }
  return new GeminiUpstreamError(
    'The AI service encountered an unexpected error. Please try again shortly.',
    502
  );
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      if (error instanceof GeminiConfigError) {
        throw error;
      }
      const msg = (error instanceof Error ? error.message : String(error)).toUpperCase();
      const isRetryable =
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('DEADLINE_EXCEEDED') ||
        msg.includes('TIMEOUT');
      if (!isRetryable || attempt === maxRetries) {
        break;
      }
      await new Promise((r) => setTimeout(r, 700 * Math.pow(2, attempt)));
    }
  }
  console.error(
    'Gemini API error:',
    lastError instanceof Error ? lastError.message : 'Unknown upstream error'
  );
  throw classifyGeminiError(lastError);
}

export function parseJsonSafe<T>(raw: string | undefined, fallbackMsg: string): T {
  if (!raw) throw new GeminiUpstreamError(fallbackMsg, 502);
  let cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt to isolate outermost JSON object/array if model added preamble text
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart !== -1 && objEnd > objStart) {
      try {
        return JSON.parse(cleaned.slice(objStart, objEnd + 1)) as T;
      } catch {
        // fall through
      }
    }
    throw new GeminiUpstreamError(fallbackMsg, 502);
  }
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Normalizes stored conversation history into strict alternating user/model turns
 * bounded by message count and character budget so Gemini multi-turn chat never
 * fails with 400 INVALID_ARGUMENT or exceeds context limits.
 */
export function normalizeChatHistory(
  history: ChatTurn[],
  maxMessages = 14,
  maxTotalChars = 16000
): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  const recent = history
    .filter((m) => typeof m.content === 'string' && m.content.trim().length > 0)
    .slice(-maxMessages);

  // Merge consecutive same-role messages so roles strictly alternate
  const merged: { role: 'user' | 'model'; text: string }[] = [];
  for (const item of recent) {
    const mappedRole: 'user' | 'model' = item.role === 'assistant' ? 'model' : 'user';
    const trimmedText = item.content.trim().slice(0, 4000);
    const prev = merged[merged.length - 1];
    if (prev && prev.role === mappedRole) {
      prev.text = `${prev.text}\n\n${trimmedText}`;
    } else {
      merged.push({ role: mappedRole, text: trimmedText });
    }
  }

  // Gemini chat history must start with a 'user' turn and end with a 'model' turn
  // before the next sendMessage('user') turn
  while (merged.length > 0 && merged[0].role !== 'user') {
    merged.shift();
  }
  while (merged.length > 0 && merged[merged.length - 1].role !== 'model') {
    merged.pop();
  }

  // Enforce character budget from the newest pair backwards
  const budgeted: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  let charCount = 0;
  for (let i = merged.length - 1; i >= 0; i--) {
    const entry = merged[i];
    if (charCount + entry.text.length > maxTotalChars && budgeted.length > 0) {
      break;
    }
    charCount += entry.text.length;
    budgeted.unshift({ role: entry.role, parts: [{ text: entry.text }] });
  }

  while (budgeted.length > 0 && budgeted[0].role !== 'user') {
    budgeted.shift();
  }

  return budgeted;
}

export interface CareerContext {
  profileSummary: string;
  primaryResumeText?: string;
}

// ============================================================================
// A. AI Assistant / Conversational Career Chat
// ============================================================================

export async function generateCareerChatReply(
  history: ChatTurn[],
  userMessage: string,
  context: CareerContext
): Promise<string> {
  const ai = getAiClient();
  const model = getConfiguredGeminiModel();

  const systemInstruction = `You are CHADHUVUKO, an elite, trustworthy, calm, and practical AI career strategist and partner.
Rules:
1. Ground all advice in the user's real profile and resume provided below. NEVER invent jobs, employers, degrees, metrics, or skills that the user does not have.
2. Answer career questions thoroughly — including resume critique, job fit, learning plans, interview prep, salary/offer framing, and follow-up clarifications.
3. If resume or profile data is missing, still answer the user's question helpfully and gently note how uploading a resume or updating their profile can make future advice even more specific.
4. Structure responses cleanly in Markdown with concise headings, bullet points, and concrete next actions.
5. Keep tone professional, encouraging, specific, and free of hype.

User Career Context:
${context.profileSummary}

${context.primaryResumeText ? `Primary Resume Text:\n${context.primaryResumeText.slice(0, 12000)}` : 'No resume uploaded yet.'}`;

  const normalizedHistory = normalizeChatHistory(history);

  return withRetry(async () => {
    const chat = ai.chats.create({
      model,
      history: normalizedHistory,
      config: { systemInstruction },
    });
    const response = await chat.sendMessage({ message: userMessage.trim() });
    const text = response.text?.trim();
    if (!text) {
      throw new GeminiUpstreamError('The AI assistant returned an empty response. Please try again.', 502);
    }
    return text;
  });
}

// ============================================================================
// B. Resume Analyzer
// ============================================================================

export interface ResumeAnalysisOutput {
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

export async function analyzeResumeWithAI(
  resumeText: string,
  targetRole?: string
): Promise<ResumeAnalysisOutput> {
  const ai = getAiClient();
  const model = getConfiguredGeminiModel();

  const prompt = `Analyze the following resume carefully${targetRole ? ` for a target role of "${targetRole}"` : ''}.
Strictly adhere to factual content present in the resume. NEVER invent experience, metrics, employers, or degrees.
Provide transparent, explainable rubric scores (0-100):
- overallScore: weighted composite (30% impact, 25% ATS structure/readability, 25% keyword depth, 20% clarity).
- atsReadinessScore: structural parseability, clear headings, date consistency, clean formatting cues (explicitly explain in scoringMethodology that this is an AI heuristic readiness score, NOT an employer's proprietary ATS system).
- impactScore: measurable outcomes, action verbs, scope ownership.
- clarityScore: conciseness, logical hierarchy, scannability.
- keywordScore: depth and relevance of domain terminology.

Resume Content:
${resumeText.slice(0, 16000)}`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert executive career coach and technical recruiter. Return strictly valid JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER },
            atsReadinessScore: { type: Type.INTEGER },
            impactScore: { type: Type.INTEGER },
            clarityScore: { type: Type.INTEGER },
            keywordScore: { type: Type.INTEGER },
            careerSummary: { type: Type.STRING },
            experienceAnalysis: { type: Type.STRING },
            educationAnalysis: { type: Type.STRING },
            extractedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            strengths: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  detail: { type: Type.STRING },
                },
              },
            },
            weaknesses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  detail: { type: Type.STRING },
                },
              },
            },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            keywordAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  keyword: { type: Type.STRING },
                  status: { type: Type.STRING },
                  importance: { type: Type.STRING },
                },
              },
            },
            formattingRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            summarySuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            bulletImprovements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  improved: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
              },
            },
            sectionScores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  section: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  notes: { type: Type.STRING },
                },
              },
            },
            priorityRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            scoringMethodology: { type: Type.STRING },
          },
        },
      },
    });

    const parsed = parseJsonSafe<ResumeAnalysisOutput>(
      response.text,
      'Could not parse structured resume analysis. Please try again.'
    );

    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
    return {
      ...parsed,
      overallScore: clamp(parsed.overallScore),
      atsReadinessScore: clamp(parsed.atsReadinessScore),
      impactScore: clamp(parsed.impactScore),
      clarityScore: clamp(parsed.clarityScore),
      keywordScore: clamp(parsed.keywordScore),
      careerSummary: parsed.careerSummary ?? '',
      experienceAnalysis: parsed.experienceAnalysis ?? '',
      educationAnalysis: parsed.educationAnalysis ?? '',
      extractedSkills: Array.isArray(parsed.extractedSkills) ? parsed.extractedSkills : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      keywordAnalysis: Array.isArray(parsed.keywordAnalysis) ? parsed.keywordAnalysis : [],
      formattingRecommendations: Array.isArray(parsed.formattingRecommendations)
        ? parsed.formattingRecommendations
        : [],
      summarySuggestions: Array.isArray(parsed.summarySuggestions) ? parsed.summarySuggestions : [],
      bulletImprovements: Array.isArray(parsed.bulletImprovements) ? parsed.bulletImprovements : [],
      sectionScores: Array.isArray(parsed.sectionScores)
        ? parsed.sectionScores.map((s) => ({ ...s, score: clamp(s.score) }))
        : [],
      priorityRecommendations: Array.isArray(parsed.priorityRecommendations)
        ? parsed.priorityRecommendations
        : [],
      scoringMethodology:
        parsed.scoringMethodology ||
        'Composite rubric: Impact (30%), ATS Structure & Readability (25%), Keyword Depth (25%), and Clarity (20%). This is an AI heuristic assessment, not an employer ATS score.',
    };
  });
}

// ============================================================================
// C. Smart Job Matcher
// ============================================================================

export interface JobMatchOutput {
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
}

export async function analyzeJobMatchWithAI(input: {
  jobTitle: string;
  company: string;
  jobDescription: string;
  resumeText: string;
}): Promise<JobMatchOutput> {
  const ai = getAiClient();
  const model = getConfiguredGeminiModel();

  const prompt = `Evaluate candidate fit between the resume and the target job. Be objective, accurate, and grounded strictly in the provided text.
Include:
- matchScore (0-100) derived strictly from actual resume and job description overlap
- explanation: concise overall compatibility summary
- experienceAlignment: clear evaluation of how candidate's past roles/years/scope align with the posting
- qualificationsAlignment: clear evaluation of education, certifications, and core requirements alignment
- strengths, skillGaps, matchedKeywords, missingKeywords, resumeRecommendations, interviewSuggestions

Target Job Title: ${input.jobTitle}
Company: ${input.company}
Job Description:
${input.jobDescription.slice(0, 10000)}

Candidate Resume:
${input.resumeText.slice(0, 14000)}`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are a senior hiring manager evaluating candidate-role alignment. Return strictly valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchScore: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            experienceAlignment: { type: Type.STRING },
            qualificationsAlignment: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            skillGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            resumeRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            interviewSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const parsed = parseJsonSafe<JobMatchOutput>(
      response.text,
      'Could not parse job match analysis. Please try again.'
    );
    return {
      matchScore: Math.max(0, Math.min(100, Math.round(Number(parsed.matchScore) || 0))),
      explanation: parsed.explanation ?? '',
      experienceAlignment: parsed.experienceAlignment ?? '',
      qualificationsAlignment: parsed.qualificationsAlignment ?? '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps : [],
      matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords : [],
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
      resumeRecommendations: Array.isArray(parsed.resumeRecommendations) ? parsed.resumeRecommendations : [],
      interviewSuggestions: Array.isArray(parsed.interviewSuggestions) ? parsed.interviewSuggestions : [],
    };
  });
}

// ============================================================================
// D. Resume Tailor
// ============================================================================

export interface TailoredResumeOutput {
  tailoredSummary: string;
  tailoredContent: string;
  bulletRewrites: BulletImprovement[];
  optimizedKeywords: string[];
}

export async function tailorResumeWithAI(input: {
  resumeText: string;
  jobTitle: string;
  company?: string;
  jobDescription: string;
}): Promise<TailoredResumeOutput> {
  const ai = getAiClient();
  const model = getConfiguredGeminiModel();

  const prompt = `Tailor the candidate's resume for the target role.
STRICT INTEGRITY RULES:
- NEVER fabricate qualifications, skills, employers, titles, degrees, dates, or achievements not grounded in the original resume.
- Preserve all factual information while strengthening clarity, relevance, action verbs, skills emphasis, and natural alignment with job description terminology.
- For bulletRewrites, show the exact original bullet from the resume, your factually faithful tailored version, and why the edit improves alignment.
- Provide the complete, clean, ready-to-edit tailored resume in tailoredContent.

Target Role: ${input.jobTitle}${input.company ? ` at ${input.company}` : ''}
Job Description:
${input.jobDescription.slice(0, 9000)}

Original Resume:
${input.resumeText.slice(0, 14000)}`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are an ethical executive resume editor. Never fabricate credentials or experience. Return strictly valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tailoredSummary: { type: Type.STRING },
            tailoredContent: { type: Type.STRING },
            bulletRewrites: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  improved: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
              },
            },
            optimizedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const parsed = parseJsonSafe<TailoredResumeOutput>(
      response.text,
      'Could not parse tailored resume output. Please try again.'
    );
    return {
      tailoredSummary: parsed.tailoredSummary ?? '',
      tailoredContent: parsed.tailoredContent ?? '',
      bulletRewrites: Array.isArray(parsed.bulletRewrites) ? parsed.bulletRewrites : [],
      optimizedKeywords: Array.isArray(parsed.optimizedKeywords) ? parsed.optimizedKeywords : [],
    };
  });
}

// ============================================================================
// E. Cover Letter Generator
// ============================================================================

export async function generateCoverLetterWithAI(input: {
  resumeText: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  tone: string;
}): Promise<string> {
  const ai = getAiClient();
  const model = getConfiguredGeminiModel();

  const prompt = `Write a compelling, authentic cover letter for ${input.jobTitle} at ${input.company} in a "${input.tone}" tone.
STRICT RULES:
- Use ONLY factual achievements, skills, and history from the provided resume. Do NOT invent metrics, employers, or skills.
- Include a personalized opening, concrete alignment with the role, grounded accomplishments, and a confident closing paragraph.
- Output clean plain text with natural paragraph breaks (no markdown headers or code fences).

Job Description:
${input.jobDescription.slice(0, 8000)}

Candidate Resume:
${input.resumeText.slice(0, 12000)}`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are a refined career communications writer crafting tailored, factually grounded cover letters.',
      },
    });
    const text = response.text?.trim();
    if (!text) {
      throw new GeminiUpstreamError('Cover letter generation returned empty text. Please try again.', 502);
    }
    return text;
  });
}

// ============================================================================
// F. Interview Coach (Question Generation & STAR Evaluation)
// ============================================================================

export async function generateInterviewQuestionsWithAI(input: {
  jobTitle: string;
  company?: string;
  category: string;
  difficulty: string;
  resumeText?: string;
}): Promise<{ question: string; questionType: string; sampleAnswer: string }[]> {
  const ai = getAiClient();
  const model = getConfiguredGeminiModel();

  const prompt = `Generate 5 realistic, high-signal interview questions for a "${input.jobTitle}"${input.company ? ` role at "${input.company}"` : ''}.
Focus category: ${input.category}
Difficulty level: ${input.difficulty}
${input.resumeText ? `Candidate Resume Context (tailor questions to probe real background without inventing anything):\n${input.resumeText.slice(0, 6000)}` : ''}
For each question, include a strong STAR-structured sample answer guide.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are a principal interviewer designing realistic interview simulations. Return strictly valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  questionType: { type: Type.STRING },
                  sampleAnswer: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const parsed = parseJsonSafe<{
      questions: { question: string; questionType: string; sampleAnswer: string }[];
    }>(response.text, 'Could not generate interview questions. Please try again.');

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new GeminiUpstreamError('No interview questions were generated. Please retry.', 502);
    }
    return parsed.questions.slice(0, 5);
  });
}

export async function evaluateInterviewAnswerWithAI(input: {
  jobTitle: string;
  question: string;
  questionType: string;
  difficulty: string;
  userAnswer: string;
}): Promise<{
  score: number;
  starFeedback: StarFeedback;
  strengths: string[];
  improvements: string[];
  sampleAnswer: string;
}> {
  const ai = getAiClient();
  const model = getConfiguredGeminiModel();

  const prompt = `Evaluate this interview response honestly and constructively.
Role: ${input.jobTitle} (${input.difficulty}, ${input.questionType})
Question: ${input.question}
Candidate Answer: ${input.userAnswer}

Score from 0 to 100 based on clarity, relevance, depth, ownership, and STAR completeness. Provide concrete STAR feedback (Situation, Task, Action, Result), strengths, specific improvements, and a refined model response.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert interview coach. Be candid, constructive, and specific. Return strictly valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            starFeedback: {
              type: Type.OBJECT,
              properties: {
                situation: { type: Type.STRING },
                task: { type: Type.STRING },
                action: { type: Type.STRING },
                result: { type: Type.STRING },
              },
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            sampleAnswer: { type: Type.STRING },
          },
        },
      },
    });

    const parsed = parseJsonSafe<{
      score: number;
      starFeedback: StarFeedback;
      strengths: string[];
      improvements: string[];
      sampleAnswer: string;
    }>(response.text, 'Could not evaluate answer. Please try again.');

    return {
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
      starFeedback: parsed.starFeedback ?? {
        situation: 'Context noted.',
        task: 'Objective noted.',
        action: 'Actions noted.',
        result: 'Quantify outcomes for higher impact.',
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      sampleAnswer: parsed.sampleAnswer ?? '',
    };
  });
}

// ============================================================================
// G. Career Roadmap Architect
// ============================================================================

export async function generateCareerRoadmapWithAI(input: {
  education: string;
  currentSkills: string[];
  experience: string;
  targetRole: string;
  careerGoal: string;
  learningPreference: string;
  timelineWeeks: number;
  resumeText?: string;
}): Promise<{
  summary: string;
  skillGaps: string[];
  learningPriorities: string[];
  milestones: RoadmapMilestone[];
}> {
  const ai = getAiClient();
  const model = getConfiguredGeminiModel();

  const prompt = `Create a structured, actionable ${input.timelineWeeks}-week career roadmap.
Current Education: ${input.education || 'Not specified'}
Current Skills: ${input.currentSkills.join(', ') || 'Not specified'}
Current Experience: ${input.experience || 'Not specified'}
Target Job Role: ${input.targetRole}
Career Goal: ${input.careerGoal}
Learning Preference: ${input.learningPreference}
${input.resumeText ? `Candidate Primary Resume (use this real background without fabricating anything):\n${input.resumeText.slice(0, 7000)}` : ''}

Return:
- summary: concise strategic overview
- skillGaps: concrete missing capabilities relative to the target role
- learningPriorities: ranked top 4-5 learning priorities to focus on first
- milestones: 4 to 5 sequential milestones covering foundations, core competencies, portfolio projects, and interview/job launch readiness. Each milestone must have a unique short id (m1, m2, ...), phase label, title, duration, description, learning topics, recommended portfolio projects, and concrete weekly activities.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are a strategic career architect designing realistic, personalized career roadmaps. Return strictly valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            skillGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            learningPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  phase: { type: Type.STRING },
                  title: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  description: { type: Type.STRING },
                  topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                  projects: { type: Type.ARRAY, items: { type: Type.STRING } },
                  activities: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
          },
        },
      },
    });

    const parsed = parseJsonSafe<{
      summary: string;
      skillGaps: string[];
      learningPriorities?: string[];
      milestones: Omit<RoadmapMilestone, 'completed'>[];
    }>(response.text, 'Could not parse generated career roadmap. Please try again.');

    return {
      summary: parsed.summary ?? '',
      skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps : [],
      learningPriorities: Array.isArray(parsed.learningPriorities) ? parsed.learningPriorities : [],
      milestones: (Array.isArray(parsed.milestones) ? parsed.milestones : []).map((m, idx) => ({
        id: m.id || `m${idx + 1}`,
        phase: m.phase || `Phase ${idx + 1}`,
        title: m.title || `Milestone ${idx + 1}`,
        duration: m.duration || '2–3 weeks',
        description: m.description || '',
        topics: Array.isArray(m.topics) ? m.topics : [],
        projects: Array.isArray(m.projects) ? m.projects : [],
        activities: Array.isArray(m.activities) ? m.activities : [],
        completed: false,
      })),
    };
  });
}
