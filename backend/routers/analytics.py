"""
Analytics and statistics endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from database import get_db
from models import User, ScrapeJob, Product, JobStatus
from auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/data")
async def get_analytics_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_user.role == 'admin'

    # --- Aggregate stats ---
    if is_admin:
        total_items_result = await db.execute(select(func.sum(ScrapeJob.total_items)))
        total_jobs_result = await db.execute(select(func.count(ScrapeJob.id)))
        status_counts_result = await db.execute(
            select(ScrapeJob.status, func.count(ScrapeJob.id)).group_by(ScrapeJob.status)
        )
    else:
        total_items_result = await db.execute(
            select(func.sum(ScrapeJob.total_items)).where(ScrapeJob.user_id == current_user.id)
        )
        total_jobs_result = await db.execute(
            select(func.count(ScrapeJob.id)).where(ScrapeJob.user_id == current_user.id)
        )
        status_counts_result = await db.execute(
            select(ScrapeJob.status, func.count(ScrapeJob.id))
            .where(ScrapeJob.user_id == current_user.id)
            .group_by(ScrapeJob.status)
        )

    total_items = total_items_result.scalar() or 0
    total_jobs = total_jobs_result.scalar() or 0
    total_completed = total_failed = total_running = 0
    for status, count in status_counts_result:
        if status == JobStatus.COMPLETED:
            total_completed = count
        elif status == JobStatus.FAILED:
            total_failed = count
        elif status == JobStatus.RUNNING:
            total_running = count

    # --- Top 10 products by price (across all sites) ---
    if is_admin:
        top_products_result = await db.execute(
            select(
                Product.title,
                func.max(Product.price).label('price'),
                ScrapeJob.site,
                func.max(Product.scraped_at).label('scraped_at')
            )
            .join(ScrapeJob, Product.job_id == ScrapeJob.id)
            .where(Product.price.isnot(None))
            .group_by(Product.title, ScrapeJob.site)
            .order_by(func.max(Product.price).desc())
            .limit(10)
        )
    else:
        top_products_result = await db.execute(
            select(
                Product.title,
                func.max(Product.price).label('price'),
                ScrapeJob.site,
                func.max(Product.scraped_at).label('scraped_at')
            )
            .join(ScrapeJob, Product.job_id == ScrapeJob.id)
            .where(Product.price.isnot(None), ScrapeJob.user_id == current_user.id)
            .group_by(Product.title, ScrapeJob.site)
            .order_by(func.max(Product.price).desc())
            .limit(10)
        )
    top_products = [
        {
            'title': row.title,
            'price': float(row.price),
            'site': row.site.capitalize(),
            'scraped_at': row.scraped_at.strftime('%Y-%m-%d %H:%M') if row.scraped_at else ''
        }
        for row in top_products_result
    ]

    # --- Price range distribution ---
    price_range_expr = case(
        (Product.price < 1000, 'Under 1K'),
        (Product.price < 5000, '1K - 5K'),
        (Product.price < 10000, '5K - 10K'),
        (Product.price < 50000, '10K - 50K'),
        else_='Over 50K'
    )
    if is_admin:
        price_ranges_result = await db.execute(
            select(price_range_expr.label('range'), func.count(Product.id).label('count'))
            .join(ScrapeJob, Product.job_id == ScrapeJob.id)
            .where(Product.price.isnot(None))
            .group_by(price_range_expr)
        )
    else:
        price_ranges_result = await db.execute(
            select(price_range_expr.label('range'), func.count(Product.id).label('count'))
            .join(ScrapeJob, Product.job_id == ScrapeJob.id)
            .where(Product.price.isnot(None), ScrapeJob.user_id == current_user.id)
            .group_by(price_range_expr)
        )
    range_order = ['Under 1K', '1K - 5K', '5K - 10K', '10K - 50K', 'Over 50K']
    raw_ranges = {row.range: row.count for row in price_ranges_result}
    price_ranges = [{'range': r, 'count': raw_ranges.get(r, 0)} for r in range_order]

    # --- Scrape activity over last 30 days ---
    if is_admin:
        activity_result = await db.execute(
            select(
                func.strftime('%Y-%m-%d', ScrapeJob.start_time).label('date'),
                func.count(ScrapeJob.id).label('jobs')
            )
            .group_by(func.strftime('%Y-%m-%d', ScrapeJob.start_time))
            .order_by(func.strftime('%Y-%m-%d', ScrapeJob.start_time))
            .limit(30)
        )
    else:
        activity_result = await db.execute(
            select(
                func.strftime('%Y-%m-%d', ScrapeJob.start_time).label('date'),
                func.count(ScrapeJob.id).label('jobs')
            )
            .where(ScrapeJob.user_id == current_user.id)
            .group_by(func.strftime('%Y-%m-%d', ScrapeJob.start_time))
            .order_by(func.strftime('%Y-%m-%d', ScrapeJob.start_time))
            .limit(30)
        )
    activity_over_time = [{'date': row.date, 'jobs': row.jobs} for row in activity_result]

    # --- Most searched queries (top 8 by total items scraped) ---
    if is_admin:
        queries_result = await db.execute(
            select(
                ScrapeJob.query,
                ScrapeJob.site,
                func.count(ScrapeJob.id).label('job_count'),
                func.sum(ScrapeJob.total_items).label('total_items')
            )
            .group_by(ScrapeJob.query, ScrapeJob.site)
            .order_by(func.sum(ScrapeJob.total_items).desc())
            .limit(8)
        )
    else:
        queries_result = await db.execute(
            select(
                ScrapeJob.query,
                ScrapeJob.site,
                func.count(ScrapeJob.id).label('job_count'),
                func.sum(ScrapeJob.total_items).label('total_items')
            )
            .where(ScrapeJob.user_id == current_user.id)
            .group_by(ScrapeJob.query, ScrapeJob.site)
            .order_by(func.sum(ScrapeJob.total_items).desc())
            .limit(8)
        )
    top_queries = [
        {
            'query': row.query,
            'site': row.site.capitalize(),
            'job_count': row.job_count,
            'total_items': row.total_items or 0
        }
        for row in queries_result
    ]

    return {
        "aggregate_stats": {
            "total": total_jobs,
            "completed": total_completed,
            "failed": total_failed,
            "running": total_running,
            "totalItems": total_items
        },
        "top_products": top_products,
        "price_ranges": price_ranges,
        "activity_over_time": activity_over_time,
        "top_queries": top_queries
    }
