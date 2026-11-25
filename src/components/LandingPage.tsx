import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  FileSearch,
  Target,
  FileEdit,
  MessageSquareText,
  Compass,
  Briefcase,
  CheckCircle2,
  Play,
  Menu,
  X,
} from 'lucide-react';
import { CareerPilotLogo } from './CareerPilotLogo';

interface LandingPageProps {
  onStartJourney: (targetSection?: string) => void;
  onLoginClick: () => void;
  onReplayIntro: () => void;
  isSignedIn: boolean;
}

const SHOWCASE_TABS = [
  {
    id: 'resume',
    label: 'Resume Intelligence',
    heading: 'Explainable scoring & bullet-level coaching',
    summary:
      'Upload a PDF or DOCX resume to uncover structural gaps, missing domain keywords, and concrete before-and-after bullet rewrites grounded strictly in your real work.',
    metrics: [
      { label: 'Composite Readiness', value: '86 / 100' },
      { label: 'Impact Density', value: '89 / 100' },
      { label: 'Keyword Coverage', value: '82 / 100' },
    ],
    highlights: [
      'Quantifies action-verb impact and ownership clarity across every role',
      'Maps missing high-priority keywords without fabricating credentials',
      'Generates ready-to-paste professional summary refinements',
    ],
  },
  {
    id: 'match',
    label: 'Smart Job Matcher',
    heading: 'Objective fit evaluation before you apply',
    summary:
      'Paste any job description alongside your primary resume to see a transparent compatibility score, matched skills, missing qualifications, and targeted interview angles.',
    metrics: [
      { label: 'Role Alignment', value: '91%' },
      { label: 'Matched Skills', value: '14 / 16' },
      { label: 'Gap Priorities', value: '2 items' },
    ],
    highlights: [
      'Separates must-have requirements from nice-to-have signals',
      'Saves high-fit opportunities straight into your application pipeline',
      'Recommends exact resume sections to emphasize for each employer',
    ],
  },
  {
    id: 'interview',
    label: 'Interview Coach',
    heading: 'STAR-method simulations with candid feedback',
    summary:
      'Practice behavioral, technical, HR, and leadership rounds tailored to your target role. Receive structured STAR scoring and model answer comparisons after every response.',
    metrics: [
      { label: 'Session Score', value: '84 / 100' },
      { label: 'STAR Structure', value: '4 / 4' },
      { label: 'Difficulty', value: 'Senior' },
    ],
    highlights: [
      'Evaluates Situation, Task, Action, and Result clarity independently',
      'Flags vague outcomes and suggests concise quantitative framing',
      'Persists every practice session so you can measure improvement over time',
    ],
  },
  {
    id: 'roadmap',
    label: 'Career Roadmap',
    heading: 'Structured milestones from today to offer',
    summary:
      'Turn your target role and current background into a realistic multi-week roadmap with weekly study topics, portfolio projects, and trackable skill progression.',
    metrics: [
      { label: 'Horizon', value: '12 Weeks' },
      { label: 'Milestones', value: '5 Phases' },
      { label: 'Tracked Skills', value: '8 Active' },
    ],
    highlights: [
      'Identifies highest-leverage skill gaps for career transitions',
      'Pairs each phase with hands-on portfolio deliverables',
      'Check off completed milestones as your readiness climbs',
    ],
  },
] as const;

const SAMPLE_SCENARIOS = [
  {
    name: 'Elena Brooks',
    role: 'Backend Engineer · Transitioning to Staff Systems',
    image: '/src/assets/images/sample_avatar_elena_1795602067163.jpg',
    quote:
      'Having resume intelligence, role-fit scoring, and STAR interview prep connected to the same profile eliminated the guesswork from preparing for senior engineering loops.',
    outcome: 'Illustrative sample scenario · Technical career progression',
  },
  {
    name: 'Marcus Reid',
    role: 'Product Analyst · Moving into Product Management',
    image: '/src/assets/images/sample_avatar_marcus_1795602068193.jpg',
    quote:
      'The roadmap broke my transition into four focused phases with portfolio case studies, while the resume tailor helped frame my analytics impact accurately for PM hiring managers.',
    outcome: 'Illustrative sample scenario · Cross-functional pivot',
  },
  {
    name: 'Priya Nair',
    role: 'Computer Science Graduate · First Full-Time Role',
    image: '/src/assets/images/sample_avatar_priya_1795602066245.jpg',
    quote:
      'Instead of sending generic applications, I compared every posting against my resume first, closed key SQL and system-design gaps, and kept follow-ups organized in one pipeline.',
    outcome: 'Illustrative sample scenario · Early-career launch',
  },
];

