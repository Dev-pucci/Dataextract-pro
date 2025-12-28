import React, { useState } from 'react';
import axios from 'axios';

const JobControl = ({ onJobCreated, onCancel }) => {
    const [site, setSite] = useState('jumia');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('http://localhost:8000/api/jobs', { site, query });
            onJobCreated();
        } catch (err) {
            console.error("Error creating job", err);
            alert("Failed to create job");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow sm:rounded-lg p-6 max-w-lg mx-auto">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Create New Scrape Job</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Target Site</label>
                    <select
                        value={site}
                        onChange={(e) => setSite(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                    >
                        <option value="jumia">Jumia</option>
                        <option value="kilimall">Kilimall</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Search Query</label>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        required
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border p-2"
                        placeholder="e.g. phones, laptops"
                    />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                    >
                        {loading ? 'Starting...' : 'Start Scrape'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default JobControl;
