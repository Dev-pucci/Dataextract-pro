import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const Analytics = () => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/analytics/data');
            setAnalyticsData(res.data);
        } catch (err) {
            console.error('Error fetching analytics data', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading analytics...</div>
            </div>
        );
    }

    if (!analyticsData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">No analytics data available</div>
            </div>
        );
    }

    const { top_products, price_ranges, activity_over_time, top_queries } = analyticsData;

    return (
        <div className="space-y-6">

            {/* 1. Top Products Table */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Price</h3>
                {top_products.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">Site</th>
                                    <th className="px-4 py-3">Price (KES)</th>
                                    <th className="px-4 py-3">Scraped At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {top_products.map((p, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                                        <td className="px-4 py-3 text-gray-900 max-w-xs truncate" title={p.title}>{p.title}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                                {p.site}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-gray-900">
                                            {p.price.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{p.scraped_at}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">No product data available</div>
                )}
            </div>

            {/* 2 & 3: Price Range Distribution + Activity Over Time side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Price Range Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Range Distribution</h3>
                    {price_ranges.some(r => r.count > 0) ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={price_ranges} barSize={40}>
                                    <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
                                <Tooltip
                                    cursor={false}
                                    formatter={(value) => [value, 'Products']}
                                    contentStyle={{ fontSize: 12 }}
                                />
                                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-gray-500 py-8">No price data available</div>
                    )}
                </div>

                {/* Scrape Activity Over Time */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Scrape Activity Over Time</h3>
                    {activity_over_time.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={activity_over_time}>
                                    <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                    tickFormatter={(v) => v.slice(5)}
                                />
                                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
                                <Tooltip
                                    cursor={false}
                                    formatter={(value) => [value, 'Jobs']}
                                    contentStyle={{ fontSize: 12 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="jobs"
                                    stroke="#4f46e5"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: '#4f46e5' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-gray-500 py-8">No activity data available</div>
                    )}
                </div>
            </div>

            {/* 4. Most Searched Queries */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Searched Queries</h3>
                {top_queries.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Query</th>
                                    <th className="px-4 py-3">Site</th>
                                    <th className="px-4 py-3">Jobs Run</th>
                                    <th className="px-4 py-3">Items Scraped</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {top_queries.map((q, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 capitalize">{q.query}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                                {q.site}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{q.job_count}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-900">{q.total_items.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8">No query data available</div>
                )}
            </div>

        </div>
    );
};

export default Analytics;
