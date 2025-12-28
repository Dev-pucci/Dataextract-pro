from sqlalchemy import select
from database import AsyncSessionLocal
from models import ScrapeJob, JobStatus, Product, ScheduledJob
from scraper.jumia import JumiaScraper
from scraper.kilimall import KilimallScraper
from datetime import datetime
import logging

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
                # Note: Scraper might need to be async or run in a thread executor if it's blocking
                # Assuming scraper.scrape is synchronous and blocking, we might want to run it in a thread pool
                # But for now, let's keep it as is, assuming it works (it was working in main.py)

                # Pass max_products to scraper if specified
                if job.max_products:
                    products_data = scraper.scrape(job.query, max_products=job.max_products)
                else:
                    products_data = scraper.scrape(job.query)

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
