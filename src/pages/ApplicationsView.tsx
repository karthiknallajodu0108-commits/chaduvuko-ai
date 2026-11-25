import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  Pencil,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';
import type { ApplicationRecord, ApplicationStatus } from '../types/career';

const STATUSES: ApplicationStatus[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
];

const STATUS_TEXT_COLOR: Record<ApplicationStatus, string> = {
  Interested: 'text-slate-600',
  Applied: 'text-blue-700',
  Interview: 'text-violet-700',
  Offer: 'text-emerald-700',
  Rejected: 'text-rose-700',
  Withdrawn: 'text-slate-500',
};

export function ApplicationsView() {
  const [items, setItems] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit form state
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobLink, setJobLink] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [appliedDate, setAppliedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [nextAction, setNextAction] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<ApplicationRecord[]>('/api/applications')
      .then((rows) => setItems(Array.isArray(rows) ? rows : []))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load applications.');
      })
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setCompany('');
    setJobTitle('');
    setJobLink('');
    setLocation('');
    setStatus('Applied');
    setAppliedDate(new Date().toISOString().slice(0, 10));
    setNextAction('');
    setFollowUpDate('');
    setNotes('');
  };

  const openCreateForm = () => {
    if (showForm && !editingId) {
      setShowForm(false);
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (app: ApplicationRecord) => {
    setError(null);
    setEditingId(app.id);
    setCompany(app.company || '');
    setJobTitle(app.jobTitle || '');
    setJobLink(app.jobLink || '');
    setLocation(app.location || '');
    setStatus(app.status || 'Applied');
    setAppliedDate(app.appliedDate || '');
    setNextAction(app.nextAction || '');
    setFollowUpDate(app.followUpDate || '');
    setNotes(app.notes || '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = {
      company: company.trim(),
      jobTitle: jobTitle.trim(),
      jobLink: jobLink.trim(),
      location: location.trim(),
      status,
      appliedDate,
      nextAction: nextAction.trim(),
      followUpDate,
      notes: notes.trim(),
    };
    try {
      if (editingId) {
        const updated = await apiRequest<ApplicationRecord>(`/api/applications/${editingId}`, {
          method: 'PUT',
          body: payload,
        });
        setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const created = await apiRequest<ApplicationRecord>('/api/applications', {
          method: 'POST',
          body: payload,
        });
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: ApplicationStatus) => {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a)));
    try {
      await apiRequest(`/api/applications/${id}`, {
        method: 'PUT',
        body: { status: nextStatus },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/applications/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete application.');
    }
  };

  const filtered = items.filter((item) => {
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.company.toLowerCase().includes(q) ||
      item.jobTitle.toLowerCase().includes(q) ||
      item.notes.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#101828]">Application Tracker</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Keep every role, stage, interview note, and follow-up date organized in one pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#101828] hover:bg-[#142033] rounded-xl transition-colors cursor-pointer shrink-0"
          >
            {showForm && !editingId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 text-[#6EE7B7]" />}
            <span>{showForm && !editingId ? 'Close form' : 'Add Application'}</span>
          </button>
        </div>

        {/* Pipeline Summary Row */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5 border-t border-slate-100">
          {STATUSES.map((st) => {
            const count = items.filter((i) => i.status === st).length;
            return (
              <div key={st} className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <p className="text-xs text-[#64748B]">{st}</p>
                <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${STATUS_TEXT_COLOR[st]}`}>
                  {count}
                </p>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mt-6 p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#101828]">
                {editingId ? 'Edit Application' : 'New Application'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="text-xs font-medium text-[#64748B] hover:text-[#101828] cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Company</label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g., Linear"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., Senior Full-Stack Engineer"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Job Link (https://...)</label>
                <input
                  type="url"
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Remote / NYC"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Application Date</label>
                <input
                  type="date"
                  value={appliedDate}
                  onChange={(e) => setAppliedDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Follow-up Reminder</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Next Action</label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="e.g., Send hiring manager follow-up note"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Referral contact, compensation band, or interview insights"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#101828] hover:bg-[#142033] disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {submitting ? 'Saving...' : editingId ? 'Update Application' : 'Save Application'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#101828] bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Filter Bar + Applications List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, role, or notes..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#101828]/20"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {(['All', ...STATUSES] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-[#101828] shadow-xs'
                    : 'text-[#64748B] hover:text-[#101828]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl">
            <p className="text-sm font-medium text-[#172033]">No applications match your filter</p>
            <p className="mt-1 text-xs text-[#64748B]">
              Click "Add Application" above to start tracking your roles and follow-up dates.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((app) => (
              <div
                key={app.id}
                className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-display text-base font-bold text-[#101828]">
                      {app.jobTitle}
                    </h3>
                    <span className="text-sm text-[#64748B]">· {app.company}</span>
                    {app.jobLink && (
                      <a
                        href={app.jobLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#101828] hover:underline"
                      >
                        <span>Posting</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                    {app.location && <span>{app.location}</span>}
                    {app.appliedDate && <span className="font-mono tabular-nums">Applied {app.appliedDate}</span>}
                    {app.followUpDate && (
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-amber-700">
                        <Calendar className="w-3 h-3" />
                        Follow up {app.followUpDate}
                      </span>
                    )}
                    {app.nextAction && <span>Next: {app.nextAction}</span>}
                  </div>
                  {app.notes && (
                    <p className="mt-1.5 text-xs text-[#64748B] max-w-3xl">{app.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    aria-label={`Status for ${app.jobTitle}`}
                    value={app.status}
                    onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                    className={`rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold ${STATUS_TEXT_COLOR[app.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Edit ${app.jobTitle}`}
                    onClick={() => openEditForm(app)}
                    className="p-2 text-slate-400 hover:text-[#101828] rounded-lg cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${app.jobTitle}`}
                    onClick={() => handleDelete(app.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
