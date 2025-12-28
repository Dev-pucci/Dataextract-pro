from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from typing import List
from database import get_db, engine, Base, AsyncSessionLocal
from models import ScrapeJob, Product, JobStatus, User, ScheduledJob
from scraper.jumia import JumiaScraper
from scraper.kilimall import KilimallScraper
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from datetime import datetime
from auth import get_current_user
from scheduler import start_scheduler, add_scheduled_job, remove_scheduled_job
from services import run_scraper_task
from routers import jobs, auth, admin, scheduler, analytics

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init DB
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    
    # Restore scheduled jobs
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ScheduledJob).where(ScheduledJob.is_active == 1))
        active_jobs = result.scalars().all()
        print(f"Restoring {len(active_jobs)} scheduled jobs...")
        
        for job in active_jobs:
            add_scheduled_job(job.id, job.site, job.query, job.cron_expression)
            
            # Recalculate next run to ensure it's up to date
            try:
                from croniter import croniter
                import pytz
                nairobi_tz = pytz.timezone('Africa/Nairobi')
                now_nairobi = datetime.now(nairobi_tz)
                cron = croniter(job.cron_expression, now_nairobi)
                next_run_nairobi = cron.get_next(datetime)
                job.next_run = next_run_nairobi.astimezone(pytz.utc).replace(tzinfo=None)
                db.add(job)
            except Exception as e:
                print(f"Error updating next run for restored job {job.id}: {e}")
                
        await db.commit()

# Include routers
app.include_router(jobs.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(scheduler.router)
app.include_router(analytics.router)

# Helper function for scheduled jobs
async def create_scrape_job_task(site: str, query: str):
    """Helper function to create a scrape job from scheduler"""
    async with AsyncSessionLocal() as db:
        new_job = ScrapeJob(site=site, query=query, status=JobStatus.PENDING)
        db.add(new_job)
        await db.commit()
        await db.refresh(new_job)
        await run_scraper_task(new_job.id)
