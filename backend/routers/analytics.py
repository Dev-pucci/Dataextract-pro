"""
Analytics and statistics endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models import User, ScrapeJob, Product, JobStatus
from auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/data")
async def get_analytics_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Admin sees all data, regular users see only their own
    is_admin = current_user.role == 'admin'

    # Get product counts by site
    if is_admin:
        product_counts_result = await db.execute(
            select(ScrapeJob.site, func.count(Product.id).label('count'))
            .join(Product, Product.job_id == ScrapeJob.id)
            .group_by(ScrapeJob.site)
        )
    else:
        product_counts_result = await db.execute(
            select(ScrapeJob.site, func.count(Product.id).label('count'))
            .join(Product, Product.job_id == ScrapeJob.id)
            .where(ScrapeJob.user_id == current_user.id)
            .group_by(ScrapeJob.site)
        )
    product_counts = {row.site.lower(): row.count for row in product_counts_result}

    # Get job success/failure counts by site
    if is_admin:
        job_stats_result = await db.execute(
            select(ScrapeJob.site, ScrapeJob.status, func.count(ScrapeJob.id).label('count'))
            .group_by(ScrapeJob.site, ScrapeJob.status)
        )
    else:
        job_stats_result = await db.execute(
            select(ScrapeJob.site, ScrapeJob.status, func.count(ScrapeJob.id).label('count'))
            .where(ScrapeJob.user_id == current_user.id)
            .group_by(ScrapeJob.site, ScrapeJob.status)
        )
    job_stats = {}
    for row in job_stats_result:
        site = row.site.lower()
        if site not in job_stats:
            job_stats[site] = {'completed': 0, 'failed': 0}
        if row.status == JobStatus.COMPLETED:
            job_stats[site]['completed'] = row.count
        elif row.status == JobStatus.FAILED:
            job_stats[site]['failed'] = row.count

    # Get top 10 products by price for each site
    if is_admin:
        jumia_products_result = await db.execute(
            select(Product.title, Product.price)
            .join(ScrapeJob, Product.job_id == ScrapeJob.id)
            .where(ScrapeJob.site.ilike('%jumia%'))
            .order_by(Product.price.desc())
            .limit(6)
        )
    else:
        jumia_products_result = await db.execute(
            select(Product.title, Product.price)
            .join(ScrapeJob, Product.job_id == ScrapeJob.id)
            .where(ScrapeJob.site.ilike('%jumia%'), ScrapeJob.user_id == current_user.id)
            .order_by(Product.price.desc())
            .limit(6)
        )
    jumia_products = [{'name': row.title[:30] + '...' if len(row.title) > 30 else row.title, 'price': float(row.price)}
                      for row in jumia_products_result]

    if is_admin:
        kilimall_products_result = await db.execute(
            select(Product.title, Product.price)
            .join(ScrapeJob, Product.job_id == ScrapeJob.id)
            .where(ScrapeJob.site.ilike('%kilimall%'))
            .order_by(Product.price.desc())
            .limit(6)
        )
    else:
        kilimall_products_result = await db.execute(
            select(Product.title, Product.price)
            .join(ScrapeJob, Product.job_id == ScrapeJob.id)
            .where(ScrapeJob.site.ilike('%kilimall%'), ScrapeJob.user_id == current_user.id)
            .order_by(Product.price.desc())
            .limit(6)
        )
    kilimall_products = [{'name': row.title[:30] + '...' if len(row.title) > 30 else row.title, 'price': float(row.price)}
                         for row in kilimall_products_result]

    # Calculate aggregate stats
    total_jobs = 0
    total_completed = 0
    total_failed = 0
    total_running = 0
    total_items = 0

    # Get total items
    if is_admin:
        total_items_result = await db.execute(select(func.sum(ScrapeJob.total_items)))
    else:
        total_items_result = await db.execute(
            select(func.sum(ScrapeJob.total_items))
            .where(ScrapeJob.user_id == current_user.id)
        )
    total_items = total_items_result.scalar() or 0

    # Get total jobs count
    if is_admin:
        total_jobs_result = await db.execute(select(func.count(ScrapeJob.id)))
    else:
        total_jobs_result = await db.execute(
            select(func.count(ScrapeJob.id))
            .where(ScrapeJob.user_id == current_user.id)
        )
    total_jobs = total_jobs_result.scalar() or 0

    # Get status counts
    if is_admin:
        status_counts_result = await db.execute(
            select(ScrapeJob.status, func.count(ScrapeJob.id))
            .group_by(ScrapeJob.status)
        )
    else:
        status_counts_result = await db.execute(
            select(ScrapeJob.status, func.count(ScrapeJob.id))
            .where(ScrapeJob.user_id == current_user.id)
            .group_by(ScrapeJob.status)
        )
    for status, count in status_counts_result:
        if status == JobStatus.COMPLETED:
            total_completed = count
        elif status == JobStatus.FAILED:
            total_failed = count
        elif status == JobStatus.RUNNING:
            total_running = count

    return {
        "product_counts": {
            "jumia": product_counts.get('jumia', 0),
            "kilimall": product_counts.get('kilimall', 0)
        },
        "job_stats": {
            "jumia": job_stats.get('jumia', {'completed': 0, 'failed': 0}),
            "kilimall": job_stats.get('kilimall', {'completed': 0, 'failed': 0})
        },
        "aggregate_stats": {
            "total": total_jobs,
            "completed": total_completed,
            "failed": total_failed,
            "running": total_running,
            "totalItems": total_items
        },
        "jumia_products": jumia_products,
        "kilimall_products": kilimall_products
    }
