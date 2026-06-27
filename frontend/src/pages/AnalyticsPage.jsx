import { useEffect, useState } from 'react'
import AppHeader from '../components/AppHeader'
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    Tooltip, CartesianGrid, PieChart, Pie, Cell,
    BarChart, Bar, Legend,
} from 'recharts'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const COLORS = ['#1F4D3A', '#B08968', '#52796F', '#354F52', '#84A98C']

export default function AnalyticsPage({ onLogout }) {
    const [loading, setLoading] = useState(true)
    const [analytics, setAnalytics] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const token = localStorage.getItem('token')

                // FIXED: go through API gateway on port 8000, not directly to port 8003
                // Gateway validates JWT and injects x-user-id header automatically
                const res = await fetch(`${API_BASE}/api/analytics`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (res.status === 401) {
                    localStorage.removeItem('token')
                    onLogout()
                    return
                }

                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Failed to load analytics')

                setAnalytics(data.data)
            } catch (err) {
                setError(err.message || 'Failed to load analytics.')
            } finally {
                setLoading(false)
            }
        }

        fetchAnalytics()
    }, [onLogout])

    if (loading) {
        return (
            <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
                <AppHeader onLogout={onLogout} title="Analytics" />
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-gray-200 border-t-transparent rounded-full" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
                <AppHeader onLogout={onLogout} title="Analytics" />
                <div className="p-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-4 text-red-700 text-sm">{error}</div>
                </div>
            </div>
        )
    }

    const monthlyData = Object.entries(analytics.monthlyTrends || {}).map(([month, count]) => ({ month, count }))
    const sourceData = Object.entries(analytics.sourceBreakdown || {}).map(([name, value]) => ({ name, value }))
    const stageData = Object.entries(analytics.stageBreakdown || {}).map(([stage, count]) => ({ stage, count }))
    const resumeData = Object.entries(analytics.resumeBreakdown || {}).map(([id, stats]) => ({
        resumeId: id.slice(-8),
        total: stats.total,
        interviews: stats.interviews,
        offers: stats.offers,
    }))

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
            <AppHeader onLogout={onLogout} title="Analytics" />

            <div className="p-8">

                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <StatCard title="Total applications" value={analytics.totalApplications} />
                    <StatCard title="Interview rate" value={`${analytics.interviewRate}%`} />
                    <StatCard title="Offer rate" value={`${analytics.offerRate}%`} />
                    <StatCard title="Rejection rate" value={`${analytics.rejectionRate}%`} />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-2 gap-6">

                    <ChartCard title="Applications by month">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="count" stroke="#1F4D3A" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Source breakdown">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={sourceData} dataKey="value" nameKey="name" outerRadius={110} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Hiring funnel">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stageData}>
                                <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#1F4D3A" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Resume performance">
                        {resumeData.length === 0 ? (
                            <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                No resume data yet. Link resumes to applications to see performance.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={resumeData}>
                                    <XAxis dataKey="resumeId" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="total" fill="#1F4D3A" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="interviews" fill="#B08968" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="offers" fill="#52796F" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs uppercase tracking-wide font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{value}</p>
        </div>
    )
}

function ChartCard({ title, children }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h3>
            {children}
        </div>
    )
}