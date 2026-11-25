import React, { useEffect, useState } from 'react';
import {
  MessageSquareText,
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import { aiApi } from '../services/aiApiClient';
import type {
  InterviewMessageRecord,
  InterviewSessionRecord,
  ResumeRecord,
} from '../types/career';

const CATEGORIES = ['Mixed', 'Behavioral', 'Technical', 'HR & Culture', 'System Design / Case'] as const;
const DIFFICULTIES = ['Entry-Level', 'Mid-Level', 'Senior', 'Staff / Leadership'] as const;

export function InterviewCoachView() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [sessions, setSessions] = useState<InterviewSessionRecord[]>([]);
  const [activeSession, setActiveSession] = useState<InterviewSessionRecord | null>(null);
  const [messages, setMessages] = useState<InterviewMessageRecord[]>([]);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [answerDraft, setAnswerDraft] = useState('');
  const [showSample, setShowSample] = useState(false);

  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Mixed');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('Mid-Level');
  const [resumeId, setResumeId] = useState('');

  const [creating, setCreating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<'start' | 'evaluate' | null>(null);

  const loadSessionDetail = async (id: string) => {
    setError(null);
    try {
      const detail = await apiRequest<{
        session?: InterviewSessionRecord;
        messages?: InterviewMessageRecord[];
      }>(`/api/interviews/${id}`);
      const nextMessages = Array.isArray(detail?.messages) ? detail.messages : [];
      if (detail?.session) {
        setActiveSession(detail.session);
      }
      setMessages(nextMessages);
      setSelectedQuestionIdx(0);
      setAnswerDraft(nextMessages[0]?.userAnswer || '');
      setShowSample(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load interview session.');
    }
  };

  useEffect(() => {
    Promise.all([
      apiRequest<ResumeRecord[]>('/api/resumes'),
      apiRequest<InterviewSessionRecord[]>('/api/interviews'),
    ])
      .then(([r, s]) => {
        const safeResumes = Array.isArray(r) ? r : [];
        const safeSessions = Array.isArray(s) ? s : [];
        setResumes(safeResumes);
        setSessions(safeSessions);
        if (safeResumes.length > 0) setResumeId(safeResumes[0].id);
        if (safeSessions.length > 0) {
          loadSessionDetail(safeSessions[0].id);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load interview coach.');
      });
  }, []);

  const runStartSession = async () => {
    setError(null);
    setLastFailedAction(null);
    setCreating(true);
    try {
      const created = await aiApi.startInterviewSession({
        jobTitle: jobTitle.trim(),
        company: company.trim() || undefined,
        category,
        difficulty,
        resumeId: resumeId || undefined,
      });
      if (!created?.session) {
        throw new Error('Could not initialize interview session. Please try again.');
      }
      const nextMessages = Array.isArray(created.messages) ? created.messages : [];
      setSessions((prev) => [created.session!, ...(Array.isArray(prev) ? prev : [])]);
      setActiveSession(created.session);
      setMessages(nextMessages);
      setSelectedQuestionIdx(0);
      setAnswerDraft('');
      setShowSample(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start interview session.');
      setLastFailedAction('start');
    } finally {
      setCreating(false);
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await runStartSession();
  };

  const safeMessages = Array.isArray(messages) ? messages : [];
  const currentQuestion = safeMessages[selectedQuestionIdx] ?? null;

  const handleSelectQuestion = (idx: number) => {
    setSelectedQuestionIdx(idx);
    setAnswerDraft(safeMessages[idx]?.userAnswer || '');
    setShowSample(false);
  };

  const runEvaluateAnswer = async () => {
    if (!activeSession || !currentQuestion) return;
    if (answerDraft.trim().length < 15) {
      setError('Write a complete response (at least 15 characters) before requesting STAR evaluation.');
      setLastFailedAction(null);
      return;
    }
    setError(null);
    setLastFailedAction(null);
    setEvaluating(true);
    try {
      const result = await aiApi.evaluateInterviewAnswer(
        activeSession.id,
        currentQuestion.id,
        answerDraft.trim()
      );

      if (result?.message) {
        setMessages((prev) =>
          (Array.isArray(prev) ? prev : []).map((m) =>
            m.id === result.message.id ? result.message : m
          )
        );
      }
      setActiveSession((prev) =>
        prev ? { ...prev, averageScore: result?.averageScore ?? prev.averageScore } : prev
      );
      setSessions((prev) =>
        (Array.isArray(prev) ? prev : []).map((s) =>
          s.id === activeSession.id
            ? { ...s, averageScore: result?.averageScore ?? s.averageScore }
            : s
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Answer evaluation failed.');
      setLastFailedAction('evaluate');
    } finally {
      setEvaluating(false);
    }
  };

  const handleEvaluateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    await runEvaluateAnswer();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#101828]">AI Interview Coach</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Written interview simulations with role-specific questions, structured STAR evaluation,
              and model answer coaching.
            </p>
          </div>
          <span className="text-xs text-[#64748B]">Interactive text-based simulation</span>
        </div>

        {error && (
          <div className="mt-4 flex items-start justify-between gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
            {lastFailedAction && !creating && !evaluating && (
              <button
                type="button"
                onClick={() => (lastFailedAction === 'start' ? runStartSession() : runEvaluateAnswer())}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-900 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleStartSession} className="mt-6 grid grid-cols-1 md:grid-cols-6 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Target Role</label>
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Data Engineer"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Company (optional)</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Databricks"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Resume Context</label>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Role-based only</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Interview Focus</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as (typeof DIFFICULTIES)[number])}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <MessageSquareText className="w-4 h-4 text-[#6EE7B7]" />
                  <span>Start Session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Interactive Practice Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Session History */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-display text-sm font-bold text-[#101828]">Interview History</h2>
          {sessions.length === 0 ? (
            <p className="mt-3 text-xs text-[#64748B]">
              Start a session above to generate 5 targeted interview questions.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadSessionDetail(s.id)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                    activeSession?.id === s.id
                      ? 'border-[#101828] bg-[#F8FAFC] text-[#101828]'
                      : 'border-slate-200 hover:bg-slate-50 text-[#172033]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{s.jobTitle}</span>
                    <span className="font-mono font-bold tabular-nums text-emerald-700 shrink-0">
                      {s.averageScore !== null ? `${s.averageScore}/100` : 'Open'}
                    </span>
                  </div>
                  <p className="mt-1 text-[#64748B] truncate">
                    {s.category} · {s.difficulty}
                    {s.company ? ` · ${s.company}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Active Question + STAR Evaluation */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          {!activeSession || !currentQuestion ? (
            <div className="py-16 text-center text-sm text-[#64748B]">
              Select a past session or create a new interview simulation to begin practicing.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-xs text-[#64748B]">
                    {activeSession.category} · {activeSession.difficulty}
                  </p>
                  <h2 className="font-display text-lg font-bold text-[#101828]">
                    {activeSession.jobTitle}
                    {activeSession.company ? ` at ${activeSession.company}` : ''}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  {safeMessages.map((m, idx) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectQuestion(idx)}
                      className={`w-9 h-9 rounded-lg font-mono text-xs font-semibold transition-colors cursor-pointer ${
                        idx === selectedQuestionIdx
                          ? 'bg-[#101828] text-white'
                          : m.score !== null
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-[#64748B] hover:text-[#101828]'
                      }`}
                    >
                      Q{m.questionNumber}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[#64748B]">
                  Question {currentQuestion.questionNumber} of {safeMessages.length} ·{' '}
                  {currentQuestion.questionType}
                </p>
                <h3 className="mt-2 font-display text-xl font-bold text-[#101828] leading-snug">
                  {currentQuestion.question}
                </h3>
              </div>

              <form onSubmit={handleEvaluateAnswer} className="space-y-3">
                <label className="block text-xs font-medium text-[#64748B]">
                  Your Answer (Tip: structure with Situation, Task, Action, and measurable Result)
                </label>
                <textarea
                  rows={6}
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  placeholder="Write your response as you would speak it in the interview..."
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] focus:bg-white p-4 text-sm leading-relaxed text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#101828]/20"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSample((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#101828] cursor-pointer"
                  >
                    {showSample ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showSample ? 'Hide sample answer' : 'View sample STAR answer'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={evaluating}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] disabled:opacity-50 rounded-xl cursor-pointer"
                  >
                    {evaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Evaluating answer...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-[#6EE7B7]" />
                        <span>Evaluate with STAR Rubric</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {showSample && currentQuestion.sampleAnswer && (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <p className="text-xs font-semibold text-[#101828]">Model Answer Reference</p>
                  <p className="mt-1.5 text-sm text-[#172033] leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.sampleAnswer}
                  </p>
                </div>
              )}

              {/* Evaluation Feedback */}
              {currentQuestion.score !== null && (
                <div className="pt-5 border-t border-slate-200 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#64748B]">Evaluation Score</p>
                      <p className="font-display text-3xl font-bold text-[#101828] tabular-nums">
                        {currentQuestion.score} <span className="text-sm font-normal text-[#64748B]">/ 100</span>
                      </p>
                    </div>
                  </div>

                  {currentQuestion.starFeedback && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {(
                        [
                          ['Situation', currentQuestion.starFeedback.situation],
                          ['Task', currentQuestion.starFeedback.task],
                          ['Action', currentQuestion.starFeedback.action],
                          ['Result', currentQuestion.starFeedback.result],
                        ] as const
                      ).map(([label, text]) => (
                        <div key={label} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200">
                          <p className="text-xs font-bold text-[#101828]">{label}</p>
                          <p className="mt-1 text-xs text-[#64748B] leading-relaxed">{text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <p className="text-xs font-bold text-[#101828] mb-2">What landed well</p>
                      <ul className="space-y-2 text-xs text-[#172033]">
                        {(currentQuestion.strengths ?? []).map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#101828] mb-2">How to elevate next time</p>
                      <ul className="space-y-2 text-xs text-[#172033]">
                        {(currentQuestion.improvements ?? []).map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
