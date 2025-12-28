import React, { useState } from 'react';
import axios from 'axios';
import ScheduledJobsList from './ScheduledJobsList';

const Scheduler = ({ token }) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [formData, setFormData] = useState({
        site: 'Jumia',
        query: '',
        max_products: 10,
        cron_expression: '0 9 * * *'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Submitting with token:', token);
        try {
            await axios.post('http://localhost:8000/api/scheduler/jobs', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData({
                site: 'Jumia',
                query: '',
                max_products: 10,
                cron_expression: '0 9 * * *'
            });
            setRefreshTrigger(prev => prev + 1);
            alert('Scheduled job created successfully!');
        } catch (err) {
            console.error('Error creating scheduled job', err);
            alert(err.response?.data?.detail || 'Error creating scheduled job');
        }
    };

    const cronPresets = [
        { label: 'Every day at 9 AM', value: '0 9 * * *' },
        { label: 'Every 6 hours', value: '0 */6 * * *' },
        { label: 'Every Monday at 8 AM', value: '0 8 * * 1' },
        { label: 'Every hour', value: '0 * * * *' },
        { label: 'Custom', value: '' }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Scheduler</h2>
            </div>

            {/* Create Scheduled Job Form */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Scheduled Job</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Scraper Site
                            </label>
                            <select
                                value={formData.site}
                                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            >
                                <option value="Jumia">Jumia</option>
                                <option value="Kilimall">Kilimall</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search Query
                            </label>
                            <input
                                type="text"
                                value={formData.query}
                                onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g., laptops"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Products
                            </label>
                            <input
                                type="number"
                                value={formData.max_products}
                                onChange={(e) => setFormData({ ...formData, max_products: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                min="1"
                                max="100"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Schedule Preset
                            </label>
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setFormData({ ...formData, cron_expression: e.target.value });
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {cronPresets.map((preset, idx) => (
                                    <option key={idx} value={preset.value}>
                                        {preset.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cron Expression
                        </label>
                        <input
                            type="text"
                            value={formData.cron_expression}
                            onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            placeholder="0 9 * * *"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Format: minute hour day month weekday (e.g., "0 9 * * *" = every day at 9 AM)
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Create Scheduled Job
                    </button>
                </form>
            </div>

            <ScheduledJobsList key={refreshTrigger} token={token} />
        </div>
    );
};

export default Scheduler;
