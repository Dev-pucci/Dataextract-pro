import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import { ExternalLink } from 'lucide-react';

const SITES = ['jumia', 'kilimall'];

// Site hues match the badges in PriceComparison, and are validated for
// colour-vision deficiency separation against the card surface.
const SITE_COLOR = { jumia: '#ea580c', kilimall: '#2563eb' };

const axisTick = { fill: '#6b7280', fontSize: 11 };

// Axis titles wear text tokens, never a series colour. The y offset keeps the
// rotated text clear of the left edge, which otherwise clips it in half.
const axisLabel = (value, axis) => (axis === 'x'
    ? { value, position: 'insideBottom', offset: -12, fill: '#6b7280', fontSize: 11 }
    : { value, angle: -90, position: 'insideLeft', offset: 12, style: { textAnchor: 'middle' }, fill: '#6b7280', fontSize: 11 });
const noData = (msg) => <div className="text-center text-gray-500 py-8">{msg}</div>;

const kes = (v) => `KES ${Math.round(v).toLocaleString()}`;
const compact = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`);
const capitalize = (v) => v.charAt(0).toUpperCase() + v.slice(1);
// The API sends UTC-marked ISO; let the browser render it in local time.
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : '');
const pctLabel = (v) => (v == null ? '' : `${Math.abs(v).toFixed(1)}%`);

const Card = ({ title, subtitle, right, children }) => (
    <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4 gap-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {right}
        </div>
        {children}
    </div>
);

const Th = ({ children, right, w = '' }) => (
    <th className={`px-4 py-3 ${right ? 'text-right' : 'text-left'} ${w}`}>{children}</th>
);

const thead = "bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";

// Identity comes from a coloured dot beside the name, never from coloured text.
const SiteTag = ({ site }) => (
    <span className="inline-flex items-center gap-1.5 text-gray-700">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SITE_COLOR[site] }} />
        <span className="capitalize">{site}</span>
    </span>
);

const SiteLegend = () => (
    <div className="flex items-center gap-4 text-xs">
        {SITES.map(s => <SiteTag key={s} site={s} />)}
    </div>
);

// Rendered in more than one card, but always bound to the same selection, so
// the whole page follows one product rather than drifting out of sync.
const ProductPicker = ({ value, onChange, options }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 capitalize focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Choose a product"
    >
        {options.map(q => <option key={q} value={q} className="capitalize">{q}</option>)}
    </select>
);

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-xs space-y-1">
            <div className="text-gray-500">{label}</div>
            {payload.map(p => (
                <div key={p.dataKey} className="flex items-center gap-3 text-gray-900">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="capitalize">{p.dataKey}</span>
                    <span className="ml-auto font-medium tabular-nums">
                        {p.value == null ? '—' : kes(p.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

const SavingsTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-xs">
            <div className="text-gray-500 mb-1 capitalize">{label}</div>
            <div className="flex items-center gap-2 text-gray-900">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SITE_COLOR[row.cheaper] }} />
                <span className="capitalize">{row.cheaper}</span>
                <span className="ml-auto font-medium tabular-nums">
                    {Math.abs(row.signed).toFixed(1)}% cheaper
                </span>
            </div>
        </div>
    );
};

const DistributionTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-xs space-y-1">
            <div className="text-gray-500">KES {row.lo.toLocaleString()} – {row.hi.toLocaleString()}</div>
            {payload.map(p => (
                <div key={p.dataKey} className="flex items-center gap-3 text-gray-900">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="capitalize">{p.dataKey}</span>
                    <span className="ml-auto font-medium tabular-nums">{p.value}% of listings</span>
                </div>
            ))}
        </div>
    );
};

// The four price stats the breakdown charts, in axis order.
const STATS = [
    ['Lowest', 'min'],
    ['Median', 'median'],
    ['Average', 'avg'],
    ['Highest', 'max'],
];

// Data is fetched once by App (it also feeds the dashboard stat cards) and
// passed in, rather than fetched again here — see App's fetchAnalyticsData.
const Analytics = ({ data }) => {
    const [selectedQuery, setSelectedQuery] = useState('');

    if (!data) return <div className="flex items-center justify-center h-64 text-gray-500">Loading analytics...</div>;

    const {
        site_comparison, price_distribution, cheapest_by_query,
        scraper_health, recent_failures
    } = data;

    const productOptions = site_comparison.map(r => r.query);
    const selected = site_comparison.find(r => r.query === selectedQuery) ?? site_comparison[0] ?? null;
    const cheapest = (selected && cheapest_by_query[selected.query]) || [];
    const distribution = (selected && price_distribution[selected.query]) || [];

    // Diverging: Jumia's lead runs left (negative), Kilimall's right. Sorted by
    // the signed value so the chart fans out from the middle.
    const savings = site_comparison
        .map(r => {
            const signed = (r.cheaper === 'jumia' ? -1 : 1) * Math.abs(r.diff_pct);
            return {
                query: r.query,
                cheaper: r.cheaper,
                signed,
                jumia: r.cheaper === 'jumia' ? signed : null,
                kilimall: r.cheaper === 'kilimall' ? signed : null,
            };
        })
        .sort((a, b) => a.signed - b.signed);

    // Symmetric axis, so a given bar length means the same on either side.
    const savingsAxis = savings.length
        ? Math.ceil(Math.max(...savings.map(s => Math.abs(s.signed))) / 10) * 10
        : 10;
    const breakdown = selected
        ? STATS.map(([stat, key]) => {
            const point = { stat };
            for (const site of SITES) point[site] = selected[site][key];
            // Marks the cheaper side on each stat; colour follows the site, so the
            // emphasis has to ride the text instead.
            point.cheaper = point.jumia <= point.kilimall ? 'jumia' : 'kilimall';
            return point;
        })
        : [];

    return (
        <div className="space-y-6">
            {/* --- The headline: which site is actually cheaper --- */}
            <Card
                title="Site Comparison by Query"
                right={<SiteLegend />}
            >
                {site_comparison.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className={thead}>
                                    <Th>Query</Th>
                                    <Th right>Jumia median</Th>
                                    <Th right>Kilimall median</Th>
                                    <Th>Cheaper</Th>
                                    <Th right>Difference</Th>
                                    <Th right>Products</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {site_comparison.map((row) => (
                                    <tr key={row.query} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 capitalize">{row.query}</td>
                                        {SITES.map(s => (
                                            <td
                                                key={s}
                                                className={`px-4 py-3 text-right tabular-nums ${
                                                    row.cheaper === s ? 'font-semibold text-gray-900' : 'text-gray-500'
                                                }`}
                                                title={`avg ${kes(row[s].avg)} · low ${kes(row[s].min)} · ${row[s].count} products`}
                                            >
                                                {kes(row[s].median)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3"><SiteTag site={row.cheaper} /></td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                                            {row.diff_pct}%
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                                            {row.total_products.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : noData('Scrape the same query on both sites to compare them')}
            </Card>

            {/* --- The same comparison, read in one glance instead of six rows --- */}
            <Card
                title="Savings by Product"
                subtitle="How much cheaper the site is, on median price."
                right={<SiteLegend />}
            >
                {savings.length > 0 ? (
                    <ResponsiveContainer width="100%" height={40 * savings.length + 76}>
                        <BarChart data={savings} layout="vertical" margin={{ top: 8, right: 48, bottom: 24, left: 8 }}>
                            <XAxis
                                type="number"
                                domain={[-savingsAxis, savingsAxis]}
                                tick={axisTick}
                                tickFormatter={(v) => `${Math.abs(v)}%`}
                                label={axisLabel('Price difference (%)', 'x')}
                            />
                            <YAxis
                                type="category"
                                dataKey="query"
                                tick={axisTick}
                                width={116}
                                tickFormatter={capitalize}
                                label={axisLabel('Product', 'y')}
                            />
                            <ReferenceLine x={0} stroke="#d1d5db" />
                            <Tooltip content={<SavingsTooltip />} cursor={{ fill: '#f9fafb' }} />
                            <Bar dataKey="jumia" stackId="a" fill={SITE_COLOR.jumia} radius={[4, 0, 0, 4]} maxBarSize={24}>
                                <LabelList dataKey="jumia" position="left" formatter={pctLabel} fill="#374151" fontSize={11} />
                            </Bar>
                            <Bar dataKey="kilimall" stackId="a" fill={SITE_COLOR.kilimall} radius={[0, 4, 4, 0]} maxBarSize={24}>
                                <LabelList dataKey="kilimall" position="right" formatter={pctLabel} fill="#374151" fontSize={11} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : noData('Scrape the same query on both sites to compare them')}
            </Card>

            {/* --- Per-product price breakdown, both sites side by side --- */}
            <Card
                title="Product Price Breakdown"
                right={
                    <div className="flex items-center gap-4">
                        <SiteLegend />
                        {selected && (
                            <ProductPicker value={selected.query} onChange={setSelectedQuery} options={productOptions} />
                        )}
                    </div>
                }
            >
                {selected ? (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <div className="text-sm font-medium text-gray-700 mb-2">Price summary</div>
                                <ResponsiveContainer width="100%" height={308}>
                                    <BarChart data={breakdown} barGap={2} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
                                        <XAxis dataKey="stat" tick={axisTick} label={axisLabel('Price statistic', 'x')} />
                                        <YAxis tick={axisTick} width={72} tickFormatter={compact} label={axisLabel('Price (KES)', 'y')} />
                                        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
                                        {SITES.map(s => (
                                            <Bar key={s} dataKey={s} fill={SITE_COLOR[s]} radius={[4, 4, 0, 0]} maxBarSize={24} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-gray-700 mb-2">Where the listings sit</div>
                                {distribution.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={308}>
                                        <BarChart data={distribution} barGap={2} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
                                            <XAxis dataKey="range" tick={axisTick} label={axisLabel('Price band (KES)', 'x')} />
                                            <YAxis tick={axisTick} width={72} tickFormatter={(v) => `${v}%`} label={axisLabel('Share of listings (%)', 'y')} />
                                            <Tooltip content={<DistributionTooltip />} cursor={{ fill: '#f9fafb' }} />
                                            {SITES.map(s => (
                                                <Bar key={s} dataKey={s} fill={SITE_COLOR[s]} radius={[4, 4, 0, 0]} maxBarSize={24} />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : noData('Not enough price spread to chart')}
                            </div>
                        </div>

                        {/* Table twin: every charted value readable without hovering */}
                        <div className="overflow-x-auto mt-6">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={thead}>
                                        <Th>Site</Th>
                                        {breakdown.map(b => <Th key={b.stat} right>{b.stat}</Th>)}
                                        <Th right>Listings</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {SITES.map(s => (
                                        <tr key={s} className="hover:bg-gray-50">
                                            <td className="px-4 py-3"><SiteTag site={s} /></td>
                                            {breakdown.map(b => (
                                                <td
                                                    key={b.stat}
                                                    className={`px-4 py-3 text-right tabular-nums ${
                                                        b.cheaper === s ? 'font-semibold text-gray-900' : 'text-gray-500'
                                                    }`}
                                                >
                                                    {kes(b[s])}
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                                                {selected[s].count.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : noData('Scrape the same query on both sites to compare them')}
            </Card>

            {/* --- Cheapest, not most expensive, and scoped to one product --- */}
            <Card
                title="Cheapest Finds"
                right={selected && (
                    <ProductPicker value={selected.query} onChange={setSelectedQuery} options={productOptions} />
                )}
            >
                {cheapest.length > 0 ? (
                    <div className="overflow-x-auto">
                        {/* table-fixed: without it the cells size to their content, so a long
                            title widens its column and runs under the ones beside it. */}
                        <table className="w-full text-sm table-fixed min-w-[46rem]">
                            <thead>
                                <tr className={thead}>
                                    <Th w="w-12">#</Th>
                                    <Th>Product</Th>
                                    <Th w="w-32">Site</Th>
                                    <Th right w="w-28">Price</Th>
                                    <Th w="w-36">Scraped At</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cheapest.map((p, i) => (
                                    <tr key={`${p.title}-${p.site}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                                        <td className="px-4 py-3">
                                            {p.url ? (
                                                <a
                                                    href={p.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-gray-900 hover:text-indigo-600 flex items-center gap-1 group"
                                                    title={p.title}
                                                >
                                                    <span className="truncate min-w-0">{p.title}</span>
                                                    <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
                                                </a>
                                            ) : (
                                                <span className="text-gray-900 truncate block" title={p.title}>{p.title}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3"><SiteTag site={p.site} /></td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{kes(p.price)}</td>
                                        <td className="px-4 py-3 text-gray-500">{fmtDateTime(p.scraped_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : noData('No product data for this selection')}
            </Card>

            {/* --- Scraper health --- */}
            <Card title="Scraper Health">
                {scraper_health.length > 0 ? (
                    <div className="space-y-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={thead}>
                                        <Th>Site</Th>
                                        <Th right>Jobs</Th>
                                        <Th right>Completed</Th>
                                        <Th right>Failed</Th>
                                        <Th right>Success rate</Th>
                                        <Th right>Median time</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {scraper_health.map((s) => (
                                        <tr key={s.site} className="hover:bg-gray-50">
                                            <td className="px-4 py-3"><SiteTag site={s.site} /></td>
                                            <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{s.jobs}</td>
                                            <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{s.completed}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-gray-700">{s.failed}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                                                {s.success_rate == null ? '—' : `${s.success_rate}%`}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                                                {s.median_seconds == null ? '—' : `${s.median_seconds}s`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {recent_failures.length > 0 && (
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Recent failures</div>
                                <ul className="space-y-2">
                                    {recent_failures.map((f, i) => (
                                        <li key={i} className="text-sm flex items-start gap-3 bg-red-50 rounded-md px-3 py-2">
                                            <SiteTag site={f.site} />
                                            <span className="text-gray-700 capitalize">{f.query}</span>
                                            <span className="text-gray-600 truncate flex-1" title={f.error}>{f.error}</span>
                                            <span className="text-gray-400 shrink-0">{fmtDateTime(f.when)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : noData('No jobs run yet')}
            </Card>

        </div>
    );
};

export default Analytics;
