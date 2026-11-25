import React, { useEffect, useState } from 'react';
import {
  Save,
  LogOut,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import type { ResumeRecord, UserProfile } from '../types/career';

export function SettingsView() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);

  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [education, setEducation] = useState('');
  const [experienceSummary, setExperienceSummary] = useState('');
  const [skillsCsv, setSkillsCsv] = useState('');
  const [rolesCsv, setRolesCsv] = useState('');
  const [locationsCsv, setLocationsCsv] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<UserProfile>('/api/profile'),
      apiRequest<ResumeRecord[]>('/api/resumes'),
    ])
      .then(([p, r]) => {
        setProfile(p);
        setResumes(Array.isArray(r) ? r : []);
        setFullName(p?.fullName || '');
        setHeadline(p?.headline || '');
        setCurrentRole(p?.currentRole || '');
        setTargetRole(p?.targetRole || '');
        setCareerGoal(p?.careerGoal || '');
        setYearsExperience(p?.yearsExperience || 0);
        setEducation(p?.education || '');
        setExperienceSummary(p?.experienceSummary || '');
        setSkillsCsv((Array.isArray(p?.skills) ? p.skills : []).join(', '));
        setRolesCsv((Array.isArray(p?.preferredRoles) ? p.preferredRoles : []).join(', '));
        setLocationsCsv((Array.isArray(p?.preferredLocations) ? p.preferredLocations : []).join(', '));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load settings.');
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiRequest<UserProfile>('/api/profile', {
        method: 'PUT',
        body: {
          fullName: fullName.trim(),
          headline: headline.trim(),
          currentRole: currentRole.trim(),
          targetRole: targetRole.trim(),
          careerGoal: careerGoal.trim(),
          yearsExperience: Number(yearsExperience) || 0,
          education: education.trim(),
          experienceSummary: experienceSummary.trim(),
          skills: skillsCsv.split(',').map((s) => s.trim()).filter(Boolean),
          preferredRoles: rolesCsv.split(',').map((s) => s.trim()).filter(Boolean),
          preferredLocations: locationsCsv.split(',').map((s) => s.trim()).filter(Boolean),
        },
      });
      setProfile(updated);
      setNotice('Your career profile has been updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResume = async (id: string) => {
    try {
      await apiRequest(`/api/resumes/${id}`, { method: 'DELETE' });
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete resume.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h1 className="font-display text-2xl font-bold text-[#101828]">Profile & Settings</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Keep your career goals, background, and target preferences current so every AI tool
          provides sharper guidance.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Professional Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g., Full-Stack Engineer focused on developer platforms"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Current Role</label>
              <input
                type="text"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="e.g., Software Engineer"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Target Role</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Staff Frontend Engineer"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                min={0}
                max={60}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Career Goal</label>
            <textarea
              rows={2}
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="Describe what you want to achieve in your next move..."
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Education</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g., B.S. Computer Science, University of Washington"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Core Skills (comma-separated)
              </label>
              <input
                type="text"
                value={skillsCsv}
                onChange={(e) => setSkillsCsv(e.target.value)}
                placeholder="TypeScript, React, PostgreSQL, AWS"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Preferred Roles (comma-separated)
              </label>
              <input
                type="text"
                value={rolesCsv}
                onChange={(e) => setRolesCsv(e.target.value)}
                placeholder="Frontend Architect, Staff Engineer"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">
                Preferred Locations (comma-separated)
              </label>
              <input
                type="text"
                value={locationsCsv}
                onChange={(e) => setLocationsCsv(e.target.value)}
                placeholder="Remote, San Francisco, London"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">
              Experience Summary
            </label>
            <textarea
              rows={3}
              value={experienceSummary}
              onChange={(e) => setExperienceSummary(e.target.value)}
              placeholder="Summarize your domain background and recent leadership or technical scope..."
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] disabled:opacity-50 rounded-xl cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#6EE7B7]" />
            <span>{saving ? 'Saving changes...' : 'Save Career Profile'}</span>
          </button>
        </form>
      </div>

      {/* Resume Management */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-display text-base font-bold text-[#101828]">Stored Resumes</h2>
        <p className="text-xs text-[#64748B] mt-0.5">
          Documents are private to your authenticated account.
        </p>
        {resumes.length === 0 ? (
          <p className="mt-4 text-xs text-[#64748B]">No resumes uploaded yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {resumes.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-[#64748B] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#101828] truncate">{r.title}</p>
                    <p className="text-xs text-[#64748B] truncate">
                      {r.fileName} · {Math.max(1, Math.round(r.fileSize / 1024))} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteResume(r.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                  aria-label={`Delete ${r.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account & Session */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-[#101828]">Account & Session</h2>
          <p className="mt-1 text-xs text-[#64748B]">
            Signed in via Google as <span className="font-semibold text-[#172033]">{user?.email || profile?.email}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
