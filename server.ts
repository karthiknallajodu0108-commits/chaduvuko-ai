import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateProfile,
  updateProfile,
  listResumes,
  createResume,
  updateResume,
  deleteResume,
  listSavedJobs,
  createSavedJob,
  deleteSavedJob,
  listApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  listSkillsProgress,
  upsertSkillProgress,
  deleteSkillProgress,
  getDashboardSummary,
} from './src/db/repository.ts';
import { isGeminiConfigured, getConfiguredGeminiModel } from './src/services/geminiService.ts';
import { getDatabaseHealthStatus } from './src/db/supabase.ts';
import { createAiRouter } from './src/routes/aiRoutes.ts';
import { extractResumeText, MAX_RESUME_FILE_SIZE } from './src/services/documentParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_FILE_SIZE, files: 1 },
});

const uuidSchema = z.string().uuid();

function safeUrl(val: string | undefined): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

// Health check
app.get('/api/health', async (_req, res) => {
  const database = await getDatabaseHealthStatus();
  res.json({
    ok: true,
    aiConfigured: isGeminiConfigured(),
    model: getConfiguredGeminiModel(),
    database,
  });
});

// Centralized AI endpoints (chat, resume analysis, job matching, resume tailor, cover letters, interviews, roadmaps)
app.use(createAiRouter());

// Dashboard summary
app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    const summary = await getDashboardSummary(
      req.user!.uid,
      req.user!.email || '',
      req.user!.name || ''
    );
    res.json(summary);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load dashboard.' });
  }
});

// Profile
app.get('/api/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getOrCreateProfile(
      req.user!.uid,
      req.user!.email || '',
      req.user!.name || ''
    );
    res.json(profile);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load profile.' });
  }
});

const profileUpdateSchema = z.object({
  fullName: z.string().max(120).optional(),
  headline: z.string().max(200).optional(),
  currentRole: z.string().max(120).optional(),
  targetRole: z.string().max(120).optional(),
  careerGoal: z.string().max(1000).optional(),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  education: z.string().max(500).optional(),
  experienceSummary: z.string().max(3000).optional(),
  skills: z.array(z.string().max(80)).max(60).optional(),
  preferredRoles: z.array(z.string().max(100)).max(20).optional(),
  preferredLocations: z.array(z.string().max(100)).max(20).optional(),
});

app.put('/api/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid profile data provided.' });
      return;
    }
    await getOrCreateProfile(req.user!.uid, req.user!.email || '', req.user!.name || '');
    const updated = await updateProfile(req.user!.uid, parsed.data);
    res.json(updated);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update profile.' });
  }
});

// Resumes
app.get('/api/resumes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await listResumes(req.user!.uid);
    res.json(rows);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load resumes.' });
  }
});

app.post('/api/resumes/upload', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Please select a PDF, DOCX, or TXT resume file to upload.' });
      return;
    }
    const extractedText = await extractResumeText(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    const title =
      typeof req.body?.title === 'string' && req.body.title.trim()
        ? req.body.title.trim().slice(0, 120)
        : req.file.originalname.replace(/\.(pdf|docx|txt)$/i, '');

    await getOrCreateProfile(req.user!.uid, req.user!.email || '', req.user!.name || '');
    const record = await createResume(req.user!.uid, {
      title,
      fileName: req.file.originalname.slice(0, 160),
      fileMime: req.file.mimetype || 'application/octet-stream',
      fileSize: req.file.size,
      extractedText,
      isPrimary: req.body?.isPrimary === 'true',
    });
    res.status(201).json(record);
  } catch (error: unknown) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to process resume file.' });
  }
});

const pasteResumeSchema = z.object({
  title: z.string().min(2).max(120),
  content: z.string().min(50).max(40000),
  isPrimary: z.boolean().optional(),
});

app.post('/api/resumes/text', requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = pasteResumeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please provide a title and at least 50 characters of resume content.' });
      return;
    }
    await getOrCreateProfile(req.user!.uid, req.user!.email || '', req.user!.name || '');
    const record = await createResume(req.user!.uid, {
      title: parsed.data.title.trim(),
      fileName: `${parsed.data.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`,
      fileMime: 'text/plain',
      fileSize: Buffer.byteLength(parsed.data.content, 'utf-8'),
      extractedText: parsed.data.content.trim(),
      isPrimary: parsed.data.isPrimary,
    });
    res.status(201).json(record);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save resume.' });
  }
});

const resumeUpdateSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  isPrimary: z.boolean().optional(),
});

