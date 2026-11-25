import { Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';
import {
  getOrCreateProfile,
  listResumes,
  getResumeById,
  listResumeAnalyses,
  createResumeAnalysis,
  listJobMatches,
  createJobMatch,
  listTailoredResumes,
  createTailoredResume,
  updateTailoredResume,
  listCoverLetters,
  createCoverLetter,
  updateCoverLetter,
  deleteCoverLetter,
  listInterviewSessions,
  getInterviewSessionWithMessages,
  createInterviewSessionWithQuestions,
  saveInterviewAnswerEvaluation,
  listCareerRoadmaps,
  createCareerRoadmap,
  updateCareerRoadmapMilestones,
  listChatConversations,
  createChatConversation,
  deleteChatConversation,
  listChatMessages,
  addChatMessage,
} from '../db/repository.ts';
import {
  analyzeResumeWithAI,
  analyzeJobMatchWithAI,
  tailorResumeWithAI,
  generateCoverLetterWithAI,
  generateInterviewQuestionsWithAI,
  evaluateInterviewAnswerWithAI,
  generateCareerRoadmapWithAI,
  generateCareerChatReply,
  isGeminiConfigured,
  getConfiguredGeminiModel,
  GeminiConfigError,
  GeminiRateLimitError,
  GeminiUpstreamError,
} from '../services/geminiService.ts';

const uuidSchema = z.string().uuid();

// Sliding-window rate limiter for AI endpoints (per authenticated user)
const aiRateMap = new Map<string, number[]>();
const AI_WINDOW_MS = 60_000;
const AI_MAX_REQUESTS = 20;

export function aiRateLimit(req: AuthRequest, res: Response, next: NextFunction) {
  const key = req.user?.uid || req.ip || 'anonymous';
  const now = Date.now();
  const timestamps = (aiRateMap.get(key) || []).filter((t) => now - t < AI_WINDOW_MS);
  if (timestamps.length >= AI_MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many AI requests in a short window. Please wait a few seconds and try again.',
    });
    return;
  }
  timestamps.push(now);
  aiRateMap.set(key, timestamps);
  next();
}

export function sendAiError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof GeminiConfigError) {
    res.status(503).json({ error: error.message });
    return;
  }
  if (error instanceof GeminiRateLimitError) {
    res.status(429).json({ error: error.message });
    return;
  }
  if (error instanceof GeminiUpstreamError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  res.status(502).json({
    error: error instanceof Error ? error.message : fallbackMessage,
  });
}

// Validation Schemas
const analyzeResumeSchema = z.object({
  resumeId: z.string().uuid(),
  targetRole: z.string().max(120).optional(),
});

const jobMatchSchema = z.object({
  resumeId: z.string().uuid(),
  jobTitle: z.string().min(2).max(150),
  company: z.string().min(1).max(150),
  jobDescription: z.string().min(40).max(15000),
});

const tailorResumeSchema = z.object({
  resumeId: z.string().uuid(),
  jobTitle: z.string().min(2).max(150),
  company: z.string().max(150).optional(),
  jobDescription: z.string().min(40).max(15000),
});

const coverLetterCreateSchema = z.object({
  resumeId: z.string().uuid(),
  company: z.string().min(1).max(150),
  jobTitle: z.string().min(2).max(150),
  jobDescription: z.string().min(30).max(15000),
  tone: z.enum(['Executive', 'Warm & Collaborative', 'Direct & Technical', 'Concise Startup']).default('Executive'),
});

const interviewCreateSchema = z.object({
  jobTitle: z.string().min(2).max(150),
  company: z.string().max(150).optional(),
  category: z.enum(['Mixed', 'Behavioral', 'Technical', 'HR & Culture', 'System Design / Case']),
  difficulty: z.enum(['Entry-Level', 'Mid-Level', 'Senior', 'Staff / Leadership']),
  resumeId: z.string().uuid().optional(),
});

const roadmapCreateSchema = z.object({
  education: z.string().max(400).optional().default(''),
  currentSkills: z.array(z.string().max(80)).max(50).optional().default([]),
  experience: z.string().max(1500).optional().default(''),
  targetRole: z.string().min(2).max(150),
  careerGoal: z.string().min(5).max(1000),
  learningPreference: z.string().max(200).optional().default('Hands-on projects & structured study'),
  timelineWeeks: z.number().int().min(4).max(52).optional().default(12),
});

