import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, LogOut, User, ChevronDown, Play, BarChart3,
  Settings as SettingsIcon, History, Calendar, Shield, TrendingUp,
  Clock, CheckCircle, Package, Users, ChevronRight, Scale
} from 'lucide-react';
import JobControl from './components/JobControl';
import JobsList from './components/Dashboard';
import ProductTable from './components/ProductTable';
import Login from './components/Login';
import Register from './components/Register';
import AnalyticsCharts from './components/Analytics';
import Scheduler from './components/Scheduler';
import ScheduledJobsList from './components/ScheduledJobsList';
import PastScheduledJobsTable from './components/PastScheduledJobsTable';
import UserManagementTable from './components/UserManagementTable';
import Settings from './components/Settings';
import AccountSettings from './components/AccountSettings';
import PriceComparison from './components/PriceComparison';
import ComparisonPicker from './components/ComparisonPicker';
import JobsSummaryTable from './components/JobsSummaryTable';

const StatCard = ({ label, value, icon: Icon, bg, ic }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-3xl font-bold text-black mt-2">{value}</p>
      </div>
      <div className={`h-12 w-12 ${bg} rounded-lg flex items-center justify-center`}>
        <Icon className={`h-6 w-6 ${ic}`} />
      </div>
    </div>
  </div>
);

