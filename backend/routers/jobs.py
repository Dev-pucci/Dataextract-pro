"""
Job management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
import csv
import io
from datetime import datetime

from database import get_db
from models import ScrapeJob, JobStatus, Product, User
from auth import get_current_user
from services import run_scraper_task, run_paired_scraper_task, BOTH_SITES
from schemas import JobCreate, BothJobCreate, JobResponse, PaginatedJobResponse

router = APIRouter(prefix="/api", tags=["jobs"])


async def _verify_job_ownership(
    job_id: int,
    current_user: User,
    db: AsyncSession
) -> ScrapeJob:
    """Verify job ownership - admin can access all, users only their own or legacy jobs"""
    if current_user.role == 'admin':
        result = await db.execute(
            select(ScrapeJob).where(ScrapeJob.id == job_id)
        )
    else:
        result = await db.execute(
            select(ScrapeJob).where(
                ScrapeJob.id == job_id,
                or_(
                    ScrapeJob.user_id == current_user.id,
                    ScrapeJob.user_id == None
                )
            )
        )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _format_product(p: Product) -> dict:
    """Format product object for API response"""
    return {
        "id": p.id,
        "title": p.title,
        "price": p.price,
        "currency": p.currency,
        "url": p.url,
        "image_url": p.image_url,
        "rating": p.rating,
        "review_count": p.review_count
    }


@router.post("/jobs", response_model=JobResponse)
async def create_job(
    job: JobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_job = ScrapeJob(
        site=job.site,
        query=job.query,
        status=JobStatus.PENDING,
        user_id=current_user.id
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    background_tasks.add_task(run_scraper_task, new_job.id)
    return new_job


@router.post("/jobs/both", response_model=List[JobResponse])
async def create_both_jobs(
    job: BothJobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Scrape every site for one query, returning the same number of products
    from each so the results can be compared like for like."""
    new_jobs = [
        ScrapeJob(
            site=site,
            query=job.query,
            status=JobStatus.PENDING,
            user_id=current_user.id
        )
        for site in BOTH_SITES
    ]
    db.add_all(new_jobs)
    await db.commit()
    for new_job in new_jobs:
        await db.refresh(new_job)

    background_tasks.add_task(run_paired_scraper_task, [j.id for j in new_jobs])
    return new_jobs


@router.get("/jobs", response_model=PaginatedJobResponse)
async def list_jobs(
    scheduled: Optional[bool] = None,
    page: int = 1,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_admin = current_user.role == 'admin'

    query = select(ScrapeJob)
    count_query = select(func.count()).select_from(ScrapeJob)

    if not is_admin:
        query = query.where(ScrapeJob.user_id == current_user.id)
        count_query = count_query.where(ScrapeJob.user_id == current_user.id)

    if scheduled is not None:
        scheduled_filter = ScrapeJob.scheduled_job_id != None if scheduled else ScrapeJob.scheduled_job_id == None
        query = query.where(scheduled_filter)
        count_query = count_query.where(scheduled_filter)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    offset = (page - 1) * limit
    result = await db.execute(query.order_by(ScrapeJob.start_time.desc()).offset(offset).limit(limit))
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job = await _verify_job_ownership(job_id, current_user, db)
    return job


@router.get("/jobs/{job_id}/products")
async def get_job_products(
    job_id: int,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await _verify_job_ownership(job_id, current_user, db)

    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(Product).where(Product.job_id == job_id)
    )
    total = count_result.scalar()

    # Get paginated results
    offset = (page - 1) * limit
    result = await db.execute(
        select(Product)
        .where(Product.job_id == job_id)
        .offset(offset)
        .limit(limit)
    )
    products = result.scalars().all()

    return {
        "products": [_format_product(p) for p in products],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/jobs/{job_id}/export/csv")
async def export_job_csv(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await _verify_job_ownership(job_id, current_user, db)

    result = await db.execute(select(Product).where(Product.job_id == job_id))
    products = result.scalars().all()

    if not products:
        raise HTTPException(status_code=404, detail="No products found")

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow(['ID', 'Title', 'Price', 'Currency', 'URL', 'Image URL', 'Rating', 'Review Count', 'Scraped At'])

    # Write data
    for product in products:
        writer.writerow([
            product.id,
            product.title,
            product.price,
            product.currency,
            product.url,
            product.image_url,
            product.rating,
            product.review_count,
            product.scraped_at.isoformat() if product.scraped_at else ''
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=scrape_job_{job_id}.csv"}
    )


@router.post("/jobs/{job_id}/pause")
async def pause_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job = await _verify_job_ownership(job_id, current_user, db)

    if job.status != JobStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Job is not running")

    job.status = JobStatus.PAUSED
    job.paused_at = datetime.utcnow()
    await db.commit()

    return {"message": "Job paused", "job_id": job_id}


@router.post("/jobs/{job_id}/resume")
async def resume_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job = await _verify_job_ownership(job_id, current_user, db)

    if job.status != JobStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Job is not paused")

    job.status = JobStatus.PENDING
    job.paused_at = None
    await db.commit()

    # Restart the scraping task
    background_tasks.add_task(run_scraper_task, job_id)

    return {"message": "Job resumed", "job_id": job_id}
