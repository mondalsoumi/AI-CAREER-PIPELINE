import { NavLink } from 'react-router-dom';

export default function AppHeader({
    children,
    search,
    setSearch,
    onAdd,
    onRefresh,
    loading,
    onLogout,
}) {
    return (
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-8 py-5">
            <div className="flex items-center justify-between gap-4">

                {/* Left */}
                <div className="flex items-center gap-6 min-w-0">
                    <div className="flex-shrink-0">
                        <p
                            className="text-[11px] tracking-[0.25em] uppercase font-semibold"
                            style={{ color: 'var(--accent)' }}
                        >
                            AI Career Pipeline
                        </p>

                        <h1
                            className="text-xl font-bold mt-1"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Application Dashboard
                        </h1>
                    </div>

                    <div className="hidden sm:block h-4 w-px bg-gray-200" />

                    {/* Navigation */}
                    <nav className="flex items-center gap-2">
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-lg text-sm font-medium ${isActive
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-500 hover:text-gray-800'
                                }`
                            }
                        >
                            Board
                        </NavLink>

                        <NavLink
                            to="/analytics"
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-lg text-sm font-medium ${isActive
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-500 hover:text-gray-800'
                                }`
                            }
                        >
                            Analytics
                        </NavLink>
                    </nav>

                    {children}
                </div>

                {/* Right */}
                <div className="flex items-center gap-2 flex-shrink-0">

                    <div className="relative hidden md:block">
                        <input
                            type="text"
                            className="input pl-3 pr-3 py-1.5 w-44 text-xs"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn-primary text-sm px-4 py-2"
                        onClick={onAdd}
                    >
                        Add
                    </button>

                    <button
                        className="btn-secondary text-sm px-4 py-2"
                        onClick={onRefresh}
                        disabled={loading}
                    >
                        Refresh
                    </button>

                    <div className="h-4 w-px bg-gray-200" />

                    <button
                        className="text-xs font-medium transition-colors px-1 text-gray-400 hover:text-gray-700"
                        onClick={onLogout}
                    >
                        Sign out
                    </button>
                </div>

            </div>
        </header>
    );
}