function App() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [view, setView] = useState('dashboard');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showAdminSubmenu, setShowAdminSubmenu] = useState(false);
  const [recentJobs, setRecentJobs] = useState([]);
  const [comparisonJobs, setComparisonJobs] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error("Error fetching user", err);
      handleLogout();
    }
  };

  const fetchRecentJobs = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/jobs?limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentJobs(res.data.items || []);
    } catch (err) {
      console.error("Error fetching recent jobs", err);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/analytics/data');
      setAnalyticsData(res.data);
    } catch (err) {
      console.error("Error fetching analytics data", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRecentJobs();
      const interval = setInterval(fetchRecentJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    if (token && (view === 'analytics' || view === 'dashboard')) {
      fetchAnalyticsData();
    }
  }, [token, view]);

  const handleLogin = () => window.location.reload();
  const handleLogout = () => { localStorage.removeItem('token'); window.location.reload(); };
  const handleJobCreated = (jobs) => {
    if (jobs?.length === 2) {
      setComparisonJobs(jobs);
      setView('comparison');
    } else {
      setView('history');
    }
  };
  const handleCompare = (jobs) => { setComparisonJobs(jobs); setView('comparison'); };
  const handleViewProducts = (job) => { setSelectedJob(job); setView('products'); };

  if (!token || view === 'login') {
    if (view === 'register') {
      return <Register key="register" onRegister={handleLogin} onSwitchToLogin={() => window.location.reload()} />;
    }
    return <Login key="login" onLogin={handleLogin} onSwitchToRegister={() => setView('register')} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Scraping Jobs', icon: Play },
    { id: 'scrapers', label: 'Scrapers', icon: SettingsIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History', icon: History },
    { id: 'scheduler', label: 'Scheduler', icon: Calendar },
    {
      id: 'admin',
      label: 'Admin',
      icon: Shield,
      submenu: [
        { id: 'admin-users', label: 'Users', icon: Users },
        { id: 'admin-settings', label: 'Settings', icon: SettingsIcon },
      ]
    },
  ];

  const stats = analyticsData?.aggregate_stats || { total: 0, completed: 0, running: 0, failed: 0, totalItems: 0 };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => setView('dashboard')} className="flex items-center hover:opacity-80 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#4f46e5">
                  <path d="M480-200q66 0 113-47t47-113v-160q0-66-47-113t-113-47q-66 0-113 47t-47 113v160q0 66 47 113t113 47Zm-80-120h160v-80H400v80Zm0-160h160v-80H400v80Zm80 40Zm0 320q-65 0-120.5-32T272-240H160v-80h84q-3-20-3.5-40t-.5-40h-80v-80h80q0-20 .5-40t3.5-40h-84v-80h112q14-23 31.5-43t40.5-35l-64-66 56-56 86 86q28-9 57-9t57 9l88-86 56 56-66 66q23 15 41.5 34.5T688-640h112v80h-84q3 20 3.5 40t.5 40h80v80h-80q0 20-.5 40t-3.5 40h84v80H688q-32 56-87.5 88T480-120ZM40-720v-120q0-33 23.5-56.5T120-920h120v80H120v120H40ZM240-40H120q-33 0-56.5-23.5T40-120v-120h80v120h120v80Zm480 0v-80h120v-120h80v120q0 33-23.5 56.5T840-40H720Zm120-680v-120H720v-80h120q33 0 56.5 23.5T920-840v120h-80Z"/>
                </svg>
                <span className="ml-2 text-xl font-bold text-gray-800">ScraperPro</span>
              </button>
            </div>
            <div className="flex items-center">
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    onBlur={() => setTimeout(() => setShowUserMenu(false), 200)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {user.profile_image ? (
                      <img src={user.profile_image} alt="Profile" className="h-8 w-8 rounded-full object-cover border border-gray-300" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700">{user.username}</span>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.username}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { setView('account'); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Account Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className="w-20 hover:w-64 bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto overflow-x-hidden transition-all duration-300 z-40 group peer">
          <nav className="px-3 py-4 flex flex-col gap-2 relative">
            {menuItems.filter(item => item.id !== 'admin' || user?.role === 'admin').map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id || item.submenu?.some(sub => view === sub.id);
              return (
                <div key={item.id} className="relative">
                  <button
                    onClick={() => item.submenu ? setShowAdminSubmenu(!showAdminSubmenu) : setView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-base font-medium rounded-md transition-colors ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <div className="flex items-center">
                      <Icon className={`h-6 w-6 min-w-[1.5rem] ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                        {item.label}
                      </span>
                    </div>
                    {item.submenu && (
                      <ChevronRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-all duration-300 ${showAdminSubmenu ? 'rotate-90' : ''}`} />
                    )}
                  </button>

                  {item.submenu && (
                    <div className={`absolute left-0 right-0 top-full ml-6 mt-1 space-y-1 opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden z-10 ${showAdminSubmenu ? 'max-h-40' : 'max-h-0'}`}>
                      {item.submenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = view === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => setView(subItem.id)}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isSubActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                          >
                            <SubIcon className={`h-5 w-5 min-w-[1.25rem] ${isSubActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className="ml-2 whitespace-nowrap overflow-hidden">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 ml-20 peer-hover:ml-64 p-6 transition-all duration-300">
          {view === 'dashboard' && user && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Jobs"  value={stats.total}     icon={Play}        bg="bg-indigo-100" ic="text-indigo-600" />
                <StatCard label="Completed"   value={stats.completed} icon={CheckCircle} bg="bg-green-100"  ic="text-green-600" />
                <StatCard label="Running"     value={stats.running}   icon={Clock}       bg="bg-blue-100"   ic="text-blue-600" />
                <StatCard label="Total Items" value={stats.totalItems} icon={TrendingUp}  bg="bg-purple-100" ic="text-purple-600" />
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
                </div>
                <div className="p-6">
                  {recentJobs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No jobs yet. Create your first scrape!</p>
                  ) : (
                    <div className="space-y-3">
                      {recentJobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer" onClick={() => handleViewProducts(job)}>
                          <div className="flex items-center space-x-3">
                            <div className={`h-2 w-2 rounded-full ${job.status === 'completed' ? 'bg-green-500' : job.status === 'running' ? 'bg-blue-500' : job.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                            <div>
                              <p className="text-sm font-medium text-gray-900 capitalize">{job.site} - {job.query}</p>
                              <p className="text-xs text-gray-500">{new Date(job.start_time).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{job.total_items} items</p>
                            <p className="text-xs text-gray-500 capitalize">{job.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button onClick={() => setView('scrapers')} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-6 text-left transition-colors">
                  <Play className="h-8 w-8 mb-2" />
                  <h3 className="text-lg font-semibold">New Scrape Job</h3>
                  <p className="text-sm text-indigo-100 mt-1">Start scraping Jumia or Kilimall</p>
                </button>
                <button onClick={() => setView('scheduler')} className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-6 text-left transition-colors">
                  <Calendar className="h-8 w-8 mb-2" />
                  <h3 className="text-lg font-semibold">Schedule Job</h3>
                  <p className="text-sm text-purple-100 mt-1">Automate your scraping tasks</p>
                </button>
              </div>
            </div>
          )}

          {view === 'jobs' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Scraping Jobs</h2>
              <ScheduledJobsList token={token} />
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Past Jobs</h3>
                <PastScheduledJobsTable token={token} onViewProducts={handleViewProducts} />
              </div>
              <div className="mt-8">
                <JobsSummaryTable token={token} />
              </div>
            </div>
          )}

          {view === 'scrapers' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Scrapers</h2>
              <JobControl onJobCreated={handleJobCreated} onCancel={() => setView('dashboard')} />
            </div>
          )}

          {view === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Jobs"        value={stats.total}     icon={Play}       bg="bg-indigo-100" ic="text-indigo-600" />
                <StatCard label="Products Scraped"  value={stats.totalItems} icon={Package}   bg="bg-blue-100"   ic="text-blue-600" />
                <StatCard label="Failed Jobs"       value={stats.failed}    icon={Package}    bg="bg-red-100"    ic="text-red-600" />
                <StatCard label="Total Items"       value={stats.totalItems} icon={TrendingUp} bg="bg-purple-100" ic="text-purple-600" />
              </div>
              <AnalyticsCharts data={analyticsData} />
            </div>
          )}

          {view === 'scheduler' && <Scheduler token={token} />}

          {view === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">History</h2>
                <button
                  onClick={() => setView('comparison-picker')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Scale className="h-4 w-4 mr-2" />
                  Comparison
                </button>
              </div>
              <JobsList token={token} onViewProducts={handleViewProducts} />
            </div>
          )}

          {view === 'admin-users' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
              <UserManagementTable token={token} />
            </div>
          )}

          {view === 'admin-settings' && <Settings token={token} />}


          {view === 'comparison-picker' && (
            <ComparisonPicker token={token} onCompare={handleCompare} onBack={() => setView('history')} />
          )}

          {view === 'comparison' && comparisonJobs && (
            <PriceComparison jobs={comparisonJobs} token={token} onBack={() => setView('history')} />
          )}

          {view === 'products' && selectedJob && (
            <ProductTable job={selectedJob} onBack={() => setView('dashboard')} />
          )}

          {view === 'account' && (
            <AccountSettings token={token} user={user} onUserUpdate={setUser} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
