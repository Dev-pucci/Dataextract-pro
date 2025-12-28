import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Trash2, Power, PowerOff } from 'lucide-react';

const ScheduledJobsList = ({ token }) => {
    const [scheduledJobs, setScheduledJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchScheduledJobs();
            const interval = setInterval(fetchScheduledJobs, 5000);
            return () => clearInterval(interval);
        }
    }, [token]);

    const fetchScheduledJobs = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/scheduler/jobs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setScheduledJobs(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching scheduled jobs', err);
            setLoading(false);
        }
    };

    const handleDelete = async (jobId) => {
        if (!confirm('Are you sure you want to delete this scheduled job?')) return;

        try {
            await axios.delete(`http://localhost:8000/api/scheduler/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchScheduledJobs();
        } catch (err) {
            console.error('Error deleting scheduled job', err);
        }
    };

    const handleToggle = async (jobId) => {
        try {
            await axios.patch(`http://localhost:8000/api/scheduler/jobs/${jobId}/toggle`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchScheduledJobs();
        } catch (err) {
            console.error('Error toggling scheduled job', err);
        }
    };

    const formatNextRun = (dateString) => {
        if (!dateString) return 'Not scheduled';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Scheduled Jobs</h3>
            </div>

            {loading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : !Array.isArray(scheduledJobs) || scheduledJobs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No scheduled jobs yet</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Site
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Query
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Max Products
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Schedule
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Next Run
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Run Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {scheduledJobs.map((job) => (
                                <tr key={job.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900">{job.site}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-900">{job.query}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-900">{job.max_products}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-900">
                                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{job.cron_expression}</code>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-900">
                                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                            {formatNextRun(job.next_run)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {job.last_run_status && (
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${job.last_run_status === 'running' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                                                job.last_run_status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    job.last_run_status === 'failed' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                <span className="capitalize">{job.last_run_status}</span>
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${job.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {job.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleToggle(job.id)}
                                                className={`p-1 rounded hover:bg-gray-100 ${job.is_active ? 'text-yellow-600' : 'text-green-600'
                                                    }`}
                                                title={job.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {job.is_active ? <PowerOff className="h-5 w-5" /> : <Power className="h-5 w-5" />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(job.id)}
                                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-gray-100"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ScheduledJobsList;
