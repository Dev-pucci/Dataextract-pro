import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Scale, RefreshCw } from 'lucide-react';

const selectCls = "block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";

const ComparisonPicker = ({ token, onCompare, onBack }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [jobA, setJobA] = useState('');
    const [jobB, setJobB] = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get('http://localhost:8000/api/jobs?limit=100', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setJobs((res.data.items || []).filter(j => j.status === 'completed'));
            } catch (err) {
                console.error('Error fetching jobs', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [token]);

    const selectedA = jobs.find(j => j.id === +jobA);
    const selectedB = jobs.find(j => j.id === +jobB);
    const canCompare = selectedA && selectedB && jobA !== jobB;

    const JobSelect = ({ label, value, set, other }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <select value={value} onChange={e => set(e.target.value)} className={selectCls}>
                <option value="">Select a completed job...</option>
                {jobs
                    .filter(j => String(j.id) !== other)
                    .map(j => (
                        <option key={j.id} value={j.id}>
                            {j.site} — {j.query} ({j.total_items} items) · {new Date(j.start_time).toLocaleDateString()}
                        </option>
                    ))
                }
            </select>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Comparison</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Select two completed jobs to compare prices</p>
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading jobs...
                </div>
            ) : jobs.length < 2 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    You need at least two completed jobs to run a comparison.
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow p-6 max-w-lg mx-auto space-y-5">
                    <JobSelect label="Job A" value={jobA} set={setJobA} other={jobB} />
                    <JobSelect label="Job B" value={jobB} set={setJobB} other={jobA} />

                    <button
                        onClick={() => onCompare([selectedA, selectedB])}
                        disabled={!canCompare}
                        className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Scale className="h-4 w-4 mr-2" />
                        Compare
                    </button>
                </div>
            )}
        </div>
    );
};

export default ComparisonPicker;