const milestoneSchema = z.object({
  id: z.string(),
  phase: z.string(),
  title: z.string(),
  duration: z.string(),
  description: z.string(),
  topics: z.array(z.string()),
  projects: z.array(z.string()),
  activities: z.array(z.string()),
  completed: z.boolean(),
});

async function buildProfileSummaryAndResume(uid: string, email: string, name: string) {
  const [profile, userResumes] = await Promise.all([
    getOrCreateProfile(uid, email, name),
    listResumes(uid),
  ]);
  const primaryResume = userResumes.find((r) => r.isPrimary) || userResumes[0];
  const profileSummary =
    [
      profile.fullName ? `Name: ${profile.fullName}` : '',
      profile.currentRole ? `Current Role: ${profile.currentRole}` : '',
      profile.targetRole ? `Target Role: ${profile.targetRole}` : '',
      profile.careerGoal ? `Career Goal: ${profile.careerGoal}` : '',
      profile.yearsExperience ? `Years Experience: ${profile.yearsExperience}` : '',
      profile.education ? `Education: ${profile.education}` : '',
      profile.skills.length ? `Listed Skills: ${profile.skills.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n') || 'Profile details have not been filled out yet.';

  return { profileSummary, primaryResume };
}

export function createAiRouter(): Router {
  const router = Router();

  // Lightweight AI engine status check (authenticated)
  router.get('/api/ai/status', requireAuth, (_req: AuthRequest, res) => {
    res.json({
      configured: isGeminiConfigured(),
      model: getConfiguredGeminiModel(),
    });
  });

  // ============================================================================
  // 1. Resume Analysis (/api/resume-analyses & /api/ai/resume-analysis)
  // ============================================================================
  router.get('/api/resume-analyses', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await listResumeAnalyses(req.user!.uid);
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load analyses.' });
    }
  });

  const handleAnalyzeResume = async (req: AuthRequest, res: Response) => {
    try {
      const parsed = analyzeResumeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Please select a valid resume to analyze.' });
        return;
      }
      const resume = await getResumeById(req.user!.uid, parsed.data.resumeId);
      if (!resume) {
        res.status(404).json({ error: 'Selected resume was not found.' });
        return;
      }
      const aiResult = await analyzeResumeWithAI(resume.extractedText, parsed.data.targetRole);
      const saved = await createResumeAnalysis(req.user!.uid, {
        resumeId: resume.id,
        ...aiResult,
      });
      res.status(201).json(saved);
    } catch (error: unknown) {
      sendAiError(res, error, 'Resume analysis failed.');
    }
  };

  router.post('/api/resume-analyses', requireAuth, aiRateLimit, handleAnalyzeResume);
  router.post('/api/ai/resume-analysis', requireAuth, aiRateLimit, handleAnalyzeResume);

  // ============================================================================
  // 2. Smart Job Matcher (/api/job-matches & /api/ai/job-match)
  // ============================================================================
  router.get('/api/job-matches', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await listJobMatches(req.user!.uid);
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load job matches.' });
    }
  });

  const handleJobMatch = async (req: AuthRequest, res: Response) => {
    try {
      const parsed = jobMatchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Please select a resume and enter the job title, company, and description.',
        });
        return;
      }
      const resume = await getResumeById(req.user!.uid, parsed.data.resumeId);
      if (!resume) {
        res.status(404).json({ error: 'Selected resume not found.' });
        return;
      }
      const aiResult = await analyzeJobMatchWithAI({
        jobTitle: parsed.data.jobTitle.trim(),
        company: parsed.data.company.trim(),
        jobDescription: parsed.data.jobDescription.trim(),
        resumeText: resume.extractedText,
      });
      const saved = await createJobMatch(req.user!.uid, {
        resumeId: resume.id,
        jobTitle: parsed.data.jobTitle.trim(),
        company: parsed.data.company.trim(),
        jobDescription: parsed.data.jobDescription.trim(),
        ...aiResult,
      });
      res.status(201).json(saved);
    } catch (error: unknown) {
      sendAiError(res, error, 'Job matching failed.');
    }
  };

  router.post('/api/job-matches', requireAuth, aiRateLimit, handleJobMatch);
  router.post('/api/ai/job-match', requireAuth, aiRateLimit, handleJobMatch);

  // ============================================================================
  // 3. Resume Tailor (/api/tailored-resumes)
  // ============================================================================
  router.get('/api/tailored-resumes', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await listTailoredResumes(req.user!.uid);
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load tailored resumes.' });
    }
  });

  router.post('/api/tailored-resumes', requireAuth, aiRateLimit, async (req: AuthRequest, res) => {
    try {
      const parsed = tailorResumeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Select a resume and provide the target role and job description.' });
        return;
      }
      const resume = await getResumeById(req.user!.uid, parsed.data.resumeId);
      if (!resume) {
        res.status(404).json({ error: 'Selected resume not found.' });
        return;
      }
      const aiResult = await tailorResumeWithAI({
        resumeText: resume.extractedText,
        jobTitle: parsed.data.jobTitle.trim(),
        company: parsed.data.company?.trim(),
        jobDescription: parsed.data.jobDescription.trim(),
      });
      const saved = await createTailoredResume(req.user!.uid, {
        resumeId: resume.id,
        jobTitle: parsed.data.jobTitle.trim(),
        company: parsed.data.company?.trim(),
        ...aiResult,
      });
      res.status(201).json(saved);
    } catch (error: unknown) {
      sendAiError(res, error, 'Resume tailoring failed.');
    }
  });

  router.put('/api/tailored-resumes/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!uuidSchema.safeParse(req.params.id).success) {
        res.status(400).json({ error: 'Invalid tailored resume ID.' });
        return;
      }
      const schema = z.object({
        tailoredContent: z.string().min(20).max(40000),
        tailoredSummary: z.string().max(3000).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid resume content.' });
        return;
      }
      const updated = await updateTailoredResume(
        req.user!.uid,
        String(req.params.id),
        parsed.data.tailoredContent,
        parsed.data.tailoredSummary
      );
      if (!updated) {
        res.status(404).json({ error: 'Tailored resume not found.' });
        return;
      }
      res.json(updated);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save edits.' });
    }
  });

  // ============================================================================
  // 4. Cover Letters (/api/cover-letters)
  // ============================================================================
  router.get('/api/cover-letters', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await listCoverLetters(req.user!.uid);
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load cover letters.' });
    }
  });

  router.post('/api/cover-letters', requireAuth, aiRateLimit, async (req: AuthRequest, res) => {
    try {
      const parsed = coverLetterCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Please select a resume and fill in company, job title, and job description.',
        });
        return;
      }
      const resume = await getResumeById(req.user!.uid, parsed.data.resumeId);
      if (!resume) {
        res.status(404).json({ error: 'Selected resume not found.' });
        return;
      }
      const content = await generateCoverLetterWithAI({
        resumeText: resume.extractedText,
        company: parsed.data.company.trim(),
        jobTitle: parsed.data.jobTitle.trim(),
        jobDescription: parsed.data.jobDescription.trim(),
        tone: parsed.data.tone,
      });
      const saved = await createCoverLetter(req.user!.uid, {
        resumeId: resume.id,
        company: parsed.data.company.trim(),
        jobTitle: parsed.data.jobTitle.trim(),
        tone: parsed.data.tone,
        content,
      });
      res.status(201).json(saved);
    } catch (error: unknown) {
      sendAiError(res, error, 'Cover letter generation failed.');
    }
  });

  router.put('/api/cover-letters/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!uuidSchema.safeParse(req.params.id).success) {
        res.status(400).json({ error: 'Invalid cover letter ID.' });
        return;
      }
      const parsed = z.object({ content: z.string().min(20).max(20000) }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Cover letter content is required.' });
        return;
      }
      const updated = await updateCoverLetter(req.user!.uid, String(req.params.id), parsed.data.content);
      if (!updated) {
        res.status(404).json({ error: 'Cover letter not found.' });
        return;
      }
      res.json(updated);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update cover letter.' });
    }
  });

  router.delete('/api/cover-letters/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!uuidSchema.safeParse(req.params.id).success) {
        res.status(400).json({ error: 'Invalid cover letter ID.' });
        return;
      }
      const deleted = await deleteCoverLetter(req.user!.uid, String(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: 'Cover letter not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete cover letter.' });
    }
  });

  // ============================================================================
  // 5. Interview Coach (/api/interviews)
  // ============================================================================
  router.get('/api/interviews', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessions = await listInterviewSessions(req.user!.uid);
      res.json(sessions);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load interview sessions.' });
    }
  });

  router.get('/api/interviews/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!uuidSchema.safeParse(req.params.id).success) {
        res.status(400).json({ error: 'Invalid session ID.' });
        return;
      }
      const detail = await getInterviewSessionWithMessages(req.user!.uid, String(req.params.id));
      if (!detail) {
        res.status(404).json({ error: 'Interview session not found.' });
        return;
      }
      res.json(detail);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load session details.' });
    }
  });

  router.post('/api/interviews', requireAuth, aiRateLimit, async (req: AuthRequest, res) => {
    try {
      const parsed = interviewCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Please specify a target role, category, and difficulty level.' });
        return;
      }
      let resumeText: string | undefined;
      if (parsed.data.resumeId) {
        const resume = await getResumeById(req.user!.uid, parsed.data.resumeId);
        resumeText = resume?.extractedText;
      }
      const questions = await generateInterviewQuestionsWithAI({
        jobTitle: parsed.data.jobTitle.trim(),
        company: parsed.data.company?.trim(),
        category: parsed.data.category,
        difficulty: parsed.data.difficulty,
        resumeText,
      });
      await getOrCreateProfile(req.user!.uid, req.user!.email || '', req.user!.name || '');
      const created = await createInterviewSessionWithQuestions(req.user!.uid, {
        jobTitle: parsed.data.jobTitle.trim(),
        company: parsed.data.company?.trim(),
        category: parsed.data.category,
        difficulty: parsed.data.difficulty,
        questions,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      sendAiError(res, error, 'Could not start interview session.');
    }
  });

  router.post(
    '/api/interviews/:id/messages/:messageId/evaluate',
    requireAuth,
    aiRateLimit,
    async (req: AuthRequest, res) => {
      try {
        if (!uuidSchema.safeParse(req.params.id).success || !uuidSchema.safeParse(req.params.messageId).success) {
          res.status(400).json({ error: 'Invalid interview identifiers.' });
          return;
        }
        const parsed = z.object({ userAnswer: z.string().min(15).max(8000) }).safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: 'Please write a complete answer (at least 15 characters) before requesting evaluation.',
          });
          return;
        }
        const detail = await getInterviewSessionWithMessages(req.user!.uid, String(req.params.id));
        if (!detail) {
          res.status(404).json({ error: 'Interview session not found.' });
          return;
        }
        const msg = detail.messages.find((m) => m.id === req.params.messageId);
        if (!msg) {
          res.status(404).json({ error: 'Interview question not found.' });
          return;
        }

        const evaluation = await evaluateInterviewAnswerWithAI({
          jobTitle: detail.session.jobTitle,
          question: msg.question,
          questionType: msg.questionType,
          difficulty: detail.session.difficulty,
          userAnswer: parsed.data.userAnswer.trim(),
        });

        const saved = await saveInterviewAnswerEvaluation(req.user!.uid, detail.session.id, msg.id, {
          userAnswer: parsed.data.userAnswer.trim(),
          ...evaluation,
        });
        res.json(saved);
      } catch (error: unknown) {
        sendAiError(res, error, 'Failed to evaluate answer.');
      }
    }
  );

  // ============================================================================
  // 6. Career Roadmaps (/api/roadmaps & /api/ai/roadmap)
  // ============================================================================
  router.get('/api/roadmaps', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await listCareerRoadmaps(req.user!.uid);
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load roadmaps.' });
    }
  });

  const handleGenerateRoadmap = async (req: AuthRequest, res: Response) => {
    try {
      const parsed = roadmapCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Please enter a target role and career goal.' });
        return;
      }
      await getOrCreateProfile(req.user!.uid, req.user!.email || '', req.user!.name || '');
      const userResumes = await listResumes(req.user!.uid);
      const primaryResume = userResumes.find((r) => r.isPrimary) || userResumes[0];
      const aiResult = await generateCareerRoadmapWithAI({
        ...parsed.data,
        resumeText: primaryResume?.extractedText,
      });
      const saved = await createCareerRoadmap(req.user!.uid, {
        targetRole: parsed.data.targetRole.trim(),
        careerGoal: parsed.data.careerGoal.trim(),
        timelineWeeks: parsed.data.timelineWeeks,
        ...aiResult,
      });
      res.status(201).json(saved);
    } catch (error: unknown) {
      sendAiError(res, error, 'Failed to generate roadmap.');
    }
  };

  router.post('/api/roadmaps', requireAuth, aiRateLimit, handleGenerateRoadmap);
  router.post('/api/ai/roadmap', requireAuth, aiRateLimit, handleGenerateRoadmap);

  router.put('/api/roadmaps/:id/milestones', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!uuidSchema.safeParse(req.params.id).success) {
        res.status(400).json({ error: 'Invalid roadmap ID.' });
        return;
      }
      const parsed = z.object({ milestones: z.array(milestoneSchema) }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid milestones payload.' });
        return;
      }
      const updated = await updateCareerRoadmapMilestones(
        req.user!.uid,
        String(req.params.id),
        parsed.data.milestones
      );
      if (!updated) {
        res.status(404).json({ error: 'Roadmap not found.' });
        return;
      }
      res.json(updated);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update roadmap progress.' });
    }
  });

  // ============================================================================
  // 7. AI Career Chat (/api/chat/* & /api/ai/chat)
  // ============================================================================
  router.get('/api/chat/conversations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await listChatConversations(req.user!.uid);
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load conversations.' });
    }
  });

  router.post('/api/chat/conversations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const title =
        typeof req.body?.title === 'string' && req.body.title.trim()
          ? req.body.title.trim().slice(0, 120)
          : 'New Career Strategy Session';
      await getOrCreateProfile(req.user!.uid, req.user!.email || '', req.user!.name || '');
      const created = await createChatConversation(req.user!.uid, title);
      res.status(201).json(created);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create conversation.' });
    }
  });

  router.delete('/api/chat/conversations/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!uuidSchema.safeParse(req.params.id).success) {
        res.status(400).json({ error: 'Invalid conversation ID.' });
        return;
      }
      await deleteChatConversation(req.user!.uid, String(req.params.id));
      res.json({ deleted: true });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete conversation.' });
    }
  });

  router.get('/api/chat/conversations/:id/messages', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!uuidSchema.safeParse(req.params.id).success) {
        res.status(400).json({ error: 'Invalid conversation ID.' });
        return;
      }
      const messages = await listChatMessages(req.user!.uid, String(req.params.id));
      res.json(messages);
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load messages.' });
    }
  });

  const handleChatTurn = async (req: AuthRequest, res: Response, conversationId: string) => {
    const parsed = z.object({ content: z.string().min(1).max(6000) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please enter a message.' });
      return;
    }

    const trimmedContent = parsed.data.content.trim();
    if (!trimmedContent) {
      res.status(400).json({ error: 'Please enter a message.' });
      return;
    }

    const userConversations = await listChatConversations(req.user!.uid);
    if (!userConversations.some((c) => c.id === conversationId)) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    const [existingMessages, { profileSummary, primaryResume }] = await Promise.all([
      listChatMessages(req.user!.uid, conversationId),
      buildProfileSummaryAndResume(req.user!.uid, req.user!.email || '', req.user!.name || ''),
    ]);

    const replyText = await generateCareerChatReply(
      existingMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      trimmedContent,
      {
        profileSummary,
        primaryResumeText: primaryResume?.extractedText,
      }
    );

    const userMsg = await addChatMessage(req.user!.uid, conversationId, 'user', trimmedContent);
    const assistantMsg = await addChatMessage(req.user!.uid, conversationId, 'assistant', replyText);
    res.status(201).json({ userMessage: userMsg, assistantMessage: assistantMsg });
  };

  router.post(
    '/api/chat/conversations/:id/messages',
    requireAuth,
    aiRateLimit,
    async (req: AuthRequest, res) => {
      try {
        if (!uuidSchema.safeParse(req.params.id).success) {
          res.status(400).json({ error: 'Invalid conversation ID.' });
          return;
        }
        await handleChatTurn(req, res, String(req.params.id));
      } catch (error: unknown) {
        sendAiError(res, error, 'AI assistant failed to reply.');
      }
    }
  );

  // Clean unified alias: POST /api/ai/chat (accepts { conversationId, content } or creates a conversation automatically)
  router.post('/api/ai/chat', requireAuth, aiRateLimit, async (req: AuthRequest, res) => {
    try {
      const schema = z.object({
        conversationId: z.string().uuid().optional(),
        content: z.string().min(1).max(6000),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success || !parsed.data.content.trim()) {
        res.status(400).json({ error: 'Please enter a message.' });
        return;
      }

      let conversationId = parsed.data.conversationId;
      if (!conversationId) {
        const trimmed = parsed.data.content.trim();
        const title = trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
        await getOrCreateProfile(req.user!.uid, req.user!.email || '', req.user!.name || '');
        const created = await createChatConversation(req.user!.uid, title);
        conversationId = created.id;
      }

      req.body = { content: parsed.data.content };
      await handleChatTurn(req, res, conversationId);
    } catch (error: unknown) {
      sendAiError(res, error, 'AI assistant failed to reply.');
    }
  });

  return router;
}