export function LandingPage({
  onStartJourney,
  onLoginClick,
  onReplayIntro,
  isSignedIn,
}: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<(typeof SHOWCASE_TABS)[number]['id']>('resume');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentShowcase = SHOWCASE_TABS.find((t) => t.id === activeTab) || SHOWCASE_TABS[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172033]">
      {/* Top Bar Contract: 3 clean zones — Wordmark | 4 single-line links | 1 primary CTA */}
      <header className="sticky top-0 z-40 bg-[#F8FAFC]/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
          <a href="#top" className="whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#101828] rounded-lg">
            <CareerPilotLogo size="sm" />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#64748B]">
            <a href="#features" className="hover:text-[#101828] transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#ai-tools" className="hover:text-[#101828] transition-colors whitespace-nowrap shrink-0">
              AI Tools
            </a>
            <a href="#how-it-works" className="hover:text-[#101828] transition-colors whitespace-nowrap shrink-0">
              How it works
            </a>
            <button
              type="button"
              onClick={isSignedIn ? () => onStartJourney('overview') : onLoginClick}
              className="hover:text-[#101828] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSignedIn ? 'Workspace' : 'Login'}
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onStartJourney('overview')}
              className="px-4 py-2 text-sm font-medium text-white bg-[#101828] hover:bg-[#142033] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSignedIn ? 'Open Dashboard' : 'Get started'}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 text-[#172033] hover:bg-slate-200/70 rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-5 py-4 space-y-3">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-sm font-medium text-[#172033]"
            >
              Features
            </a>
            <a
              href="#ai-tools"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-sm font-medium text-[#172033]"
            >
              AI Tools
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-sm font-medium text-[#172033]"
            >
              How it works
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (isSignedIn) onStartJourney('overview');
                else onLoginClick();
              }}
              className="block py-1.5 text-sm font-medium text-[#101828] cursor-pointer"
            >
              {isSignedIn ? 'Open Workspace' : 'Login'}
            </button>
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="relative pt-14 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-60"
            style={{
              background:
                'radial-gradient(60% 50% at 50% 0%, rgba(147,197,253,0.18) 0%, rgba(110,231,183,0.10) 42%, rgba(248,250,252,0) 100%)',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm font-medium text-[#64748B] tracking-tight">
                CHADHUVUKO · Find your fit. Build your edge. Land your role.
              </p>
              <h1
                className="mt-4 font-display font-bold tracking-tight text-[#101828] leading-[1.08]"
                style={{ fontSize: 'clamp(2.35rem, 4.5vw, 3.85rem)' }}
              >
                Your next career move starts here.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto leading-relaxed">
                Your AI career partner to understand your strengths, discover opportunities,
                improve your resume and prepare for your next big move.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={() => onStartJourney('overview')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] rounded-xl transition-colors cursor-pointer"
                >
                  <span>Start my career journey</span>
                  <ArrowRight className="w-4 h-4 text-[#6EE7B7]" />
                </button>
                <a
                  href="#ai-tools"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#172033] bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
                >
                  <span>Explore AI tools</span>
                </a>
              </div>
            </div>

            {/* Animated Interactive Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mt-14 lg:mt-16 relative"
            >
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_70px_-28px_rgba(16,24,40,0.18)] overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[430px]">
                  {/* Dark Navy Mini Sidebar */}
                  <div className="lg:col-span-3 bg-[#101828] text-slate-300 p-6 flex flex-col justify-between">
                    <div>
                      <CareerPilotLogo variant="light" size="sm" />
                      <div className="mt-7 space-y-1.5 text-sm">
                        {[
                          { label: 'Overview', active: true },
                          { label: 'AI Assistant', active: false },
                          { label: 'Resume Analyzer', active: false },
                          { label: 'Job Matcher', active: false },
                          { label: 'Interview Coach', active: false },
                          { label: 'Career Roadmap', active: false },
                          { label: 'Applications', active: false },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className={`px-3 py-2 rounded-lg font-medium ${
                              item.active
                                ? 'bg-[#142033] text-white border border-white/10'
                                : 'text-slate-400'
                            }`}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-8 pt-4 border-t border-white/10 text-xs text-slate-400">
                      <p className="text-slate-200 font-medium">Sample workspace preview</p>
                      <p className="mt-0.5">Live metrics sync to your profile</p>
                    </div>
                  </div>

                  {/* Light Workspace Preview Panels */}
                  <div className="lg:col-span-9 bg-[#F8FAFC] p-6 sm:p-8 flex flex-col justify-between gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                      <div>
                        <p className="text-xs font-medium text-[#64748B]">
                          Interactive Demo Preview · Illustrative Sample Data
                        </p>
                        <h2 className="mt-1 font-display text-xl font-bold text-[#101828]">
                          Senior Product Engineer · Demo Readiness Snapshot
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => onStartJourney('resume-analyzer')}
                        className="self-start sm:self-auto px-4 py-2 text-xs font-semibold text-[#101828] bg-[#6EE7B7] hover:bg-[#52dfa6] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Run my own analysis
                      </button>
                    </div>

                    {/* 4 Connected Preview Panels: Resume Analysis, Job Match, Skills, Career Progress */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Panel 1: Resume Analysis */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.18 }}
                        className="bg-white rounded-xl border border-slate-200 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-[#64748B]">Resume Intelligence</p>
                          <span className="font-mono text-xs font-medium text-emerald-700">
                            Ready to tailor
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="font-display text-3xl font-bold text-[#101828] tabular-nums">
                            86
                          </span>
                          <span className="text-sm text-[#64748B] tabular-nums">/ 100 readiness</span>
                        </div>
                        <div className="mt-4 space-y-2.5">
                          {[
                            { name: 'Impact & metrics', val: 89, bar: 'bg-[#101828]' },
                            { name: 'ATS structure', val: 92, bar: 'bg-emerald-500' },
                            { name: 'Keyword depth', val: 79, bar: 'bg-[#8B5CF6]' },
                          ].map((row) => (
                            <div key={row.name}>
                              <div className="flex justify-between text-xs text-[#64748B] mb-1">
                                <span>{row.name}</span>
                                <span className="font-mono tabular-nums text-[#172033]">{row.val}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${row.val}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Panel 2: Job Match Score */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.18 }}
                        className="bg-white rounded-xl border border-slate-200 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-[#64748B]">Smart Job Match</p>
                          <span className="font-mono text-xs text-[#64748B]">Staff Frontend · Linear</span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="font-display text-3xl font-bold text-emerald-700 tabular-nums">
                            91%
                          </span>
                          <span className="text-sm text-[#64748B]">compatibility fit</span>
                        </div>
                        <p className="mt-3 text-xs text-[#64748B] leading-relaxed">
                          Strong alignment on TypeScript architecture and design systems. Recommended
                          emphasis: observability metrics and cross-team RFC leadership.
                        </p>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
                          <span>14 matched requirements</span>
                          <span>2 priority gaps</span>
                        </div>
                      </motion.div>

                      {/* Panel 3: Skills Progression */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.18 }}
                        className="bg-white rounded-xl border border-slate-200 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-[#64748B]">Skills Trajectory</p>
                          <span className="text-xs text-[#64748B]">4 core tracks</span>
                        </div>
                        <div className="mt-4 space-y-2.5">
                          {[
                            { skill: 'System Design', pct: 84 },
                            { skill: 'TypeScript & React Architecture', pct: 94 },
                            { skill: 'PostgreSQL Performance', pct: 72 },
                            { skill: 'Executive Stakeholder Comm.', pct: 78 },
                          ].map((item) => (
                            <div key={item.skill} className="flex items-center justify-between gap-4 text-xs">
                              <span className="text-[#172033] font-medium truncate">{item.skill}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[#3B82F6]"
                                    style={{ width: `${item.pct}%` }}
                                  />
                                </div>
                                <span className="font-mono tabular-nums text-[#64748B] w-8 text-right">
                                  {item.pct}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Panel 4: Career Progress */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.18 }}
                        className="bg-white rounded-xl border border-slate-200 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-[#64748B]">12-Week Career Progress</p>
                          <span className="font-mono text-xs text-[#172033] tabular-nums">3 / 5 phases</span>
                        </div>
                        <div className="mt-4 space-y-2.5 text-xs">
                          {[
                            { step: 'Phase 1 · Resume calibration & keyword audit', done: true },
                            { step: 'Phase 2 · Distributed caching portfolio project', done: true },
                            { step: 'Phase 3 · Behavioral STAR story bank (12 stories)', done: true },
                            { step: 'Phase 4 · System design mock interviews', done: false },
                          ].map((row) => (
                            <div key={row.step} className="flex items-center gap-2.5">
                              <CheckCircle2
                                className={`w-4 h-4 shrink-0 ${
                                  row.done ? 'text-emerald-600' : 'text-slate-300'
                                }`}
                              />
                              <span className={row.done ? 'text-[#172033]' : 'text-[#64748B]'}>
                                {row.step}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Core Capabilities Bento Section */}
        <section id="features" className="py-20 lg:py-24 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-[#64748B]">Six connected workspaces</p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#101828]">
                Built as a unified operating system for your career.
              </h2>
              <p className="mt-3 text-base text-[#64748B] leading-relaxed">
                Every tool shares your profile and resume history—so your resume analysis informs
                your job matches, your gaps shape your roadmap, and your interview prep reflects
                your actual experience.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-6 gap-5">
              {/* Asymmetric Bento Cards */}
              <button
                type="button"
                onClick={() => onStartJourney('resume-analyzer')}
                className="md:col-span-3 text-left group bg-[#F8FAFC] hover:bg-white rounded-2xl border border-slate-200 p-7 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#64748B]">01</span>
                  <FileSearch className="w-5 h-5 text-[#101828] opacity-75 group-hover:opacity-100" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold text-[#101828]">
                  AI Resume Intelligence
                </h3>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                  Upload PDF or DOCX resumes for transparent rubric scoring, extracted skills,
                  section-by-section diagnostics, keyword coverage, and line-level bullet rewrites.
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#101828]">
                  Analyze resume <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => onStartJourney('job-matcher')}
                className="md:col-span-3 text-left group bg-[#F8FAFC] hover:bg-white rounded-2xl border border-slate-200 p-7 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#64748B]">02</span>
                  <Target className="w-5 h-5 text-[#101828] opacity-75 group-hover:opacity-100" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold text-[#101828]">
                  Smart Job Matching
                </h3>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                  Compare any job description against your resume to calculate compatibility, map
                  matched versus missing qualifications, and save high-fit roles instantly.
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#101828]">
                  Score job fit <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => onStartJourney('resume-tailor')}
                className="md:col-span-2 text-left group bg-[#F8FAFC] hover:bg-white rounded-2xl border border-slate-200 p-6 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#64748B]">03</span>
                  <FileEdit className="w-5 h-5 text-[#101828] opacity-75" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-[#101828]">
                  Resume Tailoring & Cover Letters
                </h3>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                  Reframe real achievements for each role without fabricating credentials. Edit and
                  export clean text or print-ready documents.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onStartJourney('interview-coach')}
                className="md:col-span-2 text-left group bg-[#F8FAFC] hover:bg-white rounded-2xl border border-slate-200 p-6 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#64748B]">04</span>
                  <MessageSquareText className="w-5 h-5 text-[#101828] opacity-75" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-[#101828]">
                  Interview Coach
                </h3>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                  Run behavioral, technical, and HR interview simulations with structured STAR
                  evaluation, scoring, and model response comparisons.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onStartJourney('career-roadmap')}
                className="md:col-span-2 text-left group bg-[#F8FAFC] hover:bg-white rounded-2xl border border-slate-200 p-6 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#64748B]">05</span>
                  <Compass className="w-5 h-5 text-[#101828] opacity-75" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-[#101828]">
                  Career Roadmap & Applications
                </h3>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                  Generate phase-by-phase skill plans, check off milestones, and manage every
                  application from Interested through Offer.
                </p>
              </button>
            </div>
          </div>
        </section>

        {/* Interactive AI Workspace Showcase */}
        <section id="ai-tools" className="py-20 lg:py-24 bg-[#101828] text-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-sm font-medium text-[#6EE7B7]">AI Workspace Showcase</p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Explore how CHADHUVUKO turns raw career data into decisive action.
                </h2>
              </div>

              {/* Interactive Tab Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#142033] border border-white/10 rounded-xl">
                {SHOWCASE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-white text-[#101828]'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7 bg-[#142033] border border-white/10 rounded-2xl p-7 sm:p-9 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-[#93C5FD]">{currentShowcase.label}</p>
                  <h3 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white">
                    {currentShowcase.heading}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                    {currentShowcase.summary}
                  </p>

                  <ul className="mt-7 space-y-3">
                    {currentShowcase.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-[#6EE7B7] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <span className="text-xs text-slate-400">
                    Grounded in your real resume — zero fabricated claims
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onStartJourney(
                        activeTab === 'resume'
                          ? 'resume-analyzer'
                          : activeTab === 'match'
                            ? 'job-matcher'
                            : activeTab === 'interview'
                              ? 'interview-coach'
                              : 'career-roadmap'
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#101828] bg-[#6EE7B7] hover:bg-[#52dfa6] rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Try {currentShowcase.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 gap-4">
                {currentShowcase.metrics.map((metric, idx) => (
                  <div
                    key={metric.label}
                    className="bg-[#142033] border border-white/10 rounded-2xl p-6 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs text-slate-400">{metric.label}</p>
                      <p className="mt-1 font-display text-3xl font-bold text-white tabular-nums">
                        {metric.value}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-slate-400">0{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works + Editorial Visual Split */}
        <section id="how-it-works" className="py-20 lg:py-24 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B]">How CHADHUVUKO works</p>
                  <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#101828]">
                    Clarity in four deliberate steps.
                  </h2>
                  <p className="mt-3 text-base text-[#64748B] leading-relaxed">
                    Designed around cognitive simplicity so you always know where you stand, what
                    matters most, and what action moves the needle today.
                  </p>
                </div>

                <div className="mt-8 space-y-6">
                  {[
                    {
                      num: '01',
                      title: 'Establish your factual baseline',
                      body: 'Upload your PDF or DOCX resume and set your target role. CHADHUVUKO extracts your verified skills and scores readiness transparently.',
                    },
                    {
                      num: '02',
                      title: 'Evaluate opportunities before applying',
                      body: 'Run target job descriptions through the Job Matcher to see exact compatibility, keyword coverage, and priority skill gaps.',
                    },
                    {
                      num: '03',
                      title: 'Tailor documents and rehearse interviews',
                      body: 'Generate factually faithful resume revisions, bespoke cover letters, and STAR-evaluated interview practice sessions.',
                    },
                    {
                      num: '04',
                      title: 'Execute your roadmap and pipeline',
                      body: 'Track milestone completion, build missing capabilities, and manage every active application and follow-up date in one workspace.',
                    },
                  ].map((step) => (
                    <div key={step.num} className="flex items-start gap-4 pb-5 border-b border-slate-200/80 last:border-b-0 last:pb-0">
                      <span className="font-mono text-xs font-semibold text-[#101828] pt-1">
                        {step.num}
                      </span>
                      <div>
                        <h3 className="font-display text-base font-bold text-[#101828]">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-sm text-[#64748B] leading-relaxed">{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[360px] rounded-2xl overflow-hidden border border-slate-200 bg-[#142033] relative">
                  <img
                    src="/src/assets/images/editorial_career_workspace_1795602064772.jpg"
                    alt="Minimalist career planning workspace in natural morning light"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-[#101828]/85 via-[#101828]/45 to-transparent text-white">
                    <p className="text-xs font-medium text-[#6EE7B7]">Career progression system</p>
                    <p className="mt-1 font-display text-lg font-semibold">
                      Built for students, career changers, and experienced professionals alike.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Clearly Labeled Sample Scenarios / Testimonials */}
        <section className="py-20 lg:py-24 bg-white border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-sm font-medium text-[#64748B]">
                  Sample user journeys · Illustrative examples
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#101828]">
                  How different career stages use CHADHUVUKO.
                </h2>
              </div>
              <p className="text-xs text-[#64748B] max-w-sm">
                The profiles below are clearly labeled sample scenarios illustrating typical
                workflows rather than real customer endorsements.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {SAMPLE_SCENARIOS.map((item) => (
                <article
                  key={item.name}
                  className="bg-[#F8FAFC] rounded-2xl border border-slate-200 p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3.5">
                      <img
                        src={item.image}
                        alt={`Illustrative portrait for ${item.name}`}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-bold text-[#101828] truncate">
                          {item.name}
                        </h3>
                        <p className="text-xs text-[#64748B] truncate">{item.role}</p>
                      </div>
                    </div>
                    <p className="mt-5 text-sm text-[#172033] leading-relaxed">“{item.quote}”</p>
                  </div>
                  <p className="mt-6 pt-4 border-t border-slate-200/80 text-xs text-[#64748B]">
                    {item.outcome}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-[#F8FAFC] border-t border-slate-200/80">
          <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#101828]">
              Ready to build your career edge with clarity?
            </h2>
            <p className="mt-4 text-base text-[#64748B] max-w-xl mx-auto">
              Sign in to upload your resume, run your first AI evaluation, and map out your next
              career move.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => onStartJourney('overview')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] rounded-xl transition-colors cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-[#6EE7B7]" />
                <span>Start my career journey</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <CareerPilotLogo size="sm" />
            <span className="text-xs text-[#64748B]">
              Find your fit. Build your edge. Land your role.
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#64748B]">
            <button
              type="button"
              onClick={onReplayIntro}
              className="inline-flex items-center gap-1.5 hover:text-[#101828] transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Replay intro</span>
            </button>
            <a href="#features" className="hover:text-[#101828] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#101828] transition-colors">
              How it works
            </a>
            <span>© {new Date().getFullYear()} CHADHUVUKO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
