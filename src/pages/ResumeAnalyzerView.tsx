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
  Upload,
  FileText,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Info,
  Eye,
  EyeOff,
  Star,
  RotateCcw,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import { aiApi } from '../services/aiApiClient';
import type { ResumeAnalysisRecord, ResumeRecord } from '../types/career';

export function ResumeAnalyzerView() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [analyses, setAnalyses] = useState<ResumeAnalysisRecord[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [activeAnalysis, setActiveAnalysis] = useState<ResumeAnalysisRecord | null>(null);
  const [targetRole, setTargetRole] = useState('');

  const [uploadMode, setUploadMode] = useState<'file' | 'paste'>('file');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showExtractedPreview, setShowExtractedPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canRetryAnalysis, setCanRetryAnalysis] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumeRows, analysisRows] = await Promise.all([
        apiRequest<ResumeRecord[]>('/api/resumes'),
        aiApi.listResumeAnalyses(),
      ]);
      const safeResumes = Array.isArray(resumeRows) ? resumeRows : [];
      const safeAnalyses = Array.isArray(analysisRows) ? analysisRows : [];
      setResumes(safeResumes);
      setAnalyses(safeAnalyses);
      if (safeResumes.length > 0) {
        setSelectedResumeId((prev) => prev || safeResumes[0].id);
      }
      if (safeAnalyses.length > 0) {
        setActiveAnalysis((prev) => prev || safeAnalyses[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load resumes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setNotice(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name.replace(/\.(pdf|docx|txt)$/i, ''));
      const saved = await apiRequest<ResumeRecord>('/api/resumes/upload', {
        method: 'POST',
        formData: fd,
      });
      setResumes((prev) => [saved, ...prev]);
      setSelectedResumeId(saved.id);
      setNotice(`Uploaded "${saved.title}" and extracted text successfully.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'File upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteTitle.trim() || pasteText.trim().length < 50) {
      setError('Please enter a resume title and at least 50 characters of resume text.');
      return;
    }
    setError(null);
    setNotice(null);
    setUploading(true);
    try {
      const saved = await apiRequest<ResumeRecord>('/api/resumes/text', {
        method: 'POST',
        body: { title: pasteTitle.trim(), content: pasteText.trim() },
      });
      setResumes((prev) => [saved, ...prev]);
      setSelectedResumeId(saved.id);
      setPasteTitle('');
      setPasteText('');
      setNotice(`Saved "${saved.title}" to your resume library.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save resume text.');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimaryResume = async (id: string) => {
    setError(null);
    try {
      const updated = await apiRequest<ResumeRecord>(`/api/resumes/${id}`, {
        method: 'PUT',
        body: { isPrimary: true },
      });
      setResumes((prev) =>
        prev.map((r) => ({ ...r, isPrimary: r.id === updated.id }))
      );
      setNotice(`Set "${updated.title}" as your primary resume.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update primary resume.');
    }
  };

  const handleDeleteResume = async (id: string) => {
    try {
      await apiRequest(`/api/resumes/${id}`, { method: 'DELETE' });
      setResumes((prev) => {
        const next = prev.filter((r) => r.id !== id);
        if (selectedResumeId === id) setSelectedResumeId(next[0]?.id ?? '');
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete resume.');
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedResumeId) {
      setError('Please upload or select a resume first.');
      setCanRetryAnalysis(false);
      return;
    }
    setError(null);
    setCanRetryAnalysis(false);
    setNotice(null);
    setAnalyzing(true);
    try {
      const created = await aiApi.analyzeResume({
        resumeId: selectedResumeId,
        targetRole: targetRole.trim() || undefined,
      });
      setAnalyses((prev) => [created, ...prev]);
      setActiveAnalysis(created);
      setNotice('AI resume analysis completed and saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Resume analysis failed.');
      setCanRetryAnalysis(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedResume = resumes.find((r) => r.id === selectedResumeId) ?? null;

  const scoreMetrics = activeAnalysis
    ? [
        { name: 'Overall', score: activeAnalysis.overallScore, color: '#101828' },
        { name: 'ATS Structure', score: activeAnalysis.atsReadinessScore, color: '#10B981' },
        { name: 'Impact', score: activeAnalysis.impactScore, color: '#3B82F6' },
        { name: 'Keywords', score: activeAnalysis.keywordScore, color: '#8B5CF6' },
        { name: 'Clarity', score: activeAnalysis.clarityScore, color: '#0EA5E9' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h1 className="font-display text-2xl font-bold text-[#101828]">AI Resume Intelligence</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Upload a PDF or DOCX resume for structured diagnostics, keyword coverage, and line-level
          bullet recommendations.
        </p>

        {error && (
          <div className="mt-4 flex items-start justify-between gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
            {canRetryAnalysis && selectedResumeId && !analyzing && (
              <button
                type="button"
                onClick={handleRunAnalysis}
                className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1 text-xs font-semibold text-rose-900 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer"
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

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload / Paste Card */}
          <div className="lg:col-span-6 border border-slate-200 rounded-xl p-5 bg-[#F8FAFC]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-[#101828]">Add a resume</span>
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    uploadMode === 'file' ? 'bg-white text-[#101828] shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  Upload PDF / DOCX
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('paste')}
                  className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    uploadMode === 'paste' ? 'bg-white text-[#101828] shadow-xs' : 'text-[#64748B]'
                  }`}
                >
                  Paste Text
                </button>
              </div>
            </div>

            {uploadMode === 'file' ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#101828]/50 rounded-xl p-7 bg-white transition-colors cursor-pointer text-center">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-[#101828] animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-[#101828]" />
                )}
                <span className="mt-2.5 text-sm font-semibold text-[#101828]">
                  {uploading ? 'Extracting resume text...' : 'Choose PDF, DOCX, or TXT file'}
                </span>
                <span className="mt-1 text-xs text-[#64748B]">
                  Max 5 MB · Private to your account
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            ) : (
              <form onSubmit={handlePasteSubmit} className="space-y-3">
                <input
                  type="text"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="Resume title (e.g., Senior Backend Engineer 2026)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101828]/20"
                />
                <textarea
                  rows={5}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste your resume content here..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101828]/20"
                />
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#101828] hover:bg-[#142033] disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  {uploading ? 'Saving...' : 'Save Resume'}
                </button>
              </form>
            )}
          </div>

          {/* Select & Analyze Panel */}
          <div className="lg:col-span-6 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#101828]">Your Resume Library</h2>
              {loading ? (
                <div className="mt-3 h-20 bg-slate-100 rounded-lg animate-pulse" />
              ) : resumes.length === 0 ? (
                <p className="mt-3 text-xs text-[#64748B]">
                  No resumes uploaded yet. Upload a PDF/DOCX or paste your resume on the left.
                </p>
              ) : (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {resumes.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedResumeId(r.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedResumeId(r.id);
                      }}
                      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        selectedResumeId === r.id
                          ? 'border-[#101828] bg-[#F8FAFC] text-[#101828] font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-[#172033]'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 shrink-0 text-[#64748B]" />
                        <span className="truncate">{r.title}</span>
                        <span className="text-[#64748B] font-normal shrink-0">
                          · {Math.max(1, Math.round(r.fileSize / 1024))} KB
                          {r.isPrimary ? ' · Primary' : ''}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {!r.isPrimary && (
                          <button
                            type="button"
                            aria-label={`Set ${r.title} as primary`}
                            title="Set as primary resume"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetPrimaryResume(r.id);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-500 cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Delete ${r.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteResume(r.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedResume && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowExtractedPreview((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#101828] hover:underline cursor-pointer"
                  >
                    {showExtractedPreview ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {showExtractedPreview ? 'Hide extracted text preview' : 'View extracted text preview'}
                    </span>
                  </button>
                  {showExtractedPreview && (
                    <div className="mt-2 p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 max-h-44 overflow-y-auto">
                      <p className="text-[11px] font-medium text-[#64748B] mb-1">
                        {selectedResume.fileName} · {(selectedResume.extractedText || '').length.toLocaleString()} characters extracted
                      </p>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] text-[#172033] leading-relaxed">
                        {selectedResume.extractedText}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Optional target role for keyword calibration
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g., Full-Stack Software Engineer, Product Manager"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#101828]/20"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={analyzing || !selectedResumeId}
              onClick={handleRunAnalysis}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing resume with CHADHUVUKO AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#6EE7B7]" />
                  <span>Run Full Resume Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      {activeAnalysis && (
        <div className="space-y-6">
          {/* History switcher if multiple */}
          {analyses.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-medium text-[#64748B] shrink-0">Saved reports:</span>
              {analyses.map((rep, idx) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setActiveAnalysis(rep)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                    activeAnalysis.id === rep.id
                      ? 'bg-[#101828] text-white border-[#101828]'
                      : 'bg-white text-[#64748B] border-slate-200 hover:text-[#101828]'
                  }`}
                >
                  Report #{analyses.length - idx} · {rep.overallScore}/100
                </button>
              ))}
            </div>
          )}

          {/* Score Breakdown + Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B]">Composite Readiness Score</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-5xl font-bold text-[#101828] tabular-nums">
                    {activeAnalysis.overallScore}
                  </span>
                  <span className="text-sm text-[#64748B] tabular-nums">/ 100</span>
                </div>
                <p className="mt-3 text-sm text-[#172033] leading-relaxed">
                  {activeAnalysis.careerSummary}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-[#64748B]">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                <p>{activeAnalysis.scoringMethodology}</p>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-display text-base font-bold text-[#101828]">
                Dimension Breakdown
              </h2>
              <p className="text-xs text-[#64748B]">Transparent heuristic rubric across 5 axes</p>
              <div className="mt-4 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreMetrics} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={48}>
                      {scoreMetrics.map((m) => (
                        <Cell key={m.name} fill={m.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-display text-base font-bold text-[#101828]">Key Strengths</h2>
              <div className="mt-4 space-y-3.5">
                {(Array.isArray(activeAnalysis.strengths) ? activeAnalysis.strengths : []).map((s, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-[#101828]">{s.title}</p>
                      <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-display text-base font-bold text-[#101828]">
                Priority Improvements
              </h2>
              <div className="mt-4 space-y-3.5">
                {(Array.isArray(activeAnalysis.weaknesses) ? activeAnalysis.weaknesses : []).map((w, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-[#101828]">{w.title}</p>
                      <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{w.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section Analysis & Skills / Keywords */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="font-display text-base font-bold text-[#101828]">
                  Experience & Education Review
                </h2>
                <p className="mt-2 text-sm text-[#172033] leading-relaxed">
                  {activeAnalysis.experienceAnalysis}
                </p>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                  {activeAnalysis.educationAnalysis}
                </p>
              </div>

              {Array.isArray(activeAnalysis.sectionScores) && activeAnalysis.sectionScores.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-semibold text-[#101828]">Section-by-section scores</p>
                  {activeAnalysis.sectionScores.map((sec) => (
                    <div key={sec.section}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-[#172033]">{sec.section}</span>
                        <span className="font-mono tabular-nums text-[#64748B]">{sec.score}/100</span>
                      </div>
                      <p className="text-xs text-[#64748B] mb-1.5">{sec.notes}</p>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#101828] rounded-full" style={{ width: `${sec.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="font-display text-base font-bold text-[#101828]">
                  Extracted Skills & Missing Signals
                </h2>
                <p className="mt-2 text-xs font-medium text-[#64748B]">Detected in resume</p>
                <p className="mt-1 text-sm text-[#172033] leading-relaxed">
                  {(Array.isArray(activeAnalysis.extractedSkills) ? activeAnalysis.extractedSkills : []).join(' · ') || 'None detected'}
                </p>

                <p className="mt-4 text-xs font-medium text-[#64748B]">Missing or under-represented</p>
                <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                  {(Array.isArray(activeAnalysis.missingSkills) ? activeAnalysis.missingSkills : []).join(' · ') || 'No critical skill gaps flagged'}
                </p>
              </div>

              {Array.isArray(activeAnalysis.keywordAnalysis) && activeAnalysis.keywordAnalysis.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-[#101828] mb-2">Keyword Audit</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-[#64748B]">
                          <th className="py-2 font-medium">Keyword</th>
                          <th className="py-2 font-medium">Status</th>
                          <th className="py-2 font-medium text-right">Priority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeAnalysis.keywordAnalysis.slice(0, 10).map((kw, idx) => (
                          <tr key={idx}>
                            <td className="py-2 font-medium text-[#172033]">{kw.keyword}</td>
                            <td className="py-2 capitalize text-[#64748B]">{kw.status}</td>
                            <td className="py-2 text-right capitalize font-mono text-[#172033]">
                              {kw.importance}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bullet-Point & Summary Improvements */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="font-display text-base font-bold text-[#101828]">
                Bullet-Point Rewrites
              </h2>
              <p className="text-xs text-[#64748B]">
                Factually faithful refinements designed to highlight measurable impact
              </p>

              <div className="mt-4 space-y-4">
                {(Array.isArray(activeAnalysis.bulletImprovements) ? activeAnalysis.bulletImprovements : []).map((b, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                    <p className="text-xs text-[#64748B]">
                      <span className="font-semibold text-slate-500">Original:</span> {b.original}
                    </p>
                    <p className="text-sm font-medium text-[#101828]">
                      <span className="text-emerald-700 font-semibold">Improved:</span> {b.improved}
                    </p>
                    <p className="text-xs text-[#64748B]">Why it works: {b.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {Array.isArray(activeAnalysis.summarySuggestions) && activeAnalysis.summarySuggestions.length > 0 && (
              <div className="pt-5 border-t border-slate-100">
                <h3 className="font-display text-sm font-bold text-[#101828]">
                  Professional Summary Suggestions
                </h3>
                <ul className="mt-3 space-y-2.5 text-sm text-[#172033]">
                  {activeAnalysis.summarySuggestions.map((s, idx) => (
                    <li key={idx} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(activeAnalysis.formattingRecommendations) && activeAnalysis.formattingRecommendations.length > 0 && (
              <div className="pt-5 border-t border-slate-100">
                <h3 className="font-display text-sm font-bold text-[#101828]">
                  Formatting & ATS Structure Checklist
                </h3>
                <ul className="mt-2.5 list-disc pl-5 space-y-1.5 text-sm text-[#64748B]">
                  {activeAnalysis.formattingRecommendations.map((f, idx) => (
                    <li key={idx}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
