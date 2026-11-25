import React, { useEffect, useState } from 'react';
import {
  FileEdit,
  Download,
  Copy,
  Check,
  Save,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import { aiApi } from '../services/aiApiClient';
import type { ResumeRecord, TailoredResumeRecord } from '../types/career';

export function ResumeTailorView() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [tailoredList, setTailoredList] = useState<TailoredResumeRecord[]>([]);
  const [activeDoc, setActiveDoc] = useState<TailoredResumeRecord | null>(null);

  const [resumeId, setResumeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const [editableSummary, setEditableSummary] = useState('');
  const [editableContent, setEditableContent] = useState('');

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetryTailor, setCanRetryTailor] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<ResumeRecord[]>('/api/resumes'),
      apiRequest<TailoredResumeRecord[]>('/api/tailored-resumes'),
    ])
      .then(([r, t]) => {
        const safeResumes = Array.isArray(r) ? r : [];
        const safeTailored = Array.isArray(t) ? t : [];
        setResumes(safeResumes);
        setTailoredList(safeTailored);
        if (safeResumes.length > 0) setResumeId(safeResumes[0].id);
        if (safeTailored.length > 0) {
          setActiveDoc(safeTailored[0]);
          setEditableSummary(safeTailored[0].tailoredSummary || '');
          setEditableContent(safeTailored[0].tailoredContent || '');
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load resumes.');
      });
  }, []);

  const selectDoc = (doc: TailoredResumeRecord) => {
    setActiveDoc(doc);
    setEditableSummary(doc.tailoredSummary);
    setEditableContent(doc.tailoredContent);
    setNotice(null);
  };

  const runTailor = async () => {
    if (!resumeId) {
      setError('Upload a resume in Resume Analyzer first.');
      setCanRetryTailor(false);
      return;
    }
    setError(null);
    setCanRetryTailor(false);
    setNotice(null);
    setGenerating(true);
    try {
      const created = await aiApi.tailorResume({
        resumeId,
        jobTitle: jobTitle.trim(),
        company: company.trim() || undefined,
        jobDescription: jobDescription.trim(),
      });
      setTailoredList((prev) => [created, ...prev]);
      selectDoc(created);
      setNotice('Generated factually faithful tailored resume. Review and refine below.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Tailoring failed.');
      setCanRetryTailor(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleTailor = async (e: React.FormEvent) => {
    e.preventDefault();
    await runTailor();
  };

  const handleSaveEdits = async () => {
    if (!activeDoc) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<TailoredResumeRecord>(`/api/tailored-resumes/${activeDoc.id}`, {
        method: 'PUT',
        body: {
          tailoredSummary: editableSummary,
          tailoredContent: editableContent,
        },
      });
      setTailoredList((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setActiveDoc(updated);
      setNotice('Saved your edits.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save edits.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editableContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!activeDoc) return;
    const blob = new Blob([editableContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tailored-${activeDoc.jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#101828]">AI Resume Tailor</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Align your summary, bullet phrasing, and keywords to a specific posting while strictly
              preserving factual accuracy.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero-fabrication safeguard active</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start justify-between gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
            {canRetryTailor && resumeId && jobTitle.trim() && jobDescription.trim() && !generating && (
              <button
                type="button"
                onClick={runTailor}
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

        <form onSubmit={handleTailor} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Base Resume</label>
              <select
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                disabled={resumes.length === 0}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
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
              <label className="block text-xs font-medium text-[#64748B] mb-1">Target Role</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Product Designer"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Figma"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">
              Target Job Description
            </label>
            <textarea
              rows={4}
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description..."
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
                <span>Tailoring your resume...</span>
              </>
            ) : (
              <>
                <FileEdit className="w-4 h-4 text-[#6EE7B7]" />
                <span>Generate Tailored Resume</span>
              </>
            )}
          </button>
        </form>
      </div>

      {activeDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Editable Tailored Resume */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#101828]">
                  {activeDoc.jobTitle}
                  {activeDoc.company ? ` · ${activeDoc.company}` : ''}
                </h2>
                <p className="text-xs text-[#64748B]">
                  Review every line carefully and edit directly before exporting.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdits}
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

            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Tailored Professional Summary
              </label>
              <textarea
                rows={3}
                value={editableSummary}
                onChange={(e) => setEditableSummary(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 text-sm text-[#172033]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Full Tailored Resume Content
              </label>
              <textarea
                rows={16}
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-[#172033]"
              />
            </div>
          </div>

          {/* Transparent Change Log + Keywords + Saved Drafts */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-display text-sm font-bold text-[#101828]">
                Aligned Keywords
              </h3>
              <p className="mt-2 text-xs text-[#172033] leading-relaxed">
                {(Array.isArray(activeDoc.optimizedKeywords) ? activeDoc.optimizedKeywords : []).join(' · ') || '—'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#101828]">
                Transparent Bullet Changes
              </h3>
              {(Array.isArray(activeDoc.bulletRewrites) ? activeDoc.bulletRewrites : []).map((b, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-1.5 text-xs">
                  <p className="text-[#64748B] line-through">{b.original}</p>
                  <p className="text-[#101828] font-medium">{b.improved}</p>
                  <p className="text-[#64748B]">{b.reason}</p>
                </div>
              ))}
            </div>

            {tailoredList.length > 1 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-display text-sm font-bold text-[#101828] mb-2">
                  Previous Tailored Drafts
                </h3>
                <div className="space-y-1.5">
                  {tailoredList.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => selectDoc(doc)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs cursor-pointer ${
                        activeDoc.id === doc.id
                          ? 'bg-[#101828] text-white font-semibold'
                          : 'hover:bg-slate-100 text-[#172033]'
                      }`}
                    >
                      {doc.jobTitle} {doc.company ? `· ${doc.company}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
