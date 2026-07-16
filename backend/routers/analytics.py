"""
Analytics and statistics endpoints
"""
from datetime import timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from collections import defaultdict
from statistics import median

from database import get_db
from models import User, ScrapeJob, Product, JobStatus
from auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

SITES = ("jumia", "kilimall")


def _utc_iso(dt):
    """Stored datetimes are naive UTC; emit them tagged so the client shows
    local time rather than reading UTC as local. See schemas._utc_iso."""
    return dt.replace(tzinfo=timezone.utc).isoformat() if dt else None


def _scope(stmt, user: User):
    """Admins see every job, everyone else only their own."""
    if user.role == 'admin':
        return stmt
    return stmt.where(ScrapeJob.user_id == user.id)


DISTRIBUTION_BINS = 6


def _short_price(value):
    return f"{value / 1000:.1f}k" if value >= 1000 else f"{value:.0f}"


def _distribute(prices_by_site):
    """Bin each site's prices onto a shared scale, as a share of that site's listings.

    Shares rather than counts, because one site routinely has ten times the
    listings of the other and raw counts would only ever show that.

    The top of the scale is the 95th percentile, not the maximum: a single
    absurdly priced listing would otherwise squeeze every real product into
    the first bin. Prices beyond either end are clamped into the end bins, so
    nothing is dropped and the shares still total 100%.
    """
    everything = sorted(p for prices in prices_by_site.values() for p in prices)
    if not everything:
        return []

    lo = everything[0]
    hi = everything[min(len(everything) - 1, int(len(everything) * 0.95))]
    if hi <= lo:
        hi = everything[-1]
    if hi <= lo:
        return []

    width = (hi - lo) / DISTRIBUTION_BINS
    bins = []
    for i in range(DISTRIBUTION_BINS):
        bin_lo = lo + i * width
        bin_hi = bin_lo + width
        last = i == DISTRIBUTION_BINS - 1
        bins.append({
            'range': _short_price(bin_lo) + ('+' if last else ''),
            'lo': round(bin_lo, 2),
            'hi': round(everything[-1] if last else bin_hi, 2),
        })

    for site, prices in prices_by_site.items():
        counts = [0] * DISTRIBUTION_BINS
        for price in prices:
            index = int((price - lo) / width)
            counts[max(0, min(DISTRIBUTION_BINS - 1, index))] += 1
        for i, count in enumerate(counts):
            bins[i][site] = round(count / len(prices) * 100, 1)

    return bins


def _summarize(prices):
    """Count and price stats for one site's products.

    Median is reported alongside the average because search results routinely
    include a few wildly priced items that drag the average around.
    """
    return {
        'count': len(prices),
        'avg': round(sum(prices) / len(prices), 2),
        'median': round(median(prices), 2),
        'min': round(min(prices), 2),
        'max': round(max(prices), 2),
    }


