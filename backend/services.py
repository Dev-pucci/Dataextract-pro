import asyncio
import logging
from datetime import datetime
from functools import partial

from sqlalchemy import select
from database import AsyncSessionLocal
from models import ScrapeJob, JobStatus, Product, ScheduledJob
from scraper.jumia import JumiaScraper
from scraper.kilimall import KilimallScraper

async def run_scraper_task(job_id: int):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ScrapeJob).where(ScrapeJob.id == job_id))
        job = result.scalar_one_or_none()
        
        if not job:
            return

        job.status = JobStatus.RUNNING
        await session.commit()
        
        try:
            scraper = None
            if job.site.lower() == "jumia":
                scraper = JumiaScraper()
            elif job.site.lower() == "kilimall":
                scraper = KilimallScraper()
            
            if scraper:
                # Run the synchronous scraper in a thread pool so it doesn't block
                # the async event loop. This is critical for Playwright-based scrapers
                # since sync_playwright() uses asyncio.run() internally and will fail
                # if called directly from an already-running event loop.
                loop = asyncio.get_event_loop()
                scrape_fn = partial(scraper.scrape, job.query, max_products=job.max_products) if job.max_products else partial(scraper.scrape, job.query)
                products_data = await loop.run_in_executor(None, scrape_fn)

                for p_data in products_data:
                    product = Product(job_id=job.id, **p_data)
                    session.add(product)

                job.total_items = len(products_data)
                job.status = JobStatus.COMPLETED
                job.end_time = datetime.utcnow()
            else:
                job.status = JobStatus.FAILED
                job.error_log = "Unknown site"
                
        except Exception as e:
            job.status = JobStatus.FAILED
            job.error_log = str(e)
            logging.error(f"Scraper task failed: {e}")
            
        await session.commit()

async def execute_scheduled_job(scheduled_job_id: int, site: str, query: str):
    logging.info(f"Executing scheduled job: {scheduled_job_id} for {site} - {query}")
    async with AsyncSessionLocal() as session:
        # Get scheduled job to fetch max_products
        result = await session.execute(select(ScheduledJob).where(ScheduledJob.id == scheduled_job_id))
        scheduled_job = result.scalar_one_or_none()

        # Create new scrape job with max_products and user_id from scheduled job
        new_job = ScrapeJob(
            site=site,
            query=query,
            max_products=scheduled_job.max_products if scheduled_job else None,
            status=JobStatus.PENDING,
            user_id=scheduled_job.user_id if scheduled_job else None,
            scheduled_job_id=scheduled_job_id
        )
        session.add(new_job)
        await session.commit()
        await session.refresh(new_job)

        # Update scheduled job last run
        if scheduled_job:
            scheduled_job.last_run = datetime.utcnow()
            await session.commit()

        job_id = new_job.id

    # Run the scraper task
    await run_scraper_task(job_id)

    # After scraping completes, deactivate the scheduled job
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ScheduledJob).where(ScheduledJob.id == scheduled_job_id))
        scheduled_job = result.scalar_one_or_none()
        if scheduled_job:
            scheduled_job.is_active = 0  # Deactivate after completion
            logging.info(f"Deactivating scheduled job {scheduled_job_id} after completion")
            await session.commit()

            # Remove from APScheduler
            from scheduler import remove_scheduled_job
            remove_scheduled_job(scheduled_job_id)
