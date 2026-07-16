import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Trash2, RefreshCw, ToggleLeft, ToggleRight, Package, Briefcase } from 'lucide-react';

const BASE = 'http://localhost:8000/api/admin';

const StatPill = ({ label, value, color = 'gray' }) => (
    <div className={`bg-${color}-50 border border-${color}-200 rounded-lg px-4 py-3`}>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-bold text-${color}-700 mt-0.5`}>{value ?? '—'}</p>
    </div>
);

const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Icon className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-6 space-y-4">{children}</div>
    </div>
);

const ActionButton = ({ onClick, loading, disabled, variant = 'default', children }) => {
    const cls = {
        default: 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50',
        danger:  'border-red-300 text-red-700 bg-white hover:bg-red-50',
        primary: 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700',
    }[variant];
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none disabled:opacity-50 transition-colors ${cls}`}
        >
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
};

const Settings = ({ token }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => { fetchStats(); }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${BASE}/settings/stats`, { headers });
            setStats(res.data);
        } catch (err) {
            console.error('Error fetching stats', err);
        } finally {
            setLoading(false);
        }
    };

    const run = async (key, fn) => {
        setBusy(key);
        try {
            await fn();
            await fetchStats();
        } catch (err) {
            alert(err.response?.data?.detail || 'Action failed');
        } finally {
            setBusy('');
        }
    };

    const toggleScheduled = () => run('toggle', () =>
        axios.patch(`${BASE}/settings/scheduled-jobs/toggle`, {}, { headers })
    );

    const deleteScheduled = () => {
        if (!confirm('Delete all scheduled jobs? This cannot be undone.')) return;
        run('deleteScheduled', () =>
            axios.delete(`${BASE}/settings/scheduled-jobs`, { headers })
        );
    };

    const deleteOldJobs = () => {
        if (!confirm('Delete all completed jobs older than 30 days? Their product data will also be removed.')) return;
        run('deleteOld', () =>
            axios.delete(`${BASE}/maintenance/jobs/old?days=30`, { headers })
        );
    };

    const clearProducts = () => {
        if (!confirm('Clear ALL scraped product data? Job records will remain but all products will be deleted.')) return;
        run('clearProducts', () =>
            axios.delete(`${BASE}/maintenance/products`, { headers })
        );
    };

    const allActive = stats?.active_scheduled_jobs > 0;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

            <Section title="Scheduling" icon={Calendar}>
                {loading ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <StatPill label="Total scheduled jobs"  value={stats?.total_scheduled_jobs}  color="indigo" />
                            <StatPill label="Active scheduled jobs" value={stats?.active_scheduled_jobs} color="green" />
                        </div>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <ActionButton onClick={toggleScheduled} loading={busy === 'toggle'} variant="primary">
                                {allActive
                                    ? <><ToggleLeft  className="h-4 w-4" /> Disable all</>
                                    : <><ToggleRight className="h-4 w-4" /> Enable all</>}
                            </ActionButton>
                            <ActionButton onClick={deleteScheduled} loading={busy === 'deleteScheduled'} variant="danger" disabled={!stats?.total_scheduled_jobs}>
                                <Trash2 className="h-4 w-4" /> Delete all scheduled jobs
                            </ActionButton>
                        </div>
                    </>
                )}
            </Section>

            <Section title="Maintenance" icon={Briefcase}>
                {loading ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-4">
                            <StatPill label="Total scrape jobs"   value={stats?.total_jobs}           color="gray" />
                            <StatPill label="Old completed jobs"  value={stats?.old_completed_jobs}   color="yellow" />
                            <StatPill label="Total products"      value={stats?.total_products?.toLocaleString()} color="gray" />
                        </div>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <ActionButton onClick={deleteOldJobs} loading={busy === 'deleteOld'} variant="danger" disabled={!stats?.old_completed_jobs}>
                                <Trash2 className="h-4 w-4" /> Delete jobs older than 30 days
                            </ActionButton>
                            <ActionButton onClick={clearProducts} loading={busy === 'clearProducts'} variant="danger" disabled={!stats?.total_products}>
                                <Package className="h-4 w-4" /> Clear all product data
                            </ActionButton>
                        </div>
                    </>
                )}
            </Section>
        </div>
    );
};

export default Settings;