@router.get("/data")
async def get_analytics_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # --- Aggregate stats ---
    total_items = (await db.execute(
        _scope(select(func.sum(ScrapeJob.total_items)), current_user)
    )).scalar() or 0
    total_jobs = (await db.execute(
        _scope(select(func.count(ScrapeJob.id)), current_user)
    )).scalar() or 0
    status_counts = await db.execute(
        _scope(select(ScrapeJob.status, func.count(ScrapeJob.id)), current_user)
        .group_by(ScrapeJob.status)
    )

    total_completed = total_failed = total_running = 0
    for status, count in status_counts:
        if status == JobStatus.COMPLETED:
            total_completed = count
        elif status == JobStatus.FAILED:
            total_failed = count
        elif status == JobStatus.RUNNING:
            total_running = count

    # --- Prices, grouped per query and site for the comparison view ---
    price_rows = (await db.execute(
        _scope(
            select(ScrapeJob.query, ScrapeJob.site, Product.price)
            .join(ScrapeJob, Product.job_id == ScrapeJob.id)
            .where(Product.price > 0),
            current_user
        )
    )).all()

    by_query_site = defaultdict(list)
    for query, site, price in price_rows:
        by_query_site[(query, site)].append(price)

    # --- Site comparison: only queries that ran on every site are comparable ---
    comparable = [
        query for query in {q for q, _ in by_query_site}
        if all((query, site) in by_query_site for site in SITES)
    ]

    site_comparison = []
    for query in comparable:
        entry = {'query': query}
        for site in SITES:
            entry[site] = _summarize(by_query_site[(query, site)])

        # Compare on median rather than average, for the reason in _summarize.
        medians = {site: entry[site]['median'] for site in SITES}
        cheaper = min(medians, key=medians.get)
        dearer = max(medians, key=medians.get)
        entry['cheaper'] = cheaper
        entry['diff_pct'] = (
            round((medians[cheaper] - medians[dearer]) / medians[dearer] * 100, 1)
            if medians[dearer] else 0
        )
        entry['total_products'] = sum(entry[site]['count'] for site in SITES)
        site_comparison.append(entry)

    site_comparison.sort(key=lambda e: e['total_products'], reverse=True)

    # --- Price distribution per query, following the comparison order ---
    price_distribution = {
        entry['query']: _distribute({site: by_query_site[(entry['query'], site)] for site in SITES})
        for entry in site_comparison
    }

    # --- Cheapest products per query, deduped by title so one item isn't
    # listed once per scrape. Rows arrive cheapest-first, so filling each
    # query's bucket in order leaves the ten cheapest of that query. ---
    cheapest_result = await db.execute(
        _scope(
            select(
                ScrapeJob.query,
                Product.title,
                func.min(Product.price).label('price'),
                ScrapeJob.site,
                Product.url,
                Product.scraped_at
            )
            .join(ScrapeJob, Product.job_id == ScrapeJob.id)
            .where(Product.price > 0),
            current_user
        )
        .group_by(ScrapeJob.query, Product.title, ScrapeJob.site)
        .order_by(func.min(Product.price))
    )

    cheapest_by_query = defaultdict(list)
    for row in cheapest_result:
        bucket = cheapest_by_query[row.query]
        if len(bucket) < 10:
            bucket.append({
                'title': row.title,
                'price': float(row.price),
                'site': row.site,
                'url': row.url,
                'scraped_at': _utc_iso(row.scraped_at)
            })

    # --- Scraper health ---
    health_rows = (await db.execute(
        _scope(
            select(ScrapeJob.site, ScrapeJob.status, ScrapeJob.start_time, ScrapeJob.end_time),
            current_user
        )
    )).all()

    by_site = defaultdict(lambda: {'jobs': 0, 'completed': 0, 'failed': 0, 'durations': []})
    for site, status, start_time, end_time in health_rows:
        stats = by_site[site]
        stats['jobs'] += 1
        if status == JobStatus.COMPLETED:
            stats['completed'] += 1
            if start_time and end_time:
                stats['durations'].append((end_time - start_time).total_seconds())
        elif status == JobStatus.FAILED:
            stats['failed'] += 1

    scraper_health = []
    for site, stats in sorted(by_site.items()):
        finished = stats['completed'] + stats['failed']
        scraper_health.append({
            'site': site,
            'jobs': stats['jobs'],
            'completed': stats['completed'],
            'failed': stats['failed'],
            'success_rate': round(stats['completed'] / finished * 100, 1) if finished else None,
            'median_seconds': round(median(stats['durations']), 1) if stats['durations'] else None
        })

    failures_result = await db.execute(
        _scope(
            select(ScrapeJob.site, ScrapeJob.query, ScrapeJob.error_log, ScrapeJob.start_time)
            .where(ScrapeJob.status == JobStatus.FAILED),
            current_user
        )
        .order_by(ScrapeJob.start_time.desc())
        .limit(5)
    )
    recent_failures = [
        {
            'site': row.site,
            'query': row.query,
            'error': row.error_log or 'Unknown error',
            'when': _utc_iso(row.start_time)
        }
        for row in failures_result
    ]

    return {
        "aggregate_stats": {
            "total": total_jobs,
            "completed": total_completed,
            "failed": total_failed,
            "running": total_running,
            "totalItems": total_items
        },
        "site_comparison": site_comparison,
        "price_distribution": price_distribution,
        "cheapest_by_query": cheapest_by_query,
        "scraper_health": scraper_health,
        "recent_failures": recent_failures
    }
