import { useEffect, useState } from 'react';
import axios from 'axios';

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend,
} from 'recharts';

import AppHeader from '../components/AppHeader';

const COLORS = [
    '#1F4D3A',
    '#B08968',
    '#52796F',
    '#354F52',
    '#84A98C',
];

export default function AnalyticsPage({ onLogout }) {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const userId = localStorage.getItem('userId');

                const response = await axios.get(
                    'http://localhost:8003/analytics',
                    {
                        headers: {
                            'x-user-id': userId,
                        },
                    }
                );

                setAnalytics(response.data.data);
            } catch (err) {
                setError(
                    err.response?.data?.error ||
                    'Failed to load analytics.'
                );
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-gray-300 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-red-600">
                {error}
            </div>
        );
    }

    const monthlyData = Object.entries(
        analytics.monthlyTrends || {}
    ).map(([month, count]) => ({
        month,
        count,
    }));

    const sourceData = Object.entries(
        analytics.sourceBreakdown || {}
    ).map(([name, value]) => ({
        name,
        value,
    }));

    const stageData = Object.entries(
        analytics.stageBreakdown || {}
    ).map(([stage, count]) => ({
        stage,
        count,
    }));

    const resumeData = Object.entries(
        analytics.resumeBreakdown || {}
    ).map(([resumeId, stats]) => ({
        resumeId: resumeId.slice(-8),
        total: stats.total,
        interviews: stats.interviews,
        offers: stats.offers,
    }));

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: 'var(--bg)' }}
        >
            <AppHeader onLogout={onLogout} />

            <div className="p-8">

                <div className="grid grid-cols-4 gap-6 mb-8">

                    <StatCard
                        title="Applications"
                        value={analytics.totalApplications}
                    />

                    <StatCard
                        title="Interview Rate"
                        value={`${analytics.interviewRate}%`}
                    />

                    <StatCard
                        title="Offer Rate"
                        value={`${analytics.offerRate}%`}
                    />

                    <StatCard
                        title="Rejection Rate"
                        value={`${analytics.rejectionRate}%`}
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">

                    <ChartCard title="Applications by Month">
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#1F4D3A"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Source Breakdown">
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie
                                    data={sourceData}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {sourceData.map((_, index) => (
                                        <Cell
                                            key={index}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Hiring Funnel">
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={stageData}>
                                <XAxis dataKey="stage" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#1F4D3A" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Resume Performance">
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={resumeData}>
                                <XAxis dataKey="resumeId" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="total" fill="#1F4D3A" />
                                <Bar dataKey="interviews" fill="#B08968" />
                                <Bar dataKey="offers" fill="#52796F" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">
                {title}
            </p>

            <p className="text-3xl font-bold mt-2">
                {value}
            </p>
        </div>
    );
}

function ChartCard({ title, children }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold mb-4">
                {title}
            </h3>

            {children}
        </div>
    );
}