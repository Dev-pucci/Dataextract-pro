import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Download, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const thCls = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
const tdCls = "px-6 py-4 whitespace-nowrap";
const dlBtnCls = "inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none";
const pageBtnCls = "relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50";
const filterInputCls = "block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";

const PageBtn = ({ onClick, disabled, label, rounded, children }) => (
    <button onClick={onClick} disabled={disabled} className={`${pageBtnCls} ${rounded || ''}`}>
        <span className="sr-only">{label}</span>
        {children}
    </button>
);

const ProductTable = ({ job, onBack }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    useEffect(() => { fetchProducts(); }, [job.id, currentPage]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/jobs/${job.id}/products`, {
                params: { page: currentPage, limit }
            });
            setProducts(res.data.products);
            setTotal(res.data.total);
            setTotalPages(res.data.pages);
        } catch (err) {
            console.error("Error fetching products", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMinPrice = minPrice === '' || p.price >= parseFloat(minPrice);
        const matchesMaxPrice = maxPrice === '' || p.price <= parseFloat(maxPrice);
        return matchesSearch && matchesMinPrice && matchesMaxPrice;
    });

    const handleExport = () => {
        const link = document.createElement("a");
        link.href = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(filteredProducts, null, 2))}`;
        link.download = `scrape_${job.site}_${job.id}.json`;
        link.click();
    };

    const handleExportCSV = () => window.open(`http://localhost:8000/api/jobs/${job.id}/export/csv`, '_blank');

    return (
        <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                        <button onClick={onBack} className="mr-4 text-gray-500 hover:text-gray-700">
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Results for "{job.query}" on {job.site}
                        </h3>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={handleExportCSV} className={dlBtnCls}>
                            <Download className="h-4 w-4 mr-2" />CSV
                        </button>
                        <button onClick={handleExport} className={dlBtnCls}>
                            <Download className="h-4 w-4 mr-2" />JSON
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${filterInputCls} pl-10`}
                        />
                    </div>
                    <input type="number" placeholder="Min price" value={minPrice} onChange={e => setMinPrice(e.target.value)} className={filterInputCls} />
                    <input type="number" placeholder="Max price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={filterInputCls} />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                    Showing {filteredProducts.length} of {products.length} products on this page (Total: {total})
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-gray-500">Loading products...</div>
            ) : (
                <>
                    <div className="flex flex-col">
                        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className={thCls}>Image</th>
                                                <th scope="col" className={thCls}>Title</th>
                                                <th scope="col" className={thCls}>Price</th>
                                                <th scope="col" className={thCls}>Rating</th>
                                                <th scope="col" className={thCls}>Reviews</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredProducts.map((product) => (
                                                <tr key={product.id}>
                                                    <td className={tdCls}>
                                                        {product.image_url
                                                            ? <img className="h-10 w-10 rounded-full object-cover" src={product.image_url} alt="" />
                                                            : <div className="h-10 w-10 rounded-full bg-gray-200" />}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-900 line-clamp-2 max-w-xs" title={product.title}>
                                                            <a href={product.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-600">
                                                                {product.title}
                                                            </a>
                                                        </div>
                                                    </td>
                                                    <td className={tdCls}>
                                                        <div className="text-sm text-gray-900">{product.currency} {product.price.toLocaleString()}</div>
                                                    </td>
                                                    <td className={`${tdCls} text-sm text-gray-500`}>{product.rating || '-'}</td>
                                                    <td className={`${tdCls} text-sm text-gray-500`}>{product.review_count || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-700">
                                Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                            </p>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <PageBtn onClick={() => setCurrentPage(1)} disabled={currentPage === 1} label="First" rounded="rounded-l-md"><ChevronsLeft className="h-5 w-5" /></PageBtn>
                                <PageBtn onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} label="Previous"><ChevronLeft className="h-5 w-5" /></PageBtn>
                                <PageBtn onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} label="Next"><ChevronRight className="h-5 w-5" /></PageBtn>
                                <PageBtn onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} label="Last" rounded="rounded-r-md"><ChevronsRight className="h-5 w-5" /></PageBtn>
                            </nav>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductTable;
