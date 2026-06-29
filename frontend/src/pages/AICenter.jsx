import AppHeader from '../components/AppHeader'
import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeaders() {
    const token = localStorage.getItem('token')
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    }
}

function token() {
    return localStorage.getItem('token')
}

const TABS = ['Resume Match', 'Interview Notes', 'Follow-up Email', 'Career Insights']


export default function AICenter({ onLogout }) {
    const [activeTab, setActiveTab] = useState('Resume Match')

    // ── Resume Match state ──────────────────────────────────────────────────────
    const [resumeText, setResumeText] = useState('')
    const [jobDescription, setJobDescription] = useState('')
    const [resumeResult, setResumeResult] = useState(null)
    const [resumeLoading, setResumeLoading] = useState(false)
    const [resumeError, setResumeError] = useState('')
    const [extracting, setExtracting] = useState(false)
    const [extractError, setExtractError] = useState('')
    const [pdfFileName, setPdfFileName] = useState('')

    // ── Interview Notes state ───────────────────────────────────────────────────
    const [notes, setNotes] = useState('')
    const [notesJobTitle, setNotesJobTitle] = useState('')
    const [notesCompany, setNotesCompany] = useState('')
    const [notesResult, setNotesResult] = useState(null)
    const [notesLoading, setNotesLoading] = useState(false)
    const [notesError, setNotesError] = useState('')

    // ── Follow-up Email state ───────────────────────────────────────────────────
    const [fuCompany, setFuCompany] = useState('')
    const [fuJobTitle, setFuJobTitle] = useState('')
    const [fuAppliedAt, setFuAppliedAt] = useState('')
    const [fuInterviewer, setFuInterviewer] = useState('')
    const [fuResult, setFuResult] = useState(null)
    const [fuLoading, setFuLoading] = useState(false)
    const [fuError, setFuError] = useState('')
    const [copied, setCopied] = useState(false)

    // ── Career Insights state ───────────────────────────────────────────────────
    const [insightsResult, setInsightsResult] = useState(null)
    const [insightsLoading, setInsightsLoading] = useState(false)
    const [insightsError, setInsightsError] = useState('')

    // ─── PDF text extraction ────────────────────────────────────────────────────
    const handlePdfUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setPdfFileName(file.name)
        setExtractError('')
        setExtracting(true)

        try {
            const formData = new FormData()
            formData.append('resume', file)

            // CRITICAL: no Content-Type header — browser sets it with the boundary
            const res = await fetch(`${API_BASE}/api/resumes/extract-text`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
                body: formData,
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Extraction failed')

            setResumeText(data.data?.text || '')
        } catch (err) {
            setExtractError('Could not extract text. Please paste your resume manually.')
        } finally {
            setExtracting(false)
        }
    }

    // ─── Resume Match ───────────────────────────────────────────────────────────
    const runResumeMatch = async () => {
        if (!resumeText.trim()) { setResumeError('Resume text is required.'); return }
        if (!jobDescription.trim()) { setResumeError('Job description is required.'); return }

        setResumeLoading(true)
        setResumeError('')
        setResumeResult(null)

        try {
            const res = await fetch(`${API_BASE}/api/ai/resume-match`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ resumeText, jobDescription }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Resume match failed')
            setResumeResult(data.data)
        } catch (err) {
            setResumeError(err.message)
        } finally {
            setResumeLoading(false)
        }
    }

    // ─── Interview Notes ────────────────────────────────────────────────────────
    const runAnalyzeNotes = async () => {
        if (!notes.trim()) { setNotesError('Notes are required.'); return }

        setNotesLoading(true)
        setNotesError('')
        setNotesResult(null)

        try {
            const res = await fetch(`${API_BASE}/api/ai/analyze-notes`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ notes, jobTitle: notesJobTitle, company: notesCompany }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Analysis failed')
            setNotesResult(data.data)
        } catch (err) {
            setNotesError(err.message)
        } finally {
            setNotesLoading(false)
        }
    }

    // ─── Follow-up Email ────────────────────────────────────────────────────────
    const runFollowUp = async () => {
        if (!fuCompany || !fuJobTitle) { setFuError('Company and job title are required.'); return }

        setFuLoading(true)
        setFuError('')
        setFuResult(null)

        try {
            const res = await fetch(`${API_BASE}/api/ai/follow-up`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    company: fuCompany,
                    jobTitle: fuJobTitle,
                    appliedAt: fuAppliedAt || undefined,
                    interviewerName: fuInterviewer || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Generation failed')
            setFuResult(data.data)
        } catch (err) {
            setFuError(err.message)
        } finally {
            setFuLoading(false)
        }
    }

    const copyEmail = () => {
        if (!fuResult) return
        navigator.clipboard.writeText(`Subject: ${fuResult.subject}\n\n${fuResult.body}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // ─── Career Insights ────────────────────────────────────────────────────────
    const runCareerInsights = async () => {
        setInsightsLoading(true)
        setInsightsError('')
        setInsightsResult(null)

        try {
            // Fetch applications first, then send to AI
            const appsRes = await fetch(`${API_BASE}/api/applications`, {
                headers: { Authorization: `Bearer ${token()}` },
            })
            const appsData = await appsRes.json()
            const applications = appsData.data ?? []

            if (applications.length === 0) {
                setInsightsError('No applications found. Add some applications first.')
                return
            }

            const res = await fetch(`${API_BASE}/api/ai/career-insights`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ applications }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Insights failed')
            setInsightsResult(data.data)
        } catch (err) {
            setInsightsError(err.message)
        } finally {
            setInsightsLoading(false)
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────


    const sentimentColor = (s) => {
        if (s === 'Positive') return 'text-green-700 bg-green-50 border-green-200'
        if (s === 'Needs Improvement') return 'text-amber-700 bg-amber-50 border-amber-200'
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }

    const healthColor = (h) => {
        if (h === 'Strong') return 'text-green-700 bg-green-50 border-green-200'
        if (h === 'Needs Attention') return 'text-red-700 bg-red-50 border-red-200'
        return 'text-amber-700 bg-amber-50 border-amber-200'
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>

            {/* Top nav */}
            <AppHeader title="AI Career Center" onLogout={onLogout} />

            <main className="max-w-6xl mx-auto px-8 py-8">

                {/* Tab bar */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex border-b border-gray-200">
                        {TABS.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className="px-6 py-4 text-sm font-medium transition-colors"
                                style={{
                                    color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                                    borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">

                        {/* ── Resume Match ── */}
                        {activeTab === 'Resume Match' && (
                            <div className="space-y-5">

                                {/* PDF upload section */}
                                <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
                                        Upload your resume
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <label className="cursor-pointer text-sm font-medium px-4 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors" style={{ color: 'var(--text-primary)' }}>
                                            {extracting ? 'Extracting…' : 'Choose PDF'}
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                className="hidden"
                                                onChange={handlePdfUpload}
                                                disabled={extracting}
                                            />
                                        </label>
                                        {pdfFileName && (
                                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {pdfFileName}
                                            </span>
                                        )}
                                    </div>
                                    {extractError && (
                                        <p className="text-xs text-red-600 mt-2">{extractError}</p>
                                    )}
                                </div>

                                {/* Two textareas */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                            Resume text
                                        </label>
                                        <textarea
                                            rows={14}
                                            className="input w-full resize-none text-sm"
                                            placeholder="Text will appear here after PDF upload, or paste manually"
                                            value={resumeText}
                                            onChange={(e) => setResumeText(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                            Job description
                                        </label>
                                        <textarea
                                            rows={14}
                                            className="input w-full resize-none text-sm"
                                            placeholder="Paste the job description here"
                                            value={jobDescription}
                                            onChange={(e) => setJobDescription(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button onClick={runResumeMatch} disabled={resumeLoading} className="btn-primary disabled:opacity-60">
                                    {resumeLoading ? 'Analyzing…' : 'Analyze Resume'}
                                </button>

                                {resumeError && <p className="text-sm text-red-600">{resumeError}</p>}

                                {/* Result */}
                                {resumeResult && (
                                    <div className="border border-gray-200 rounded-lg p-5 space-y-4">
                                        {/* Score */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-4xl font-bold" style={{ color: 'var(--primary)' }}>
                                                {resumeResult.score}
                                                <span className="text-lg font-normal text-gray-400">/100</span>
                                            </div>
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {resumeResult.summary}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Missing keywords */}
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                    Missing keywords
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {(resumeResult.missingKeywords || []).map((k) => (
                                                        <span key={k} className="text-xs px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full">
                                                            {k}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Strengths */}
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                    Strengths
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {(resumeResult.strengths || []).map((s) => (
                                                        <span key={s} className="text-xs px-2 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full">
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Suggestions */}
                                        {resumeResult.suggestions?.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                    Suggestions
                                                </p>
                                                <ol className="space-y-1 list-decimal list-inside">
                                                    {resumeResult.suggestions.map((s, i) => (
                                                        <li key={i} className="text-sm" style={{ color: 'var(--text-primary)' }}>{s}</li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Interview Notes ── */}
                        {activeTab === 'Interview Notes' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Job title</label>
                                        <input className="input w-full text-sm" placeholder="Software Engineer" value={notesJobTitle} onChange={(e) => setNotesJobTitle(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Company</label>
                                        <input className="input w-full text-sm" placeholder="Google" value={notesCompany} onChange={(e) => setNotesCompany(e.target.value)} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Interview notes</label>
                                    <textarea rows={10} className="input w-full resize-none text-sm" placeholder="Paste your raw interview notes here — questions asked, topics discussed, areas you struggled with…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                                </div>

                                <button onClick={runAnalyzeNotes} disabled={notesLoading} className="btn-primary disabled:opacity-60">
                                    {notesLoading ? 'Analyzing…' : 'Analyze Notes'}
                                </button>

                                {notesError && <p className="text-sm text-red-600">{notesError}</p>}

                                {notesResult && (
                                    <div className="border border-gray-200 rounded-lg p-5 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Overall sentiment</p>
                                            <span className={`text-xs font-semibold px-3 py-1 border rounded-full ${sentimentColor(notesResult.overallSentiment)}`}>
                                                {notesResult.overallSentiment}
                                            </span>
                                        </div>

                                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{notesResult.summary}</p>

                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { label: 'Topics covered', items: notesResult.topicsCovered, border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700' },
                                                { label: 'Weak areas', items: notesResult.weakAreas, border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700' },
                                                { label: 'Revise before next', items: notesResult.revisionTopics, border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700' },
                                            ].map(({ label, items, border, bg, text }) => (
                                                <div key={label}>
                                                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(items || []).map((item) => (
                                                            <span key={item} className={`text-xs px-2 py-1 border rounded-full ${border} ${bg} ${text}`}>{item}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {notesResult.nextStepAdvice && (
                                            <div className="border-l-2 pl-3" style={{ borderColor: 'var(--primary)' }}>
                                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{notesResult.nextStepAdvice}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Follow-up Email ── */}
                        {activeTab === 'Follow-up Email' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Company *</label>
                                        <input className="input w-full text-sm" placeholder="Google" value={fuCompany} onChange={(e) => setFuCompany(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Job title *</label>
                                        <input className="input w-full text-sm" placeholder="Software Engineer" value={fuJobTitle} onChange={(e) => setFuJobTitle(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Applied date</label>
                                        <input type="date" className="input w-full text-sm" value={fuAppliedAt} onChange={(e) => setFuAppliedAt(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Interviewer name (optional)</label>
                                        <input className="input w-full text-sm" placeholder="Jane Smith" value={fuInterviewer} onChange={(e) => setFuInterviewer(e.target.value)} />
                                    </div>
                                </div>

                                <button onClick={runFollowUp} disabled={fuLoading} className="btn-primary disabled:opacity-60">
                                    {fuLoading ? 'Generating…' : 'Generate Follow-up Email'}
                                </button>

                                {fuError && <p className="text-sm text-red-600">{fuError}</p>}

                                {fuResult && (
                                    <div className="border border-gray-200 rounded-lg p-5 space-y-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Subject</p>
                                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fuResult.subject}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email body</p>
                                            <textarea
                                                rows={8}
                                                className="input w-full text-sm font-mono resize-none"
                                                value={fuResult.body}
                                                onChange={(e) => setFuResult({ ...fuResult, body: e.target.value })}
                                            />
                                        </div>
                                        <button onClick={copyEmail} className="btn-secondary text-sm px-4 py-2">
                                            {copied ? 'Copied!' : 'Copy to clipboard'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Career Insights ── */}
                        {activeTab === 'Career Insights' && (
                            <div className="space-y-4">
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Analyzes all your applications and gives personalized advice.
                                </p>

                                <button onClick={runCareerInsights} disabled={insightsLoading} className="btn-primary disabled:opacity-60">
                                    {insightsLoading ? 'Analyzing your pipeline…' : 'Get Career Insights'}
                                </button>

                                {insightsError && <p className="text-sm text-red-600">{insightsError}</p>}

                                {insightsResult && (
                                    <div className="space-y-4">
                                        {/* Health badge */}
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Pipeline health</p>
                                            <span className={`text-xs font-semibold px-3 py-1 border rounded-full ${healthColor(insightsResult.overallHealth)}`}>
                                                {insightsResult.overallHealth}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="border border-gray-200 rounded-lg p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Strongest source</p>
                                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{insightsResult.strongestSource}</p>
                                            </div>
                                            <div className="border border-gray-200 rounded-lg p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Weakest stage</p>
                                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{insightsResult.weakestStage}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="border border-gray-200 rounded-lg p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Patterns observed</p>
                                                <ul className="space-y-2">
                                                    {(insightsResult.patterns || []).map((p, i) => (
                                                        <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-primary)' }}>
                                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                                                            {p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="border border-gray-200 rounded-lg p-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Recommendations</p>
                                                <ul className="space-y-2">
                                                    {(insightsResult.advice || []).map((a, i) => (
                                                        <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--text-primary)' }}>
                                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }} />
                                                            {a}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {insightsResult.motivationalNote && (
                                            <div className="border border-gray-200 rounded-lg px-5 py-4">
                                                <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
                                                    {insightsResult.motivationalNote}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    )
}