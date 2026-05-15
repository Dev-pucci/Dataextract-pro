import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const siteBadgeCls = "px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700";
const axisTick = { fill: '#6b7280', fontSize: 11 };
const tooltipProps = { cursor: false, contentStyle: { fontSize: 12 } };
const noData = (msg) => <div className="text-center text-gray-500 py-8">{msg}</div>;

const Card = ({ title, children }) => (
    <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        {children}
    </div>
);

const Analytics = () => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchAnalyticsData(); }, []);

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

    if (loading)       return <div className="flex items-center justify-center h-64 text-gray-500">Loading analytics...</div>;
    if (!analyticsData) return <div className="flex items-center justify-center h-64 text-gray-500">No analytics data available</div>;

    const { top_products, price_ranges, activity_over_time, top_queries } = analyticsData;

    return (
        <div className="space-y-6">
            <Card title="Top Products by Price">
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
                                        <td className="px-4 py-3"><span className={siteBadgeCls}>{p.site}</span></td>
                                        <td className="px-4 py-3 font-semibold text-gray-900">{p.price.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-gray-500">{p.scraped_at}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : noData('No product data available')}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Price Range Distribution">
                    {price_ranges.some(r => r.count > 0) ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={price_ranges} barSize={40}>
                                <XAxis dataKey="range" tick={axisTick} />
                                <YAxis tick={axisTick} allowDecimals={false} />
                                <Tooltip {...tooltipProps} formatter={(v) => [v, 'Products']} />
                                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : noData('No price data available')}
                </Card>

                <Card title="Scrape Activity Over Time">
                    {activity_over_time.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={activity_over_time}>
                                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                                <YAxis tick={axisTick} allowDecimals={false} />
                                <Tooltip {...tooltipProps} formatter={(v) => [v, 'Jobs']} />
                                <Line type="monotone" dataKey="jobs" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : noData('No activity data available')}
                </Card>
            </div>

            <Card title="Most Searched Queries">
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
                                        <td className="px-4 py-3"><span className={siteBadgeCls}>{q.site}</span></td>
                                        <td className="px-4 py-3 text-gray-700">{q.job_count}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-900">{q.total_items.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : noData('No query data available')}
            </Card>
        </div>
    );
};

export default Analytics;
