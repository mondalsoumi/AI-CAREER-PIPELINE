import AppHeader from '../components/AppHeader';
import { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import NotificationToast from "../components/NotificationToast";
import Confetti from "react-confetti";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const STAGES = [
  { id: 'SAVED', label: 'Saved', color: '#B08968' },
  { id: 'APPLIED', label: 'Applied', color: '#1F4D3A' },
  { id: 'ONLINE_ASSESSMENT', label: 'Assessment', color: '#52796F' },
  { id: 'TECHNICAL_INTERVIEW', label: 'Technical', color: '#354F52' },
  { id: 'MANAGER_ROUND', label: 'Manager', color: '#6C757D' },
  { id: 'HR_ROUND', label: 'HR', color: '#84A98C' },
  { id: 'OFFER', label: 'Offer', color: '#2D6A4F' },
  { id: 'REJECTED', label: 'Rejected', color: '#C44536' },
  { id: 'WITHDRAWN', label: 'Withdrawn', color: '#8D99AE' },
];

const STAGE_IDS = STAGES.map((s) => s.id);

const SOURCE_PLATFORMS = [
  'LinkedIn', 'Naukri', 'Wellfound', 'Indeed', 'Glassdoor',
  'Instahyre', 'Company Website', 'Referral', 'Manual', 'Other',
];

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function groupByStage(apps) {
  const grouped = {};
  STAGE_IDS.forEach((id) => (grouped[id] = []));
  apps.forEach((app) => {
    const key = app.stage || 'SAVED';
    if (grouped[key]) grouped[key].push(app);
  });
  return grouped;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm font-medium shadow-sm ${t.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-800'}`}>
          {t.type === 'error' ? (
            <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, push };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-md p-3 mb-2 animate-pulse">
      <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
      <div className="h-2.5 bg-gray-100 rounded w-1/2 mb-2" />
      <div className="h-2 bg-gray-100 rounded w-1/3" />
    </div>
  );
}

// ─── App Card ─────────────────────────────────────────────────────────────────
function AppCard({ app, index, stageColor, onSelect }) {
  const date = formatDate(app.createdAt);
  return (
    <Draggable draggableId={app.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card mb-2 transition-shadow cursor-pointer hover:shadow-md ${snapshot.isDragging ? 'shadow-md rotate-1 border-gray-300' : ''}`}
          style={{ ...provided.draggableProps.style, borderLeft: `2px solid ${stageColor}` }}
          onClick={() => { if (!snapshot.isDragging) onSelect(app); }}
        >
          <p className="text-base font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
            {app.company}
          </p>
          <p className="text-sm truncate mt-1 leading-tight" style={{ color: 'var(--text-secondary)' }}>
            {app.jobTitle}
          </p>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            {app.sourcePlatform && (
              <span className="text-[10px] font-medium uppercase tracking-wide truncate text-gray-400">
                {app.sourcePlatform}
              </span>
            )}
            {date && <span className="text-[10px] text-gray-300 flex-shrink-0 ml-2">{date}</span>}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────
function Column({ stage, apps, loading, onSelect }) {
  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="bg-white border border-gray-200 rounded-t-md px-3 pt-3 pb-0" style={{ borderTop: `2px solid ${stage.color}` }}>
        <div className="flex items-center justify-between pb-2.5">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{stage.label}</span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full min-w-[28px] text-center" style={{ backgroundColor: `${stage.color}18`, color: stage.color }}>
            {loading ? '…' : apps.length}
          </span>
        </div>
      </div>
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-24 p-2 border-x border-b border-gray-200 rounded-b-md transition-colors duration-150 ${snapshot.isDraggingOver ? 'bg-gray-50' : 'bg-gray-50/50'}`}
          >
            {loading ? (
              <><SkeletonCard /><SkeletonCard /></>
            ) : apps.length === 0 ? (
              <div className={`flex items-center justify-center h-16 rounded border border-dashed border-gray-200 text-[10px] text-gray-300 transition-colors ${snapshot.isDraggingOver ? 'border-gray-300 text-gray-400' : ''}`}>
                Drop here
              </div>
            ) : (
              apps.map((app, i) => (
                <AppCard key={app.id} app={app} index={i} stageColor={stage.color} onSelect={onSelect} />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ apps }) {
  const stats = [
    { label: 'Total', value: apps.length },
    { label: 'In progress', value: apps.filter((a) => ['ONLINE_ASSESSMENT', 'TECHNICAL_INTERVIEW', 'MANAGER_ROUND', 'HR_ROUND'].includes(a.stage)).length },
    { label: 'Offers', value: apps.filter((a) => a.stage === 'OFFER').length },
    { label: 'Rejections', value: apps.filter((a) => a.stage === 'REJECTED').length },
  ]
  return (
    <div className="flex items-center gap-6">
      {stats.map((s) => (
        <div key={s.label} className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-white">{s.value}</span>
          <span className="text-xs text-white/60 uppercase tracking-wide">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
const EMPTY_FORM = { company: '', jobTitle: '', sourcePlatform: '', location: '', jobUrl: '', salaryRange: '', notes: '' };

function AddModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const firstRef = useRef(null);

  // ── Resume section state ─────────────────────────────────────────────────
  const [resumes, setResumes] = useState([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [resumeMode, setResumeMode] = useState('existing'); // 'existing' | 'new' | 'none'
  const [resumeId, setResumeId] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [newResumeVersionName, setNewResumeVersionName] = useState('');

  useEffect(() => {
    firstRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // ── Load existing resumes for the dropdown ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/resumes`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        const list = data.data ?? [];
        setResumes(list);
        // If user has no resumes at all, skip straight to "none" mode
        if (list.length === 0) setResumeMode('new');
      })
      .catch(() => { /* silent — resume section is optional, don't block the form */ })
      .finally(() => setResumesLoading(false));
  }, []);

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.company.trim()) errs.company = 'Required';
    if (!form.jobTitle.trim()) errs.jobTitle = 'Required';
    if (!form.sourcePlatform.trim()) errs.sourcePlatform = 'Required';

    // ── Resume section validation ────────────────────────────────────────
    if (resumeMode === 'existing' && !resumeId) {
      errs.resume = 'Select a resume version';
    }
    if (resumeMode === 'new') {
      if (!resumeFile) errs.resume = 'Choose a PDF file';
      else if (!newResumeVersionName.trim()) errs.resume = 'Version name is required';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setSubmitting(true);
    setServerError('');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      formData.append('company', form.company.trim());
      formData.append('jobTitle', form.jobTitle.trim());
      formData.append('sourcePlatform', form.sourcePlatform.trim());
      if (form.location.trim()) formData.append('location', form.location.trim());
      if (form.jobUrl.trim()) formData.append('jobUrl', form.jobUrl.trim());
      if (form.salaryRange.trim()) formData.append('salaryRange', form.salaryRange.trim());
      if (form.notes.trim()) formData.append('notes', form.notes.trim());

      // ── Resume section — mutually exclusive ────────────────────────────
      if (resumeMode === 'existing' && resumeId) {
        formData.append('resumeId', resumeId);
      } else if (resumeMode === 'new' && resumeFile) {
        formData.append('resume', resumeFile);
        formData.append('newResumeVersionName', newResumeVersionName.trim());
      }
      // resumeMode === 'none' → append nothing, matches backend's optional fields

      const res = await fetch(`${API_BASE}/api/applications`, {
        method: 'POST',
        // CRITICAL: no Content-Type header — browser sets it with multipart boundary
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) { setServerError(data.error || 'Failed to create application.'); return; }
      onCreated(data.data ?? data);
      onClose();
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[1px]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white border border-gray-200 rounded-2xl shadow-xl flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id="modal-title" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add application</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="px-5 py-4 grid grid-cols-2 gap-4 overflow-y-auto flex-1">
            <div className="col-span-2">
              <label htmlFor="add-company" className="label">Company *</label>
              <input id="add-company" ref={firstRef} className={`input ${fieldErrors.company ? 'border-red-300' : ''}`} placeholder="Google" value={form.company} onChange={set('company')} disabled={submitting} />
              {fieldErrors.company && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.company}</p>}
            </div>
            <div className="col-span-2">
              <label htmlFor="add-jobtitle" className="label">Job title *</label>
              <input id="add-jobtitle" className={`input ${fieldErrors.jobTitle ? 'border-red-300' : ''}`} placeholder="Software Engineer" value={form.jobTitle} onChange={set('jobTitle')} disabled={submitting} />
              {fieldErrors.jobTitle && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.jobTitle}</p>}
            </div>
            <div>
              <label htmlFor="add-platform" className="label">Platform *</label>
              <select id="add-platform" className={`input ${fieldErrors.sourcePlatform ? 'border-red-300' : ''}`} value={form.sourcePlatform} onChange={set('sourcePlatform')} disabled={submitting}>
                <option value="">Select…</option>
                {SOURCE_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {fieldErrors.sourcePlatform && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.sourcePlatform}</p>}
            </div>
            <div>
              <label htmlFor="add-location" className="label">Location</label>
              <input id="add-location" className="input" placeholder="On-site / Remote" value={form.location} onChange={set('location')} disabled={submitting} />
            </div>
            <div className="col-span-2">
              <label htmlFor="add-url" className="label">Job URL</label>
              <input id="add-url" type="url" className="input" placeholder="https://..." value={form.jobUrl} onChange={set('jobUrl')} disabled={submitting} />
            </div>
            <div>
              <label htmlFor="add-salary" className="label">Salary range</label>
              <input id="add-salary" className="input" placeholder="12–18 LPA" value={form.salaryRange} onChange={set('salaryRange')} disabled={submitting} />
            </div>
            <div className="col-span-2">
              <label htmlFor="add-notes" className="label">Notes</label>
              <textarea id="add-notes" rows={2} className="input resize-none" placeholder="Any notes…" value={form.notes} onChange={set('notes')} disabled={submitting} />
            </div>

            {/* ── Resume section ──────────────────────────────────────────── */}
            <div className="col-span-2 pt-2 border-t border-gray-100">
              <label className="label">Resume</label>

              <div className="flex gap-1.5 mb-3">
                {[
                  { id: 'existing', label: 'Use existing' },
                  { id: 'new', label: 'Upload new' },
                  { id: 'none', label: 'Skip' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setResumeMode(opt.id)}
                    disabled={submitting || (opt.id === 'existing' && resumes.length === 0)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${resumeMode === opt.id
                      ? 'text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                      }`}
                    style={resumeMode === opt.id ? { backgroundColor: 'var(--primary)' } : { color: 'var(--text-primary)' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {resumeMode === 'existing' && (
                <div>
                  <select
                    className={`input ${fieldErrors.resume ? 'border-red-300' : ''}`}
                    value={resumeId}
                    onChange={(e) => { setResumeId(e.target.value); setFieldErrors((p) => ({ ...p, resume: undefined })); }}
                    disabled={submitting || resumesLoading}
                  >
                    <option value="">{resumesLoading ? 'Loading…' : 'Select a version…'}</option>
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>{r.versionName}</option>
                    ))}
                  </select>
                </div>
              )}

              {resumeMode === 'new' && (
                <div className="space-y-2.5">
                  <input
                    type="text"
                    className={`input ${fieldErrors.resume ? 'border-red-300' : ''}`}
                    placeholder="Version name, e.g. Software Engineer v2"
                    value={newResumeVersionName}
                    onChange={(e) => { setNewResumeVersionName(e.target.value); setFieldErrors((p) => ({ ...p, resume: undefined })); }}
                    disabled={submitting}
                  />
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer text-xs font-medium px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors" style={{ color: 'var(--text-primary)' }}>
                      Choose PDF
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        disabled={submitting}
                        onChange={(e) => {
                          setResumeFile(e.target.files[0] || null);
                          setFieldErrors((p) => ({ ...p, resume: undefined }));
                        }}
                      />
                    </label>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {resumeFile ? resumeFile.name : 'No file selected'}
                    </span>
                  </div>
                </div>
              )}

              {fieldErrors.resume && <p className="text-[10px] text-red-500 mt-1">{fieldErrors.resume}</p>}
            </div>
          </div>
          {serverError && (
            <div className="flex-shrink-0 mx-5 mb-3 px-3 py-2 rounded-md bg-red-50 border border-red-100 text-red-700 text-xs">{serverError}</div>
          )}
          <div className="flex-shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button id="add-app-submit" type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Field ─────────────────────────────────────────────────────────────
function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <p className="text-sm" style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {value || '—'}
      </p>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ app, stageColor, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const stage = STAGES.find((s) => s.id === app.stage);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[1px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-xl">

        {/* Header */}
        <div
          className="flex items-start justify-between px-5 py-4 border-b border-gray-100 rounded-t-2xl"
          style={{ borderTop: `3px solid ${stageColor}` }}
        >
          <div className="min-w-0 mr-4">
            <p className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{app.company}</p>
            <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{app.jobTitle}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
              style={{ backgroundColor: `${stageColor}18`, color: stageColor }}
            >
              {stage?.label ?? app.stage}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">

          {/* Platform + Location */}
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Platform" value={app.sourcePlatform} />
            <DetailField label="Location" value={app.location} />
          </div>

          {/* Salary */}
          <DetailField label="Salary range" value={app.salaryRange} />

          {/* Job URL */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
              Job URL
            </p>
            {app.jobUrl ? (
              <a
                href={app.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm break-all underline"
                style={{ color: 'var(--primary)' }}
              >
                {app.jobUrl}
              </a>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>—</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
              Notes
            </p>
            {app.notes ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {app.notes}
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>—</p>
            )}
          </div>

          {/* Added on */}
          <DetailField label="Added on" value={formatDate(app.createdAt)} />

        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-4 border-t border-gray-100">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  );
}

// ─── Main KanbanBoard ─────────────────────────────────────────────────────────
export default function KanbanBoard({ onLogout }) {
  const [columns, setColumns] = useState(() => groupByStage([]));
  const [allApps, setAllApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toasts, push: pushToast } = useToast();

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(`${API_BASE}/api/applications`, { headers: authHeaders() });
      if (res.status === 401) { localStorage.removeItem('token'); onLogout(); return; }
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      const apps = Array.isArray(data) ? data : (data.data ?? []);
      setAllApps(apps);
      setColumns(groupByStage(apps));
    } catch (err) {
      setFetchError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const handleDragEnd = useCallback(async ({ source, destination, draggableId }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const from = source.droppableId;
    const to = destination.droppableId;
    setColumns((prev) => {
      const next = { ...prev };
      const fromList = Array.from(prev[from]);
      const [moved] = fromList.splice(source.index, 1);
      const toList = from === to ? fromList : Array.from(prev[to]);
      toList.splice(destination.index, 0, { ...moved, stage: to });
      next[from] = fromList;
      next[to] = toList;
      return next;
    });
    setAllApps((prev) => prev.map((a) => (a.id === draggableId ? { ...a, stage: to } : a)));
    // Also update selectedApp stage if it's the card being dragged
    setSelectedApp((prev) => prev && prev.id === draggableId ? { ...prev, stage: to } : prev);
    try {
      const res = await fetch(`${API_BASE}/api/applications/${draggableId}/stage`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ stage: to }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Status ${res.status}`); }
      if (to === "REJECTED") {
        setToast({
          type: "motivation",
          message: "Don't lose hope, champ. Every rejection is one step closer to the right opportunity."
        });
      } else if (to === "OFFER") {
        setShowConfetti(true);
        setToast({
          type: "success",
          message: "Congratulations! Your hard work paid off."
        });
        setTimeout(() => {
          setShowConfetti(false);
        }, 6000);
      } else {
        pushToast(`Moved to ${STAGES.find((s) => s.id === to)?.label ?? to}`);
      }
    } catch (err) {
      pushToast(`Update failed: ${err.message}`, 'error');
      fetchApps();
    }
  }, [fetchApps, pushToast]);

  const handleCreated = useCallback((newApp) => {
    setAllApps((prev) => [newApp, ...prev]);
    setColumns((prev) => {
      const stage = newApp.stage || 'SAVED';
      return { ...prev, [stage]: [newApp, ...(prev[stage] || [])] };
    });
    pushToast('Application added');
  }, [pushToast]);

  const filtered = search.trim()
    ? (() => {
      const q = search.toLowerCase();
      const result = {};
      STAGE_IDS.forEach((id) => {
        result[id] = (columns[id] || []).filter(
          (a) => a.company?.toLowerCase().includes(q) || a.jobTitle?.toLowerCase().includes(q) ||
            a.sourcePlatform?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q)
        );
      });
      return result;
    })()
    : columns;

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>

      <AppHeader
        title="Application Dashboard"
        onLogout={onLogout}
        search={search}
        setSearch={setSearch}
        onAdd={() => setShowModal(true)}
        onRefresh={fetchApps}
        loading={loading}
        statsBar={!loading && !fetchError ? <StatsBar apps={allApps} /> : null}
      />

      {/* Error banner */}
      {fetchError && (
        <div className="flex-shrink-0 mx-5 mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          <span>{fetchError}</span>
          <button className="btn-secondary text-xs py-1 px-3 border-red-200" onClick={fetchApps}>Retry</button>
        </div>
      )}

      {/* Board */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 h-full pb-2" style={{ minWidth: 'max-content' }}>
            {STAGES.map((stage) => (
              <Column
                key={stage.id}
                stage={stage}
                apps={filtered[stage.id] || []}
                loading={loading}
                onSelect={setSelectedApp}
              />
            ))}
          </div>
        </DragDropContext>
      </main>

      {showModal && <AddModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      {selectedApp && (
        <DetailModal
          app={selectedApp}
          stageColor={STAGES.find((s) => s.id === selectedApp.stage)?.color ?? '#1F4D3A'}
          onClose={() => setSelectedApp(null)}
        />
      )}

      <Toast toasts={toasts} />

      {showConfetti && (
        <Confetti
          recycle={false}
          numberOfPieces={350}
        />
      )}

      {toast && (
        <NotificationToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}