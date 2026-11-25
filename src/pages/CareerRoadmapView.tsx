import React, { useEffect, useState } from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import { aiApi } from '../services/aiApiClient';
import type {
  CareerRoadmapRecord,
  SkillProgressRecord,
  UserProfile,
} from '../types/career';

export function CareerRoadmapView() {
  const [roadmaps, setRoadmaps] = useState<CareerRoadmapRecord[]>([]);
  const [activeRoadmap, setActiveRoadmap] = useState<CareerRoadmapRecord | null>(null);
  const [skills, setSkills] = useState<SkillProgressRecord[]>([]);

  const [targetRole, setTargetRole] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [skillsCsv, setSkillsCsv] = useState('');
  const [learningPreference, setLearningPreference] = useState('Hands-on projects & structured study');
  const [timelineWeeks, setTimelineWeeks] = useState(12);

  // Skill add form
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Technical');
  const [newSkillProficiency, setNewSkillProficiency] = useState(40);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetryGenerate, setCanRetryGenerate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<UserProfile>('/api/profile'),
      aiApi.listRoadmaps(),
      apiRequest<SkillProgressRecord[]>('/api/skills'),
    ])
      .then(([p, r, s]) => {
        setTargetRole(p?.targetRole || '');
        setCareerGoal(p?.careerGoal || '');
        setEducation(p?.education || '');
        setExperience(p?.experienceSummary || '');
        setSkillsCsv((p?.skills || []).join(', '));
        const safeRoadmaps = Array.isArray(r) ? r : [];
        const safeSkills = Array.isArray(s) ? s : [];
        setRoadmaps(safeRoadmaps);
        setActiveRoadmap(safeRoadmaps[0] ?? null);
        setSkills(safeSkills);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load career roadmap data.');
      });
  }, []);

  const runGenerate = async () => {
    setError(null);
    setCanRetryGenerate(false);
    setNotice(null);
    setGenerating(true);
    try {
      const created = await aiApi.generateRoadmap({
        targetRole: targetRole.trim(),
        careerGoal: careerGoal.trim(),
        education: education.trim(),
        experience: experience.trim(),
        currentSkills: skillsCsv
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        learningPreference,
        timelineWeeks,
      });
      setRoadmaps((prev) => [created, ...prev]);
      setActiveRoadmap(created);
      setNotice(`Generated ${created.timelineWeeks}-week roadmap for ${created.targetRole}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate roadmap.');
      setCanRetryGenerate(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    await runGenerate();
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!activeRoadmap) return;
    const updatedMilestones = activeRoadmap.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    const optimistic = { ...activeRoadmap, milestones: updatedMilestones };
    setActiveRoadmap(optimistic);
    setRoadmaps((prev) => prev.map((r) => (r.id === optimistic.id ? optimistic : r)));

    try {
      await aiApi.updateRoadmapMilestones(activeRoadmap.id, updatedMilestones);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save milestone progress.');
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    setError(null);
    try {
      const saved = await apiRequest<SkillProgressRecord>('/api/skills', {
        method: 'POST',
        body: {
          skillName: newSkillName.trim(),
          category: newSkillCategory,
          proficiency: newSkillProficiency,
          targetProficiency: 85,
          status: newSkillProficiency >= 80 ? 'Proficient' : 'In Progress',
        },
      });
      setSkills((prev) => [saved, ...prev]);
      setNewSkillName('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add skill.');
    }
  };

  const handleUpdateSkill = async (skill: SkillProgressRecord, nextProficiency: number) => {
    const nextStatus = nextProficiency >= 80 ? 'Proficient' : nextProficiency <= 15 ? 'Planned' : 'In Progress';
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skill.id ? { ...s, proficiency: nextProficiency, status: nextStatus } : s
      )
    );
    try {
      await apiRequest('/api/skills', {
        method: 'POST',
        body: {
          id: skill.id,
          skillName: skill.skillName,
          category: skill.category,
          proficiency: nextProficiency,
          targetProficiency: skill.targetProficiency,
          status: nextStatus,
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update skill level.');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await apiRequest(`/api/skills/${id}`, { method: 'DELETE' });
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete skill.');
    }
  };

  const completedCount = activeRoadmap
    ? activeRoadmap.milestones.filter((m) => m.completed).length
    : 0;
  const totalCount = activeRoadmap ? activeRoadmap.milestones.length : 0;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h1 className="font-display text-2xl font-bold text-[#101828]">Career Roadmap Architect</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Translate your career goal into sequential milestones, portfolio projects, and measurable
          skill growth.
        </p>

        {error && (
          <div className="mt-4 flex items-start justify-between gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
            {canRetryGenerate && targetRole.trim() && careerGoal.trim() && !generating && (
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Target Role</label>
              <input
                type="text"
                required
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Machine Learning Engineer"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Timeline (Weeks)
              </label>
              <select
                value={timelineWeeks}
                onChange={(e) => setTimelineWeeks(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm"
              >
                <option value={8}>8 Weeks (Sprint)</option>
                <option value={12}>12 Weeks (Standard)</option>
                <option value={24}>24 Weeks (Deep Transition)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Learning Preference
              </label>
              <input
                type="text"
                value={learningPreference}
                onChange={(e) => setLearningPreference(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Career Goal
              </label>
              <input
                type="text"
                required
                value={careerGoal}
                onChange={(e) => setCareerGoal(e.target.value)}
                placeholder="e.g., Transition from analytics to production ML engineering within 3 months"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Current Skills (comma-separated)
              </label>
              <input
                type="text"
                value={skillsCsv}
                onChange={(e) => setSkillsCsv(e.target.value)}
                placeholder="Python, SQL, React, System Design..."
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Education Background
              </label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g., B.S. Computer Science"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Current Experience Summary
              </label>
              <input
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g., 2 years building internal BI tools and ETL pipelines"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] disabled:opacity-50 rounded-xl cursor-pointer"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Architecting roadmap...</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4 text-[#6EE7B7]" />
                <span>Generate AI Career Roadmap</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Main Roadmap & Skill Tracker Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-5">
          {!activeRoadmap ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-[#64748B]">
              Generate your first personalized roadmap above to view milestones and track completion.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <p className="text-xs text-[#64748B]">
                    {activeRoadmap.timelineWeeks}-Week Plan · {completedCount} of {totalCount}{' '}
                    milestones completed
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#101828]">
                    {activeRoadmap.targetRole}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="font-display text-2xl font-bold text-emerald-700 tabular-nums">
                    {completionPct}%
                  </span>
                  <div className="mt-1 w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#172033] leading-relaxed">{activeRoadmap.summary}</p>

              {(activeRoadmap.skillGaps ?? []).length > 0 && (
                <div className="text-xs text-[#64748B]">
                  <span className="font-semibold text-[#101828]">Priority Skill Gaps: </span>
                  {activeRoadmap.skillGaps.join(' · ')}
                </div>
              )}

              {(activeRoadmap.learningPriorities ?? []).length > 0 && (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <p className="text-xs font-semibold text-[#101828] mb-2">
                    Ranked Learning Priorities
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-xs text-[#64748B]">
                    {activeRoadmap.learningPriorities.map((lp, idx) => (
                      <li key={idx}>{lp}</li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="space-y-4">
                {activeRoadmap.milestones.map((m) => (
                  <div
                    key={m.id}
                    className={`p-5 rounded-xl border transition-colors ${
                      m.completed
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-[#F8FAFC] border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => handleToggleMilestone(m.id)}
                        className="flex items-start gap-3 text-left cursor-pointer"
                      >
                        {m.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-xs font-mono text-[#64748B]">
                            {m.phase} · {m.duration}
                          </p>
                          <h3
                            className={`mt-0.5 font-display text-base font-bold ${
                              m.completed ? 'line-through text-[#64748B]' : 'text-[#101828]'
                            }`}
                          >
                            {m.title}
                          </h3>
                        </div>
                      </button>
                    </div>

                    <p className="mt-2.5 pl-8 text-sm text-[#64748B] leading-relaxed">
                      {m.description}
                    </p>

                    <div className="mt-4 pl-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-[#101828] mb-1">Learning Topics</p>
                        <ul className="list-disc pl-4 space-y-1 text-[#64748B]">
                          {m.topics.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-[#101828] mb-1">Recommended Projects</p>
                        <ul className="list-disc pl-4 space-y-1 text-[#64748B]">
                          {m.projects.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-[#101828] mb-1">Actionable Activities</p>
                        <ul className="list-disc pl-4 space-y-1 text-[#64748B]">
                          {m.activities.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {roadmaps.length > 1 && (
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#64748B]">Saved roadmaps:</span>
                  {roadmaps.map((rm) => (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() => setActiveRoadmap(rm)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                        activeRoadmap.id === rm.id
                          ? 'bg-[#101828] text-white border-[#101828]'
                          : 'bg-white text-[#64748B] border-slate-200'
                      }`}
                    >
                      {rm.targetRole}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Skills Progress Tracker */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-[#101828]">Skills Tracker</h2>
            <p className="text-xs text-[#64748B]">Adjust proficiency as you complete milestones</p>
          </div>

          <form onSubmit={handleAddSkill} className="space-y-2.5 p-4 rounded-xl bg-[#F8FAFC] border border-slate-200">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Add skill (e.g., System Design)"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <div className="flex items-center gap-2">
              <select
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="Technical">Technical</option>
                <option value="Leadership">Leadership</option>
                <option value="Domain">Domain</option>
                <option value="Tools">Tools</option>
              </select>
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#101828] rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>Starting proficiency</span>
              <span className="font-mono tabular-nums">{newSkillProficiency}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={newSkillProficiency}
              onChange={(e) => setNewSkillProficiency(Number(e.target.value))}
              className="w-full accent-[#101828]"
            />
          </form>

          <div className="space-y-4">
            {skills.length === 0 ? (
              <p className="text-xs text-[#64748B]">No tracked skills yet.</p>
            ) : (
              skills.map((skill) => (
                <div key={skill.id} className="pb-3.5 border-b border-slate-100 last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#101828]">{skill.skillName}</p>
                      <p className="text-xs text-[#64748B]">
                        {skill.category} · {skill.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#101828] tabular-nums">
                        {skill.proficiency}%
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${skill.skillName}`}
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={skill.proficiency}
                    onChange={(e) => handleUpdateSkill(skill, Number(e.target.value))}
                    className="mt-2 w-full accent-[#101828]"
                  />
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
