# CHADHUVUKO — AI Career Operating System

> **Find your fit. Build your edge. Land your role.**

CHADHUVUKO is a full-stack AI career platform built with React, TypeScript, Tailwind CSS, Express, Drizzle ORM (PostgreSQL), Firebase Authentication, and the `@google/genai` SDK.

## Implemented Capabilities

1. **Cinematic 3D-Inspired Opening Sequence** — Lightweight Canvas starfield, perspective orbital trajectories, CHADHUVUKO compass emblem reveal, light sweep, Skip button, session memory, and `prefers-reduced-motion` support.
2. **Executive SaaS Landing Page** — Clearly labeled interactive demo preview, asymmetric bento feature overview, interactive AI workspace showcase, editorial how-it-works split, and illustrative sample scenarios.
3. **Authentication & User Isolation** — Real Google Sign-In powered by Firebase Authentication (`signInWithPopup`) with server-side ID token verification (`firebase-admin`) and per-user row isolation across all 14 PostgreSQL tables.
4. **10 Integrated Career Workspaces**:
   - **Overview**: Real-time readiness metrics, dynamic recommended next action, application pipeline chart, and skill progression.
   - **AI Assistant**: Persistent multi-conversation career strategist grounded in your uploaded resume and profile.
   - **Resume Analyzer**: Secure PDF/DOCX/TXT upload, extracted text preview, and server-side text parsing (`unpdf`, `mammoth`) with explainable heuristic scoring, section audits, keyword analysis, and bullet rewrites.
   - **Job Matcher**: Role compatibility scoring, experience & qualifications alignment, matched/missing keywords, one-click job saving, and pipeline transfer.
   - **Resume Tailor**: Zero-fabrication resume tailoring with transparent bullet diffs, direct editing, and TXT export.
   - **Cover Letters**: Tone-selectable cover letter drafting with editing, saving, copy, and export.
   - **Interview Coach**: Written behavioral, technical, HR, and leadership simulations grounded in your chosen resume with structured STAR evaluation and session history.
   - **Career Roadmap & Skills Tracker**: Resume-grounded multi-week milestone plans, ranked learning priorities, completion persistence, and interactive skill proficiency sliders.
   - **Application Tracker**: Full CRUD pipeline (`Interested`, `Applied`, `Interview`, `Offer`, `Rejected`, `Withdrawn`) with create, inline edit, search, filters, and follow-up dates.
   - **Profile & Settings**: Career profile editing, resume library management, and account sign-out.

## Architecture Overview

- `server.ts` — Full-stack Express + Vite server with Zod validation, sliding-window rate limiting on AI endpoints, Multer 5 MB file upload validation, and authenticated REST routes (`/api/*`).
- `src/db/schema.ts` & `src/db/repository.ts` — Active Cloud SQL for PostgreSQL database managed via Drizzle ORM (14 relational tables with UUID primary keys, foreign keys, and indexes) and parameterized user-scoped queries.
- `src/services/aiService.ts` — Modular server-side Gemini AI engine (`gemini-4-hydrogen`) with structured JSON schemas and exponential backoff retry.
- `src/services/documentParser.ts` — PDF, DOCX, and TXT extraction with 5 MB file limit and MIME/extension checks.
- `supabase/migrations/001_careerpilot_schema.sql` — Complete portable Supabase PostgreSQL migration covering all 14 tables, Row Level Security policies, and a private `resumes` Storage bucket with per-user folder RLS for standalone Supabase deployments.

## Running & Deployment

- **Environment variables**: Configured automatically via the server environment (`GEMINI_API_KEY`, `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`).
- **Development**: `npm run dev` (starts Express + Vite on port `3000`).
- **Production build**: `npm run build` followed by `npm start`.
