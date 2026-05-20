import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const SITE = {
    jumia:    { badge: 'bg-orange-100 text-orange-700' },
    kilimall: { badge: 'bg-blue-100 text-blue-700' },
};

const DONE = ['completed', 'failed'];

const PriceComparison = ({ jobs, token, onBack }) => {
    const [statuses, setStatuses] = useState(jobs);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [filter, setFilter] = useState('all');
    const [sortAsc, setSortAsc] = useState(true);

    const headers = { Authorization: `Bearer ${token}` };
    const query = jobs[0]?.query;
    const allDone = statuses.every(j => DONE.includes(j.status));

    useEffect(() => {
        if (allDone) return;
        const interval = setInterval(async () => {
            try {
                const updated = await Promise.all(
                    statuses.map(j =>
                        axios.get(`http://localhost:8000/api/jobs/${j.id}`, { headers }).then(r => r.data)
                    )
                );
                setStatuses(updated);
            } catch (err) {
                console.error('Error polling jobs', err);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [allDone]);

    useEffect(() => {
        if (!allDone) return;
        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                const pages = await Promise.all(
                    statuses
                        .filter(j => j.status === 'completed')
                        .map(j =>
                            axios.get(`http://localhost:8000/api/jobs/${j.id}/products?limit=200`, { headers })
                                .then(r => r.data.products.map(p => ({ ...p, site: j.site })))
                        )
                );
                setProducts(pages.flat());
            } catch (err) {
                console.error('Error fetching products', err);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, [allDone]);

    const counts = { jumia: 0, kilimall: 0 };
    products.forEach(p => { if (counts[p.site] !== undefined) counts[p.site]++; });

    const filtered = products
        .filter(p => filter === 'all' || p.site === filter)
        .sort((a, b) => sortAsc ? a.price - b.price : b.price - a.price);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Price Comparison</h2>
                    <p className="text-sm text-gray-500 mt-0.5">"{query}"</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {statuses.map(j => (
                    <div key={j.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-900 capitalize">{j.site}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{j.total_items} items</p>
                        </div>
                        {DONE.includes(j.status) ? (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${j.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {j.status}
                            </span>
                        ) : (
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                    </div>
                ))}
            </div>

            {!allDone ? (
                <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-400" />
                    <p className="font-medium">Scraping in progress...</p>
                    <p className="text-sm mt-1">Results will load automatically once both jobs finish.</p>
                </div>
            ) : loadingProducts ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading products...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex gap-2">
                            {[
                                { key: 'all',      label: `All (${products.length})` },
                                { key: 'jumia',    label: `Jumia (${counts.jumia})` },
                                { key: 'kilimall', label: `Kilimall (${counts.kilimall})` },
                            ].map(({ key, label }) => (
                                <button key={key} onClick={() => setFilter(key)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setSortAsc(v => !v)}
                            className="text-sm font-medium text-gray-600 hover:text-gray-900">
                            Price {sortAsc ? '↑ Low to High' : '↓ High to Low'}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">Site</th>
                                    <th className="px-6 py-3">Product</th>
                                    <th className="px-6 py-3">Price (KES)</th>
                                    <th className="px-6 py-3">Rating</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No products found</td></tr>
                                ) : filtered.map(p => (
                                    <tr key={`${p.site}-${p.id}`} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${SITE[p.site]?.badge}`}>{p.site}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <a href={p.url} target="_blank" rel="noopener noreferrer"
                                                className="text-indigo-600 hover:underline line-clamp-2 max-w-sm block" title={p.title}>
                                                {p.title}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">
                                            {p.price?.toLocaleString() ?? '—'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{p.rating || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
                        Showing {filtered.length} of {products.length} products
                    </div>
                </div>
            )}
        </div>
    );
};

export default PriceComparison;
