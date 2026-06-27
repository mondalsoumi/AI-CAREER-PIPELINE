import { useEffect, useState, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonRow() {
    return (
        <div className="flex items-center justify-between px-5 py-4 border border-gray-100 rounded-lg animate-pulse">
            <div className="flex-1">
                <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-2.5 bg-gray-100 rounded w-1/4" />
            </div>
            <div className="flex gap-2">
                <div className="h-8 w-20 bg-gray-100 rounded" />
                <div className="h-8 w-16 bg-gray-100 rounded" />
            </div>
        </div>
    )
}

// ─── Resume row ───────────────────────────────────────────────────────────────
function ResumeRow({ resume, onDelete }) {
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${resume.versionName}"?`)) return
        setDeleting(true)
        await onDelete(resume.id)
        setDeleting(false)
    }

    return (
        <div className="flex items-center justify-between px-5 py-4 border border-gray-200 rounded-lg bg-white">
            <div className="flex-1 min-w-0 mr-6">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {resume.versionName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {resume._count?.applications ?? 0} application{resume._count?.applications !== 1 ? 's' : ''} · Uploaded {formatDate(resume.createdAt)}
                </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {resume.downloadUrl && (
                    <a
                        href={resume.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        Download
                    </a>
                )}
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs font-medium px-3 py-1.5 border border-red-200 rounded text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                    {deleting ? 'Deleting…' : 'Delete'}
                </button>
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ResumeManager({ onLogout }) {
    const token = localStorage.getItem('token')

    const [versionName, setVersionName] = useState('')
    const [selectedFile, setSelectedFile] = useState(null)
    const [resumes, setResumes] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    // Redirect if no token
    useEffect(() => {
        if (!token) onLogout()
    }, [token, onLogout])

    // ── Fetch resume list ───────────────────────────────────────────────────────
    const fetchResumes = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            const res = await fetch(`${API_BASE}/api/resumes`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to load resumes')
            setResumes(data.data ?? [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        if (token) fetchResumes()
    }, [token, fetchResumes])

    // ── Upload ──────────────────────────────────────────────────────────────────
    const handleUpload = async () => {
        setMessage('')
        setError('')

        if (!versionName.trim()) { setError('Version name is required.'); return }
        if (!selectedFile) { setError('Please choose a PDF file.'); return }

        try {
            setUploading(true)
            const formData = new FormData()
            formData.append('resume', selectedFile)
            formData.append('versionName', versionName.trim())

            // CRITICAL: no Content-Type header — browser sets it with the boundary
            const res = await fetch(`${API_BASE}/api/resumes`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Upload failed')

            setVersionName('')
            setSelectedFile(null)
            // Reset file input visually
            const input = document.getElementById('resume-file-input')
            if (input) input.value = ''

            setMessage('Resume uploaded successfully')
            fetchResumes()
        } catch (err) {
            setError(err.message)
        } finally {
            setUploading(false)
        }
    }

    // ── Delete ──────────────────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        setError('')
        try {
            const res = await fetch(`${API_BASE}/api/resumes/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Delete failed')
            fetchResumes()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        onLogout()
    }

    // ── Nav links ───────────────────────────────────────────────────────────────
    const navLinks = [
        { label: 'Dashboard', path: '/' },
        { label: 'Analytics', path: '/analytics' },
        { label: 'AI Center', path: '/ai-center' },
        { label: 'Resumes', path: '/resumes' },
    ]

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>

            {/* Top nav */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
                <div>
                    <p
                        className="text-sm tracking-[0.22em] uppercase font-bold"
                        style={{ color: 'var(--accent)' }}
                    >
                        AI Career Pipeline
                    </p>
                    <h1 className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                        Resume Manager
                    </h1>
                </div>

                <div className="flex items-center gap-6">
                    <nav className="flex items-center gap-5">
                        {navLinks.map((link) => (
                            <a
                                key={link.path}
                                href={link.path}
                                className="text-sm font-medium transition-colors"
                                style={{
                                    color: window.location.pathname === link.path
                                        ? 'var(--primary)'
                                        : 'var(--text-secondary)',
                                    borderBottom: window.location.pathname === link.path
                                        ? '2px solid var(--primary)'
                                        : '2px solid transparent',
                                    paddingBottom: '2px',
                                }}
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>
                    <div className="h-4 w-px bg-gray-200" />
                    <button
                        onClick={handleLogout}
                        className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-8 py-8">

                {/* Upload card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wide mb-5" style={{ color: 'var(--text-secondary)' }}>
                        Upload new version
                    </h2>

                    <div className="space-y-4">
                        {/* Version name */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                Version name *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Software Engineer v2"
                                value={versionName}
                                onChange={(e) => setVersionName(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400"
                                style={{ color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* File picker */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                PDF file *
                            </label>
                            <div className="flex items-center gap-3">
                                <label className="cursor-pointer text-sm font-medium px-4 py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors" style={{ color: 'var(--text-primary)' }}>
                                    Choose PDF
                                    <input
                                        id="resume-file-input"
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                                    />
                                </label>
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {selectedFile ? selectedFile.name : 'No file selected'}
                                </span>
                            </div>
                        </div>

                        {/* Upload button */}
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="px-5 py-2 rounded-md text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                            style={{ backgroundColor: 'var(--primary)' }}
                        >
                            {uploading ? 'Uploading…' : 'Upload Resume'}
                        </button>

                        {/* Feedback */}
                        {message && (
                            <div className="px-4 py-3 border border-green-200 bg-green-50 rounded-md">
                                <p className="text-sm text-green-700">{message}</p>
                            </div>
                        )}
                        {error && (
                            <div className="px-4 py-3 border border-red-200 bg-red-50 rounded-md">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resume list */}
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-secondary)' }}>
                        Your resume versions
                    </h2>

                    {loading ? (
                        <div className="space-y-3">
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                    ) : resumes.length === 0 ? (
                        <div className="bg-white border border-gray-200 border-dashed rounded-lg px-6 py-12 text-center">
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                No resume versions uploaded yet. Upload your first resume above.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {resumes.map((resume) => (
                                <ResumeRow key={resume.id} resume={resume} onDelete={handleDelete} />
                            ))}
                        </div>
                    )}
                </div>

            </main>
        </div>
    )
}