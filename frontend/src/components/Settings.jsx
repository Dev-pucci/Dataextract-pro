import React, { useState } from 'react';
import { Save, Server, Database, Mail, Shield } from 'lucide-react';

const Settings = ({ token }) => {
    const [settings, setSettings] = useState({
        apiEndpoint: 'http://localhost:8000',
        maxConcurrentJobs: 5,
        defaultMaxProducts: 10,
        emailNotifications: true,
        securityLevel: 'medium'
    });

    const [saved, setSaved] = useState(false);

    const handleChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = () => {
        // In a real implementation, this would save to backend
        console.log('Saving settings:', settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
                <p className="text-gray-600 mt-1">Configure system-wide settings for ScraperPro</p>
            </div>

            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Server className="h-5 w-5 mr-2 text-indigo-600" />
                        API Settings
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Endpoint
                        </label>
                        <input
                            type="text"
                            value={settings.apiEndpoint}
                            onChange={(e) => handleChange('apiEndpoint', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">The base URL for the ScraperPro API</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Database className="h-5 w-5 mr-2 text-indigo-600" />
                        Scraping Settings
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Concurrent Jobs
                        </label>
                        <input
                            type="number"
                            value={settings.maxConcurrentJobs}
                            onChange={(e) => handleChange('maxConcurrentJobs', parseInt(e.target.value))}
                            min="1"
                            max="20"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Number of jobs that can run simultaneously</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Max Products
                        </label>
                        <input
                            type="number"
                            value={settings.defaultMaxProducts}
                            onChange={(e) => handleChange('defaultMaxProducts', parseInt(e.target.value))}
                            min="1"
                            max="1000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Default maximum products to scrape per job</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Mail className="h-5 w-5 mr-2 text-indigo-600" />
                        Notifications
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Email Notifications
                            </label>
                            <p className="text-xs text-gray-500 mt-1">Receive email updates on job completion</p>
                        </div>
                        <button
                            onClick={() => handleChange('emailNotifications', !settings.emailNotifications)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings.emailNotifications ? 'bg-indigo-600' : 'bg-gray-200'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-indigo-600" />
                        Security
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Security Level
                        </label>
                        <select
                            value={settings.securityLevel}
                            onChange={(e) => handleChange('securityLevel', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="low">Low - Minimal restrictions</option>
                            <option value="medium">Medium - Balanced security</option>
                            <option value="high">High - Maximum security</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Controls rate limiting and access restrictions</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    onClick={handleSave}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                </button>
            </div>

            {saved && (
                <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Settings saved successfully!
                </div>
            )}
        </div>
    );
};

export default Settings;