app.put('/api/resumes/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!uuidSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'Invalid resume ID.' });
      return;
    }
    const parsed = resumeUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid resume update payload.' });
      return;
    }
    const updated = await updateResume(req.user!.uid, String(req.params.id), {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
      ...(parsed.data.isPrimary !== undefined ? { isPrimary: parsed.data.isPrimary } : {}),
    });
    if (!updated) {
      res.status(404).json({ error: 'Resume not found.' });
      return;
    }
    res.json(updated);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update resume.' });
  }
});

app.delete('/api/resumes/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!uuidSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'Invalid resume ID.' });
      return;
    }
    const deleted = await deleteResume(req.user!.uid, String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Resume not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete resume.' });
  }
});

// Saved Jobs
app.get('/api/saved-jobs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await listSavedJobs(req.user!.uid);
    res.json(rows);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load saved jobs.' });
  }
});

const savedJobSchema = z.object({
  jobMatchId: z.string().uuid().nullable().optional(),
  jobTitle: z.string().min(1).max(150),
  company: z.string().min(1).max(150),
  jobUrl: z.string().max(500).optional(),
  location: z.string().max(150).optional(),
  notes: z.string().max(2000).optional(),
  matchScore: z.number().int().min(0).max(100).nullable().optional(),
});

app.post('/api/saved-jobs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = savedJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid saved job payload.' });
      return;
    }
    await getOrCreateProfile(req.user!.uid, req.user!.email || '', req.user!.name || '');
    const created = await createSavedJob(req.user!.uid, {
      ...parsed.data,
      jobUrl: safeUrl(parsed.data.jobUrl),
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save job.' });
  }
});

app.delete('/api/saved-jobs/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!uuidSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'Invalid saved job ID.' });
      return;
    }
    const deleted = await deleteSavedJob(req.user!.uid, String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Saved job not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete saved job.' });
  }
});

// Skills Progress
app.get('/api/skills', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await listSkillsProgress(req.user!.uid);
    res.json(rows);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load skills.' });
  }
});

const skillSchema = z.object({
  id: z.string().uuid().optional(),
  skillName: z.string().min(1).max(80),
  category: z.string().min(1).max(60).default('Core'),
  proficiency: z.number().int().min(0).max(100),
  targetProficiency: z.number().int().min(0).max(100).default(85),
  status: z.enum(['Planned', 'In Progress', 'Proficient']).default('In Progress'),
});

app.post('/api/skills', requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = skillSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid skill data.' });
      return;
    }
    await getOrCreateProfile(req.user!.uid, req.user!.email || '', req.user!.name || '');
    const saved = await upsertSkillProgress(req.user!.uid, parsed.data);
    res.status(201).json(saved);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save skill.' });
  }
});

app.delete('/api/skills/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!uuidSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'Invalid skill ID.' });
      return;
    }
    await deleteSkillProgress(req.user!.uid, String(req.params.id));
    res.json({ deleted: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to remove skill.' });
  }
});

// Applications Tracker
const APPLICATION_STATUSES = ['Interested', 'Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'] as const;

app.get('/api/applications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await listApplications(req.user!.uid);
    res.json(rows);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load applications.' });
  }
});

const applicationSchema = z.object({
  company: z.string().min(1).max(150),
  jobTitle: z.string().min(1).max(150),
  jobLink: z.string().max(500).optional(),
  location: z.string().max(150).optional(),
  status: z.enum(APPLICATION_STATUSES).optional().default('Interested'),
  appliedDate: z.string().max(30).optional(),
  nextAction: z.string().max(240).optional(),
  followUpDate: z.string().max(30).optional(),
  notes: z.string().max(4000).optional(),
});

app.post('/api/applications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = applicationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please enter company and job title.' });
      return;
    }
    await getOrCreateProfile(req.user!.uid, req.user!.email || '', req.user!.name || '');
    const created = await createApplication(req.user!.uid, {
      ...parsed.data,
      jobLink: safeUrl(parsed.data.jobLink),
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create application.' });
  }
});

app.put('/api/applications/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!uuidSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'Invalid application ID.' });
      return;
    }
    const parsed = applicationSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid application update payload.' });
      return;
    }
    const payload = {
      ...parsed.data,
      ...(parsed.data.jobLink !== undefined ? { jobLink: safeUrl(parsed.data.jobLink) } : {}),
    };
    const updated = await updateApplication(req.user!.uid, String(req.params.id), payload);
    if (!updated) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    res.json(updated);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update application.' });
  }
});

app.delete('/api/applications/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!uuidSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'Invalid application ID.' });
      return;
    }
    const deleted = await deleteApplication(req.user!.uid, String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete application.' });
  }
});

// Error handler for Multer & unexpected errors
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: `File upload error: ${err.message}` });
    return;
  }
  console.error('Unhandled server error:', err instanceof Error ? err.message : 'Unknown error');
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const distDir = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);
  const httpServer = http.createServer(app);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: !hmrDisabled,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`CHADHUVUKO server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
