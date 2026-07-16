import { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle, XCircle, Clock, Eye, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import axios from 'axios';

const STATUS_ICON = {
    completed: <CheckCircle className="h-5 w-5 text-green-500" />,
    failed:    <XCircle     className="h-5 w-5 text-red-500" />,
    running:   <RefreshCw   className="h-5 w-5 text-blue-500 animate-spin" />,
    pending:   <Clock       className="h-5 w-5 text-yellow-500" />,
    paused:    <Pause       className="h-5 w-5 text-orange-500" />,
};

const pageBtnCls = "relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50";

const Dashboard = ({ token, onViewProducts }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10;

    useEffect(() => { fetchJobs(1); }, [token]);

    const fetchJobs = async (pageNum = 1) => {
        try {
            setLoading(true);
            const res = await axios.get(`http://localhost:8000/api/jobs?page=${pageNum}&limit=${limit}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobs(res.data.items);
            setTotalPages(res.data.pages);
            setPage(pageNum);
        } catch (err) {
            console.error("Error fetching jobs", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (jobId, action) => {
        try {
            await axios.post(`http://localhost:8000/api/jobs/${jobId}/${action}`);
            fetchJobs(page);
        } catch (err) {
            console.error(`Error ${action}ing job`, err);
            alert(err.response?.data?.detail || `Failed to ${action} job`);
        }
    };

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Scrape Jobs</h3>
                <button onClick={() => fetchJobs(page)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" title="Refresh">
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            {loading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : (
                <>
                    <ul className="divide-y divide-gray-200">
                        {jobs.length === 0 ? (
                            <li className="px-4 py-4 text-center text-gray-500">No jobs found. Create one!</li>
                        ) : jobs.map((job) => (
                            <li key={job.id}>
                                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition duration-150 ease-in-out">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium text-indigo-600 truncate capitalize">{job.site} - {job.query}</p>
                                            <p className="flex items-center text-sm text-gray-500">
                                                {STATUS_ICON[job.status] ?? <Clock className="h-5 w-5 text-gray-400" />}
                                                <span className="ml-2 capitalize">{job.status}</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center text-sm text-gray-500">
                                                <span className="font-bold mr-1">{job.total_items}</span> items found
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {new Date(job.start_time).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                                            {job.status === 'running' && (
                                                <button onClick={() => handleAction(job.id, 'pause')} className="font-medium text-orange-600 hover:text-orange-500 flex items-center">
                                                    <Pause className="h-4 w-4 mr-1" /> Pause
                                                </button>
                                            )}
                                            {job.status === 'paused' && (
                                                <button onClick={() => handleAction(job.id, 'resume')} className="font-medium text-green-600 hover:text-green-500 flex items-center">
                                                    <Play className="h-4 w-4 mr-1" /> Resume
                                                </button>
                                            )}
                                            <button onClick={() => onViewProducts(job)} className="font-medium text-indigo-600 hover:text-indigo-500 flex items-center">
                                                <Eye className="h-4 w-4 mr-1" /> View Data
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
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
                                <button onClick={() => fetchJobs(1)}          disabled={page === 1}          className={`${pageBtnCls} rounded-l-md`}><span className="sr-only">First</span>   <ChevronsLeft  className="h-5 w-5" /></button>
                                <button onClick={() => fetchJobs(page - 1)}   disabled={page === 1}          className={pageBtnCls}                  ><span className="sr-only">Previous</span><ChevronLeft   className="h-5 w-5" /></button>
                                <button onClick={() => fetchJobs(page + 1)}   disabled={page === totalPages} className={pageBtnCls}                  ><span className="sr-only">Next</span>    <ChevronRight  className="h-5 w-5" /></button>
                                <button onClick={() => fetchJobs(totalPages)} disabled={page === totalPages} className={`${pageBtnCls} rounded-r-md`}><span className="sr-only">Last</span>    <ChevronsRight className="h-5 w-5" /></button>
                            </nav>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
