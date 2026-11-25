import React, { useEffect, useState } from 'react';
import {
  Target,
  Bookmark,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Briefcase,
  RotateCcw,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import { aiApi } from '../services/aiApiClient';
import type { JobMatchRecord, ResumeRecord, SavedJobRecord } from '../types/career';

export function JobMatcherView() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [matches, setMatches] = useState<JobMatchRecord[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJobRecord[]>([]);
  const [activeMatch, setActiveMatch] = useState<JobMatchRecord | null>(null);

  const [resumeId, setResumeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetryEvaluate, setCanRetryEvaluate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<ResumeRecord[]>('/api/resumes'),
      aiApi.listJobMatches(),
      apiRequest<SavedJobRecord[]>('/api/saved-jobs'),
    ])
      .then(([r, m, s]) => {
        const safeResumes = Array.isArray(r) ? r : [];
        const safeMatches = Array.isArray(m) ? m : [];
        const safeSaved = Array.isArray(s) ? s : [];
        setResumes(safeResumes);
        setMatches(safeMatches);
        setSavedJobs(safeSaved);
        if (safeResumes.length > 0) setResumeId(safeResumes[0].id);
        if (safeMatches.length > 0) setActiveMatch(safeMatches[0]);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load job matcher data.');
      })
      .finally(() => setLoading(false));
  }, []);

  const runEvaluation = async () => {
    if (!resumeId) {
      setError('Upload a resume in Resume Analyzer first so we can score role alignment.');
      setCanRetryEvaluate(false);
      return;
    }
    setError(null);
    setCanRetryEvaluate(false);
    setNotice(null);
    setEvaluating(true);
    try {
      const created = await aiApi.evaluateJobMatch({
        resumeId,
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        jobDescription: jobDescription.trim(),
      });
      setMatches((prev) => [created, ...prev]);
      setActiveMatch(created);
      setNotice(`Evaluated compatibility for ${created.jobTitle} at ${created.company}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Job matching failed.');
      setCanRetryEvaluate(true);
    } finally {
      setEvaluating(false);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    await runEvaluation();
  };

  const handleSaveJob = async (match: JobMatchRecord) => {
    setError(null);
    try {
      const saved = await apiRequest<SavedJobRecord>('/api/saved-jobs', {
        method: 'POST',
        body: {
          jobMatchId: match.id,
          jobTitle: match.jobTitle,
          company: match.company,
          matchScore: match.matchScore,
          notes: match.explanation.slice(0, 300),
        },
      });
      setSavedJobs((prev) => [saved, ...prev]);
      setNotice(`Saved "${match.jobTitle}" at ${match.company} to your Saved Jobs list.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save job.');
    }
  };

  const handleTrackApplication = async (match: JobMatchRecord) => {
    setError(null);
    try {
      await apiRequest('/api/applications', {
        method: 'POST',
        body: {
          company: match.company,
          jobTitle: match.jobTitle,
          status: 'Interested',
          nextAction: 'Tailor resume and submit application',
          notes: `AI Match Score: ${match.matchScore}%. Key gaps: ${match.skillGaps.slice(0, 3).join(', ')}`,
        },
      });
      setNotice(`Added "${match.jobTitle}" at ${match.company} to Application Tracker.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add to tracker.');
    }
  };

  const handleRemoveSaved = async (id: string) => {
    try {
      await apiRequest(`/api/saved-jobs/${id}`, { method: 'DELETE' });
      setSavedJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not remove saved job.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h1 className="font-display text-2xl font-bold text-[#101828]">Smart Job Matcher</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Evaluate your compatibility against any target job description before spending time
          tailoring and applying.
        </p>

        {error && (
          <div className="mt-4 flex items-start justify-between gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
            {canRetryEvaluate && resumeId && jobTitle.trim() && company.trim() && jobDescription.trim() && !evaluating && (
              <button
                type="button"
                onClick={runEvaluation}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-900 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}
        {notice && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleEvaluate} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Resume</label>
              <select
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                disabled={loading || resumes.length === 0}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#101828]/20"
              >
                {resumes.length === 0 ? (
                  <option value="">No resumes uploaded yet</option>
                ) : (
                  resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Job Title</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Senior Frontend Engineer"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#101828]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Company</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Stripe"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#101828]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">
              Job Description
            </label>
            <textarea
              rows={5}
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job requirements, responsibilities, and qualifications..."
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#101828]/20"
            />
          </div>

          <button
            type="submit"
            disabled={evaluating || !resumeId}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
          >
            {evaluating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating role compatibility...</span>
              </>
            ) : (
              <>
                <Target className="w-4 h-4 text-[#6EE7B7]" />
                <span>Calculate Job Fit</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Active Match Report */}
      {activeMatch && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <p className="text-xs font-medium text-[#64748B]">
                {activeMatch.company} · Evaluated {new Date(activeMatch.createdAt).toLocaleDateString()}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#101828]">
                {activeMatch.jobTitle}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <span className="text-xs text-[#64748B] mr-2">Match Score</span>
                <span className="font-display text-2xl font-bold text-emerald-700 tabular-nums">
                  {activeMatch.matchScore}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSaveJob(activeMatch)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#101828] bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save job</span>
              </button>
              <button
                type="button"
                onClick={() => handleTrackApplication(activeMatch)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#101828] hover:bg-[#142033] rounded-lg cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5 text-[#6EE7B7]" />
                <span>Add to Applications</span>
              </button>
            </div>
          </div>

          <p className="text-sm text-[#172033] leading-relaxed">{activeMatch.explanation}</p>

          {(activeMatch.experienceAlignment || activeMatch.qualificationsAlignment) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMatch.experienceAlignment && (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <p className="text-xs font-semibold text-[#101828]">Experience Alignment</p>
                  <p className="mt-1.5 text-sm text-[#64748B] leading-relaxed">
                    {activeMatch.experienceAlignment}
                  </p>
                </div>
              )}
              {activeMatch.qualificationsAlignment && (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <p className="text-xs font-semibold text-[#101828]">Qualifications Alignment</p>
                  <p className="mt-1.5 text-sm text-[#64748B] leading-relaxed">
                    {activeMatch.qualificationsAlignment}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-display text-sm font-bold text-[#101828]">Aligned Strengths</h3>
              <ul className="space-y-2 text-sm text-[#172033]">
                {(activeMatch.strengths ?? []).map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-display text-sm font-bold text-[#101828]">Skill Gaps to Address</h3>
              <ul className="space-y-2 text-sm text-[#172033]">
                {(activeMatch.skillGaps ?? []).map((g, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold text-[#101828]">Matched Keywords</p>
              <p className="mt-1.5 text-sm text-emerald-800 leading-relaxed">
                {activeMatch.matchedKeywords.join(' · ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#101828]">Missing Keywords</p>
              <p className="mt-1.5 text-sm text-amber-800 leading-relaxed">
                {activeMatch.missingKeywords.join(' · ') || 'None'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <h3 className="font-display text-sm font-bold text-[#101828]">
                Resume Recommendations
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm text-[#64748B]">
                {activeMatch.resumeRecommendations.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#101828]">
                Interview Preparation Angles
              </h3>
              <ul className="mt-2 list-disc pl-5 space-y-1.5 text-sm text-[#64748B]">
                {activeMatch.interviewSuggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Match History & Saved Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-base font-bold text-[#101828]">Evaluation History</h2>
          {matches.length === 0 ? (
            <p className="mt-3 text-xs text-[#64748B]">No job evaluations recorded yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMatch(m)}
                  className={`w-full py-3 px-2 flex items-center justify-between text-left hover:bg-slate-50 rounded-lg transition-colors cursor-pointer ${
                    activeMatch?.id === m.id ? 'bg-[#F8FAFC]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#101828] truncate">{m.jobTitle}</p>
                    <p className="text-xs text-[#64748B] truncate">{m.company}</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums shrink-0 ml-3">
                    {m.matchScore}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-base font-bold text-[#101828]">Saved Jobs</h2>
          {savedJobs.length === 0 ? (
            <p className="mt-3 text-xs text-[#64748B]">
              Click "Save job" on any match result to bookmark high-fit opportunities.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {savedJobs.map((job) => (
                <div key={job.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#101828] truncate">{job.jobTitle}</p>
                    <p className="text-xs text-[#64748B] truncate">
                      {job.company}
                      {job.matchScore !== null ? ` · ${job.matchScore}% fit` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove saved job"
                    onClick={() => handleRemoveSaved(job.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
