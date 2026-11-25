import React, { useEffect, useState } from 'react';
import {
  Mail,
  Save,
  Copy,
  Check,
  Download,
  Trash2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import { aiApi } from '../services/aiApiClient';
import type { CoverLetterRecord, ResumeRecord } from '../types/career';

const TONES = [
  'Executive',
  'Warm & Collaborative',
  'Direct & Technical',
  'Concise Startup',
] as const;

export function CoverLettersView() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [letters, setLetters] = useState<CoverLetterRecord[]>([]);
  const [activeLetter, setActiveLetter] = useState<CoverLetterRecord | null>(null);
  const [editableText, setEditableText] = useState('');

  const [resumeId, setResumeId] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [tone, setTone] = useState<(typeof TONES)[number]>('Executive');
  const [jobDescription, setJobDescription] = useState('');

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetryGenerate, setCanRetryGenerate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<ResumeRecord[]>('/api/resumes'),
      apiRequest<CoverLetterRecord[]>('/api/cover-letters'),
    ])
      .then(([r, l]) => {
        const safeResumes = Array.isArray(r) ? r : [];
        const safeLetters = Array.isArray(l) ? l : [];
        setResumes(safeResumes);
        setLetters(safeLetters);
        if (safeResumes.length > 0) setResumeId(safeResumes[0].id);
        if (safeLetters.length > 0) {
          setActiveLetter(safeLetters[0]);
          setEditableText(safeLetters[0].content || '');
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load cover letters.');
      });
  }, []);

  const selectLetter = (doc: CoverLetterRecord) => {
    setActiveLetter(doc);
    setEditableText(doc.content);
    setNotice(null);
  };

  const runGenerate = async () => {
    if (!resumeId) {
      setError('Upload a resume in Resume Analyzer first so your cover letter reflects real achievements.');
      setCanRetryGenerate(false);
      return;
    }
    setError(null);
    setCanRetryGenerate(false);
    setNotice(null);
    setGenerating(true);
    try {
      const created = await aiApi.generateCoverLetter({
        resumeId,
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        tone,
        jobDescription: jobDescription.trim(),
      });
      setLetters((prev) => [created, ...prev]);
      selectLetter(created);
      setNotice(`Generated cover letter for ${created.jobTitle} at ${created.company}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cover letter generation failed.');
      setCanRetryGenerate(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    await runGenerate();
  };

  const handleSave = async () => {
    if (!activeLetter) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<CoverLetterRecord>(`/api/cover-letters/${activeLetter.id}`, {
        method: 'PUT',
        body: { content: editableText },
      });
      setLetters((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setActiveLetter(updated);
      setNotice('Cover letter edits saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save edits.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/cover-letters/${id}`, { method: 'DELETE' });
      setLetters((prev) => {
        const next = prev.filter((l) => l.id !== id);
        if (activeLetter?.id === id) {
          setActiveLetter(next[0] ?? null);
          setEditableText(next[0]?.content ?? '');
        }
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete cover letter.');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!activeLetter) return;
    const blob = new Blob([editableText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${activeLetter.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h1 className="font-display text-2xl font-bold text-[#101828]">Cover Letter Studio</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Draft tailored, authentic cover letters anchored strictly in your verified experience and
          role requirements.
        </p>

        {error && (
          <div className="mt-4 flex items-start justify-between gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
            {canRetryGenerate && resumeId && company.trim() && jobTitle.trim() && jobDescription.trim() && !generating && (
              <button
                type="button"
                onClick={runGenerate}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-900 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}
        {notice && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            {notice}
          </div>
        )}

        <form onSubmit={handleGenerate} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Resume</label>
              <select
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                disabled={resumes.length === 0}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                {resumes.length === 0 ? (
                  <option value="">Upload a resume first</option>
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
              <label className="block text-xs font-medium text-[#64748B] mb-1">Company</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Anthropic"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Job Title</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Product Engineer"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as (typeof TONES)[number])}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">
              Job Description
            </label>
            <textarea
              rows={4}
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description to align your accomplishments..."
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={generating || !resumeId}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Drafting cover letter...</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 text-[#6EE7B7]" />
                <span>Generate Cover Letter</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-display text-sm font-bold text-[#101828]">Saved Letters</h2>
          {letters.length === 0 ? (
            <p className="mt-3 text-xs text-[#64748B]">Your generated cover letters will appear here.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {letters.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => selectLetter(doc)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') selectLetter(doc);
                  }}
                  className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                    activeLetter?.id === doc.id
                      ? 'border-[#101828] bg-[#F8FAFC] font-semibold text-[#101828]'
                      : 'border-slate-200 hover:bg-slate-50 text-[#172033]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate">{doc.jobTitle}</p>
                    <p className="text-[#64748B] font-normal truncate">
                      {doc.company} · {doc.tone}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete cover letter"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6">
          {!activeLetter ? (
            <div className="py-16 text-center text-sm text-[#64748B]">
              Generate a cover letter above to edit, copy, or export it here.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#101828]">
                    {activeLetter.jobTitle} · {activeLetter.company}
                  </h2>
                  <p className="text-xs text-[#64748B]">Tone: {activeLetter.tone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#101828] rounded-lg cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#172033] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#172033] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export TXT</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={16}
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm leading-relaxed text-[#172033] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#101828]/20"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
