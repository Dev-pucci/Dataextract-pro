import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Clock, RefreshCw, Pause, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const formatDuration = (start, end) => {
    if (!end) return '—';
    const ms = new Date(end) - new Date(start);
    if (ms < 0) return '—';
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
};

const STATUS = {
    completed: { cls: 'bg-green-100 text-green-700',  icon: <CheckCircle className="h-3.5 w-3.5" /> },
    failed:    { cls: 'bg-red-100 text-red-700',       icon: <XCircle    className="h-3.5 w-3.5" /> },
    running:   { cls: 'bg-blue-100 text-blue-700',     icon: <RefreshCw  className="h-3.5 w-3.5 animate-spin" /> },
    pending:   { cls: 'bg-yellow-100 text-yellow-700', icon: <Clock      className="h-3.5 w-3.5" /> },
    paused:    { cls: 'bg-orange-100 text-orange-700', icon: <Pause      className="h-3.5 w-3.5" /> },
};

const StatusBadge = ({ status }) => {
    const { cls, icon } = STATUS[status] || { cls: 'bg-gray-100 text-gray-600', icon: null };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>
            {icon}{status}
        </span>
    );
};

const pageBtnCls = "relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40";

const JobsSummaryTable = ({ token }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    useEffect(() => { fetchJobs(1); }, []);

    const fetchJobs = async (pageNum) => {
        try {
            setLoading(true);
            const res = await axios.get(`http://localhost:8000/api/jobs?page=${pageNum}&limit=${limit}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobs(res.data.items);
            setTotalPages(res.data.pages);
            setTotal(res.data.total);
            setPage(pageNum);
        } catch (err) {
            console.error('Error fetching jobs summary', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">All Runs Summary</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{total} total job{total !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => fetchJobs(page)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {loading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : jobs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No jobs found</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">Query</th>
                                    <th className="px-6 py-3">Site</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Items Scraped</th>
                                    <th className="px-6 py-3">Duration</th>
                                    <th className="px-6 py-3">Started</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 capitalize">{job.query}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">{job.site}</span>
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                                        <td className="px-6 py-4 text-gray-900 font-semibold">{job.total_items}</td>
                                        <td className="px-6 py-4 text-gray-600">{formatDuration(job.start_time, job.end_time)}</td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(job.start_time).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm text-gray-700">
                            Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                        </p>
                        <nav className="inline-flex rounded-md shadow-sm -space-x-px">
                            <button onClick={() => fetchJobs(1)}          disabled={page === 1}          className={`${pageBtnCls} rounded-l-md`}><ChevronsLeft  className="h-4 w-4" /></button>
                            <button onClick={() => fetchJobs(page - 1)}   disabled={page === 1}          className={pageBtnCls}                  ><ChevronLeft   className="h-4 w-4" /></button>
                            <button onClick={() => fetchJobs(page + 1)}   disabled={page === totalPages} className={pageBtnCls}                  ><ChevronRight  className="h-4 w-4" /></button>
                            <button onClick={() => fetchJobs(totalPages)} disabled={page === totalPages} className={`${pageBtnCls} rounded-r-md`}><ChevronsRight className="h-4 w-4" /></button>
                        </nav>
                    </div>
                </>
            )}
        </div>
    );
};

export default JobsSummaryTable;
