import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
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
            setLoading(false);
        } catch (err) {
            console.error('Error fetching analytics data', err);
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

    // Chart 1: Product Count Comparison Data
    const productCountData = [
        {
            name: 'Products',
            Jumia: analyticsData.product_counts.jumia,
            Kilimall: analyticsData.product_counts.kilimall
        }
    ];

    // Chart 2: Success/Failure Pie Chart Data
    const successFailureData = [
        { name: 'Jumia Failed', value: analyticsData.job_stats.jumia.failed, fill: '#FF8D21' },
        { name: 'Jumia Success', value: analyticsData.job_stats.jumia.completed, fill: '#0077b6' },
        { name: 'Kilimall Failed', value: analyticsData.job_stats.kilimall.failed, fill: '#FFB76B' },
        { name: 'Kilimall Success', value: analyticsData.job_stats.kilimall.completed, fill: '#90e0ef' }
    ];

    const COLORS = ['#FF8D21', '#0077b6', '#FFB76B', '#90e0ef'];


    return (
        <div className="space-y-6">
            {/* Chart 3: Jumia Products vs Price */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Jumia - Top Products by Price</h3>
                {analyticsData.jumia_products.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.jumia_products} layout="vertical">
                            <XAxis type="number" stroke="#000" strokeWidth={0.5} tick={{ fill: '#000', fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" width={150} stroke="#000" strokeWidth={0.5} tick={{ fill: '#000', fontSize: 11 }} />
                            <Tooltip cursor={false} />
                            <Legend wrapperStyle={{ color: '#000' }} formatter={(value) => <span style={{ color: '#000', fontSize: 11 }}>{value}</span>} />
                            <Bar dataKey="price" fill="#0077b6" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-center text-gray-500 py-8">No Jumia products data available</div>
                )}
            </div>

            {/* Charts 1 & 2: Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1: Product Count Comparison */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Count Comparison</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={productCountData}>
                            <XAxis dataKey="name" stroke="#000" strokeWidth={0.5} tick={{ fill: '#000' }} />
                            <YAxis stroke="#000" strokeWidth={0.5} tick={{ fill: '#000', fontSize: 11 }} />
                            <Tooltip cursor={false} />
                            <Legend wrapperStyle={{ color: '#000' }} formatter={(value) => <span style={{ color: '#000', fontSize: 11 }}>{value}</span>} />
                            <Bar dataKey="Jumia" fill="#0077b6" barSize={100} />
                            <Bar dataKey="Kilimall" fill="#90e0ef" barSize={100} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Chart 2: Success/Failure Pie Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Scraping Success vs Failure</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={successFailureData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {successFailureData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend
                                wrapperStyle={{ color: '#000' }}
                                formatter={(value) => <span style={{ color: '#000', fontSize: 11 }}>{value}</span>}
                                payload={[
                                    { value: 'Jumia', type: 'square', color: '#0077b6' },
                                    { value: 'Kilimall', type: 'square', color: '#90e0ef' }
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 4: Kilimall Products vs Price */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kilimall - Top Products by Price</h3>
                {analyticsData.kilimall_products.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.kilimall_products} layout="vertical">
                            <XAxis type="number" stroke="#000" strokeWidth={0.5} tick={{ fill: '#000', fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" width={150} stroke="#000" strokeWidth={0.5} tick={{ fill: '#000', fontSize: 11 }} />
                            <Tooltip cursor={false} />
                            <Legend wrapperStyle={{ color: '#000' }} formatter={(value) => <span style={{ color: '#000', fontSize: 11 }}>{value}</span>} />
                            <Bar dataKey="price" fill="#90e0ef" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-center text-gray-500 py-8">No Kilimall products data available</div>
                )}
            </div>
        </div>
    );
};

export default Analytics;
