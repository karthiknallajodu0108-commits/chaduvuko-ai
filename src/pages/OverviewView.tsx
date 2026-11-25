import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  ArrowRight,
  FileSearch,
  Target,
  MessageSquareText,
  Compass,
  Briefcase,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import type { DashboardSummary } from '../types/career';
import type { WorkspaceTab } from '../components/DashboardShell';

interface OverviewViewProps {
  onNavigate: (tab: WorkspaceTab) => void;
}

export function OverviewView({ onNavigate }: OverviewViewProps) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await apiRequest<DashboardSummary>('/api/dashboard');
      setData(summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-white border border-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white border border-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-72 bg-white border border-slate-200 rounded-2xl" />
          <div className="lg:col-span-5 h-72 bg-white border border-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-6 flex items-start gap-3 text-rose-800">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Could not load your career overview</p>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-[#101828] rounded-lg cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const safeApplications = Array.isArray(data.applications) ? data.applications : [];
  const safeSkills = Array.isArray(data.skills) ? data.skills : [];
  const safeRecentJobMatches = Array.isArray(data.recentJobMatches) ? data.recentJobMatches : [];
  const safeMilestones = Array.isArray(data.latestRoadmap?.milestones)
    ? data.latestRoadmap.milestones
    : [];

  const firstName = data.profile?.fullName?.split(' ')[0] || 'there';
  const statusCounts = ['Interested', 'Applied', 'Interview', 'Offer', 'Rejected'].map(
    (status) => ({
      name: status,
      count: safeApplications.filter((a) => a.status === status).length,
    })
  );
  const barColors = ['#93C5FD', '#3B82F6', '#8B5CF6', '#10B981', '#94A3B8'];

  const completedMilestones = safeMilestones.filter((m) => m.completed).length;
  const totalMilestones = safeMilestones.length;
  const roadmapPct =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Compute recommended next action based on actual account state
  const nextAction =
    data.resumesCount === 0
      ? {
          title: 'Upload your primary resume',
          description:
            'Add a PDF, DOCX, or text resume so CHADHUVUKO can score readiness, match jobs, and ground all AI coaching in your real experience.',
          cta: 'Upload resume',
          tab: 'resume-analyzer' as WorkspaceTab,
        }
      : !data.latestResumeAnalysis
        ? {
            title: 'Run your first AI Resume Analysis',
            description:
              'You have a resume on file. Run a full diagnostic to uncover strengths, keyword coverage, and line-level bullet improvements.',
            cta: 'Analyze resume',
            tab: 'resume-analyzer' as WorkspaceTab,
          }
        : data.jobMatchesCount === 0
          ? {
              title: 'Evaluate a target job posting',
              description:
                'Paste a job description into the Job Matcher to get an objective compatibility score and tailored interview preparation notes.',
              cta: 'Match a job',
              tab: 'job-matcher' as WorkspaceTab,
            }
          : !data.latestRoadmap
            ? {
                title: 'Build your personalized Career Roadmap',
                description:
                  'Generate a structured week-by-week plan covering skill gaps, portfolio projects, and role-specific milestones.',
                cta: 'Generate roadmap',
                tab: 'career-roadmap' as WorkspaceTab,
              }
            : {
                title: 'Practice a STAR Interview Simulation',
                description:
                  'Sharpen your delivery with role-specific behavioral and technical questions evaluated against the STAR framework.',
                cta: 'Start interview prep',
                tab: 'interview-coach' as WorkspaceTab,
              };

  return (
    <div className="space-y-6">
      {/* Welcome & Career Profile Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-medium text-[#64748B]">
            Career Overview · {data.profile.targetRole || 'Set your target role in Settings'}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#101828]">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-1.5 text-sm text-[#64748B] max-w-2xl">
            {data.profile.careerGoal
              ? data.profile.careerGoal
              : 'Your unified operating system for resume intelligence, role fit, interview mastery, and application momentum.'}
          </p>
        </div>

        {/* Recommended Next Action Strip */}
        <div className="lg:max-w-sm w-full bg-[#101828] text-white rounded-xl p-4 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-[#6EE7B7]">Recommended next step</p>
            <p className="mt-1 font-display text-sm font-semibold">{nextAction.title}</p>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">{nextAction.description}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(nextAction.tab)}
            className="mt-3.5 self-start inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#101828] bg-[#6EE7B7] hover:bg-[#52dfa6] rounded-lg transition-colors cursor-pointer"
          >
            <span>{nextAction.cta}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Core KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-[#64748B]">Resume Readiness</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-[#101828] tabular-nums">
              {data.latestResumeAnalysis ? data.latestResumeAnalysis.overallScore : '—'}
            </span>
            <span className="text-xs text-[#64748B] tabular-nums">
              {data.latestResumeAnalysis ? '/ 100 heuristic score' : `${data.resumesCount} uploaded`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('resume-analyzer')}
            className="mt-3 text-xs font-semibold text-[#101828] hover:underline cursor-pointer"
          >
            {data.latestResumeAnalysis ? 'View diagnostics →' : 'Analyze resume →'}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-[#64748B]">Average Job Fit</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-emerald-700 tabular-nums">
              {data.averageMatchScore !== null ? `${data.averageMatchScore}%` : '—'}
            </span>
            <span className="text-xs text-[#64748B] tabular-nums">
              {data.jobMatchesCount} {data.jobMatchesCount === 1 ? 'role' : 'roles'} evaluated
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('job-matcher')}
            className="mt-3 text-xs font-semibold text-[#101828] hover:underline cursor-pointer"
          >
            Match new role →
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-[#64748B]">Active Applications</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-[#101828] tabular-nums">
              {safeApplications.length}
            </span>
            <span className="text-xs text-[#64748B] tabular-nums">
              {safeApplications.filter((a) => a.status === 'Interview').length} interviewing
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('applications')}
            className="mt-3 text-xs font-semibold text-[#101828] hover:underline cursor-pointer"
          >
            Open pipeline →
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-[#64748B]">Interview & Roadmap</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-[#101828] tabular-nums">
              {data.averageInterviewScore !== null
                ? `${data.averageInterviewScore}`
                : `${roadmapPct}%`}
            </span>
            <span className="text-xs text-[#64748B] tabular-nums">
              {data.averageInterviewScore !== null
                ? `avg across ${data.interviewsCount} sessions`
                : 'roadmap completion'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('interview-coach')}
            className="mt-3 text-xs font-semibold text-[#101828] hover:underline cursor-pointer"
          >
            Practice interview →
          </button>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Application Pipeline Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-base font-bold text-[#101828]">
                Application Pipeline
              </h2>
              <p className="text-xs text-[#64748B]">Distribution across active hiring stages</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('applications')}
              className="text-xs font-semibold text-[#101828] hover:underline cursor-pointer"
            >
              Manage all
            </button>
          </div>

          {safeApplications.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-xl p-6">
              <Briefcase className="w-6 h-6 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-[#172033]">No applications tracked yet</p>
              <p className="mt-1 text-xs text-[#64748B] max-w-xs">
                Log roles you are interested in or actively applying to so you never miss a follow-up.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('applications')}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#101828] rounded-lg cursor-pointer"
              >
                Add first application
              </button>
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusCounts} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={44}>
                    {statusCounts.map((entry, idx) => (
                      <Cell key={entry.name} fill={barColors[idx % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Skill Progression & Roadmap */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base font-bold text-[#101828]">
                  Skill Progression
                </h2>
                <p className="text-xs text-[#64748B]">Tracked capabilities & target readiness</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('career-roadmap')}
                className="text-xs font-semibold text-[#101828] hover:underline cursor-pointer"
              >
                Update
              </button>
            </div>

            {safeSkills.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl px-4">
                <Compass className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="mt-2 text-sm font-medium text-[#172033]">No tracked skills yet</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Add key skills in Career Roadmap to track proficiency growth toward your target role.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {safeSkills.slice(0, 5).map((skill) => (
                  <div key={skill.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-[#172033]">{skill.skillName}</span>
                      <span className="font-mono tabular-nums text-[#64748B]">
                        {skill.proficiency}% / {skill.targetProficiency}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#101828] rounded-full transition-all"
                        style={{ width: `${Math.min(100, skill.proficiency)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {data.latestRoadmap && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#172033]">
                  Active Roadmap · {data.latestRoadmap.targetRole}
                </span>
                <span className="font-mono tabular-nums text-emerald-700 font-semibold">
                  {completedMilestones}/{totalMilestones} done
                </span>
              </div>
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${roadmapPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-base font-bold text-[#101828]">Quick Actions</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Jump directly into any AI workspace</p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Ask CHADHUVUKO AI', sub: 'Strategy & career Q&A', tab: 'ai-assistant' as WorkspaceTab, icon: Sparkles },
              { label: 'Analyze Resume', sub: 'Upload PDF / DOCX', tab: 'resume-analyzer' as WorkspaceTab, icon: FileSearch },
              { label: 'Match a Job', sub: 'Compare role alignment', tab: 'job-matcher' as WorkspaceTab, icon: Target },
              { label: 'Practice Interview', sub: 'STAR rubric simulation', tab: 'interview-coach' as WorkspaceTab, icon: MessageSquareText },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => onNavigate(item.tab)}
                  className="text-left p-4 rounded-xl border border-slate-200 hover:border-[#101828]/40 hover:bg-[#F8FAFC] transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-[#101828] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#101828]">{item.label}</p>
                    <p className="text-xs text-[#64748B]">{item.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-base font-bold text-[#101828]">Recent Job Matches</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Latest AI compatibility evaluations</p>

          {safeRecentJobMatches.length === 0 ? (
            <div className="mt-4 py-8 text-center border border-dashed border-slate-200 rounded-xl">
              <p className="text-sm font-medium text-[#172033]">No job matches yet</p>
              <p className="mt-1 text-xs text-[#64748B]">
                Compare your resume against any posting in Job Matcher.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {safeRecentJobMatches.map((match) => (
                <div key={match.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#101828] truncate">
                      {match.jobTitle}
                    </p>
                    <p className="text-xs text-[#64748B] truncate">
                      {match.company} · {new Date(match.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono text-sm font-bold text-[#101828] tabular-nums">
                      {match.matchScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
