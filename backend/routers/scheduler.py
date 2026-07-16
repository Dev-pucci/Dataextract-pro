"""
Scheduled job management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging
import traceback
from datetime import datetime
from croniter import croniter
from pytz import timezone

from database import get_db
from models import User, ScheduledJob, ScrapeJob
from auth import get_current_user
from scheduler import add_scheduled_job, remove_scheduled_job
from schemas import ScheduledJobCreate, ScheduledJobResponse

# Use the same timezone as the scheduler
NAIROBI_TZ = timezone('Africa/Nairobi')

router = APIRouter(prefix="/api/scheduler", tags=["scheduler"])


@router.post("/jobs", response_model=ScheduledJobResponse)
async def create_scheduled_job(
    job_data: ScheduledJobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Validate cron expression
        try:
            # Use timezone-aware datetime to match scheduler timezone
            now_tz = datetime.now(NAIROBI_TZ)
            cron = croniter(job_data.cron_expression, now_tz)
            # croniter returns a Nairobi-aware time; store it as naive UTC so it
            # matches created_at/last_run and the restore path in main.py, and so
            # the UtcDatetime serializer doesn't add the offset a second time.
            next_run = cron.get_next(datetime).astimezone(timezone('UTC')).replace(tzinfo=None)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid cron expression: {str(e)}")

        # Create scheduled job
        scheduled_job = ScheduledJob(
            user_id=current_user.id,
            site=job_data.site,
            query=job_data.query,
            max_products=job_data.max_products,
            cron_expression=job_data.cron_expression,
            next_run=next_run,
            is_active=1
        )

        db.add(scheduled_job)
        await db.commit()
        await db.refresh(scheduled_job)

        # Add to scheduler
        add_scheduled_job(scheduled_job.id, job_data.site, job_data.query, job_data.cron_expression)

        return scheduled_job
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating scheduled job: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/jobs", response_model=List[ScheduledJobResponse])
async def get_scheduled_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Admin sees all ACTIVE scheduled jobs, regular users see only their own ACTIVE jobs
    if current_user.role == 'admin':
        result = await db.execute(
            select(ScheduledJob)
            .where(ScheduledJob.is_active == 1)
            .order_by(ScheduledJob.created_at.desc())
        )
    else:
        result = await db.execute(
            select(ScheduledJob)
            .where(ScheduledJob.user_id == current_user.id)
            .where(ScheduledJob.is_active == 1)
            .order_by(ScheduledJob.created_at.desc())
        )
    jobs = result.scalars().all()

    response_items = []
    for job in jobs:
        # Check for latest scrape job status
        latest_job_result = await db.execute(
            select(ScrapeJob)
            .where(ScrapeJob.scheduled_job_id == job.id)
            .order_by(ScrapeJob.start_time.desc())
            .limit(1)
        )
        latest_job = latest_job_result.scalar_one_or_none()

        # Create response object manually to avoid modifying ORM object
        job_data = ScheduledJobResponse.model_validate(job)
        if latest_job:
            job_data.last_run_status = latest_job.status

        response_items.append(job_data)

    return response_items


@router.delete("/jobs/{job_id}")
async def delete_scheduled_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ScheduledJob).where(
            ScheduledJob.id == job_id,
            ScheduledJob.user_id == current_user.id
        )
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Scheduled job not found")

    # Remove from scheduler
    remove_scheduled_job(job_id)

    await db.delete(job)
    await db.commit()

    return {"message": "Scheduled job deleted successfully"}


@router.patch("/jobs/{job_id}/toggle")
async def toggle_scheduled_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ScheduledJob).where(
            ScheduledJob.id == job_id,
            ScheduledJob.user_id == current_user.id
        )
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Scheduled job not found")

    # Toggle active status
    job.is_active = 0 if job.is_active else 1
    await db.commit()
    await db.refresh(job)

    # Update scheduler
    if job.is_active:
        add_scheduled_job(job.id, job.site, job.query, job.cron_expression)
    else:
        remove_scheduled_job(job.id)

    return job
