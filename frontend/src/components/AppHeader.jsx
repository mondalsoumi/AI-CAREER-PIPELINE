import { NavLink, useNavigate } from 'react-router-dom'

const NAV = [
    { label: 'Dashboard', to: '/' },
    { label: 'Analytics', to: '/analytics' },
    { label: 'AI Center', to: '/ai-center' },
    { label: 'Resumes', to: '/resumes' },
]

export default function AppHeader({
    title = 'Application Dashboard',
    onLogout,
    // Dashboard-only props — undefined on other pages
    search,
    setSearch,
    onAdd,
    onRefresh,
    loading,
    statsBar,        // pass <StatsBar /> from KanbanBoard
}) {
    const navigate = useNavigate()

    const handleLogout = () => {
        localStorage.removeItem('token')
        if (onLogout) onLogout()
    }

    const isDashboard = onAdd !== undefined

    return (
        <header
            className="flex-shrink-0 px-8 pt-4 pb-3"
            style={{ backgroundColor: '#1F4D3A' }}
        >
            {/* Row 1 */}
            <div className="grid items-center" style={{ gridTemplateColumns: '1fr auto 1fr' }}>

                {/* Wordmark */}
                <div className="flex-shrink-0">
                    <p className="text-sm tracking-[0.22em] uppercase font-bold"
                        style={{ color: '#B08968' }}>
                        AI Career Pipeline
                    </p>
                    <h1 className="text-lg font-bold text-white mt-0.5">{title}</h1>
                </div>

                {/* Nav */}
                <nav className="flex items-center justify-center gap-1 mx-8">
                    {NAV.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '/'}
                            className={({ isActive }) =>
                                `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive
                                    ? 'text-white bg-white/20'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Right actions */}
                <div className="flex items-center justify-end gap-2">
                    {/* Search — Dashboard only */}
                    {isDashboard && (
                        <div className="relative">
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                className="pl-8 pr-3 py-1.5 w-44 text-xs rounded-md outline-none"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.12)',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                }}
                                placeholder="Search companies…"
                                value={search || ''}
                                onChange={(e) => setSearch?.(e.target.value)}
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch?.('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs"
                                >×</button>
                            )}
                        </div>
                    )}

                    {/* Add — Dashboard only */}
                    {isDashboard && (
                        <button
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-semibold transition-colors"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.25)',
                            }}
                            onClick={onAdd}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add
                        </button>
                    )}

                    {isDashboard && (
                        <button
                            className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                            onClick={onRefresh}
                            disabled={loading}
                            title="Refresh"
                        >
                            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    )}

                    <div className="w-px h-4 bg-white/20" />

                    <button
                        className="text-xs font-medium text-white/50 hover:text-white transition-colors"
                        onClick={handleLogout}
                    >
                        Sign out
                    </button>
                </div>

            </div>

            {/* Row 2: stats bar — Dashboard only */}
            {statsBar && (
                <div className="mt-3 pt-3 border-t border-white/20">
                    {statsBar}
                </div>
            )}
        </header>
    )
}