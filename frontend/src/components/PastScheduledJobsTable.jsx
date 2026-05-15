import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye } from 'lucide-react';

const thCls = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
const tdCls = "px-6 py-4 whitespace-nowrap text-sm text-gray-900";
const pageBtnCls = "relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50";

const STATUS_ICON = {
    completed: <CheckCircle className="h-5 w-5 text-green-500" />,
    failed:    <XCircle    className="h-5 w-5 text-red-500" />,
    running:   <Clock      className="h-5 w-5 text-blue-500 animate-spin" />,
};

const PageBtn = ({ onClick, disabled, label, rounded, children }) => (
    <button onClick={onClick} disabled={disabled} className={`${pageBtnCls} ${rounded || ''}`}>
        <span className="sr-only">{label}</span>
        {children}
    </button>
);

const PastScheduledJobsTable = ({ token, onViewProducts }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    useEffect(() => { fetchJobs(1); }, []);

    const fetchJobs = async (pageNum) => {
        try {
            setLoading(true);
            const res = await axios.get(`http://localhost:8000/api/jobs?scheduled=true&page=${pageNum}&limit=${limit}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobs(res.data.items);
            setTotalPages(res.data.pages);
            setPage(pageNum);
        } catch (err) {
            console.error('Error fetching past scheduled jobs', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Past Scheduled Executions</h3>
            </div>

            {loading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : jobs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No past executions found</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className={thCls}>Site</th>
                                    <th className={thCls}>Product</th>
                                    <th className={thCls}>Run Time</th>
                                    <th className={thCls}>Status</th>
                                    <th className={thCls}>Items</th>
                                    <th className={thCls}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {jobs.map((job) => (
                                    <tr key={job.id}>
                                        <td className={`${tdCls} capitalize`}>{job.site}</td>
                                        <td className={tdCls}>{job.query}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                                {new Date(job.start_time).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {STATUS_ICON[job.status] ?? <AlertCircle className="h-5 w-5 text-gray-400" />}
                                                <span className="ml-2 text-sm text-gray-900 capitalize">{job.status}</span>
                                            </div>
                                        </td>
                                        <td className={tdCls}>{job.total_items}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => onViewProducts(job)} className="text-indigo-600 hover:text-indigo-900 flex items-center">
                                                <Eye className="h-4 w-4 mr-1" /> View Data
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button onClick={() => fetchJobs(page - 1)} disabled={page === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={() => fetchJobs(page + 1)} disabled={page === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-700">
                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                            </p>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <PageBtn onClick={() => fetchJobs(1)}          disabled={page === 1}          label="First"    rounded="rounded-l-md"><ChevronsLeft  className="h-5 w-5" /></PageBtn>
                                <PageBtn onClick={() => fetchJobs(page - 1)}   disabled={page === 1}          label="Previous"                      ><ChevronLeft   className="h-5 w-5" /></PageBtn>
                                <PageBtn onClick={() => fetchJobs(page + 1)}   disabled={page === totalPages} label="Next"                          ><ChevronRight  className="h-5 w-5" /></PageBtn>
                                <PageBtn onClick={() => fetchJobs(totalPages)} disabled={page === totalPages} label="Last"     rounded="rounded-r-md"><ChevronsRight className="h-5 w-5" /></PageBtn>
                            </nav>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PastScheduledJobsTable;
