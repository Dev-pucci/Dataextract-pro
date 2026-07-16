import asyncio
import logging
from datetime import datetime
from functools import partial

from sqlalchemy import select
from database import AsyncSessionLocal
from models import ScrapeJob, JobStatus, Product, ScheduledJob
from scraper.jumia import JumiaScraper
from scraper.kilimall import KilimallScraper

# Sites a job targets when site is "both". Lowercase to match the site values
# stored by every other path; analytics groups on this column.
BOTH_SITES = ["jumia", "kilimall"]


def _get_scraper(site: str):
    if site.lower() == "jumia":
        return JumiaScraper()
    if site.lower() == "kilimall":
        return KilimallScraper()
    return None


async def _scrape_site(site: str, query: str, max_products):
    """Scrape one site and return its raw product dicts."""
    scraper = _get_scraper(site)
    if not scraper:
        raise ValueError("Unknown site")

    # Run the synchronous scraper in a thread pool so it doesn't block
    # the async event loop. This is critical for Playwright-based scrapers
    # since sync_playwright() uses asyncio.run() internally and will fail
    # if called directly from an already-running event loop.
    loop = asyncio.get_event_loop()
    scrape_fn = partial(scraper.scrape, query, max_products=max_products) if max_products else partial(scraper.scrape, query)
    return await loop.run_in_executor(None, scrape_fn)


def _save_products(session, job, products_data):
    for p_data in products_data:
        product = Product(job_id=job.id, **p_data)
        session.add(product)

    job.total_items = len(products_data)
    job.status = JobStatus.COMPLETED
    job.end_time = datetime.utcnow()


async def run_scraper_task(job_id: int):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ScrapeJob).where(ScrapeJob.id == job_id))
        job = result.scalar_one_or_none()

        if not job:
            return

        job.status = JobStatus.RUNNING
        await session.commit()

        try:
            products_data = await _scrape_site(job.site, job.query, job.max_products)
            _save_products(session, job, products_data)
        except Exception as e:
            job.status = JobStatus.FAILED
            job.error_log = str(e)
            logging.error(f"Scraper task failed: {e}")

        await session.commit()


async def run_paired_scraper_task(job_ids):
    """Run several scrape jobs and give each site the same number of products.

    Each scraper already stops at its own limit, so the shared count is just
    the smallest result. Sites that come back empty are left out of that
    calculation, so one site failing doesn't discard another site's products.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(ScrapeJob).where(ScrapeJob.id.in_(job_ids)))
        jobs = result.scalars().all()
        if not jobs:
            return

        for job in jobs:
            job.status = JobStatus.RUNNING
        await session.commit()

        specs = [(j.id, j.site, j.query, j.max_products) for j in jobs]

    # Scrape one site at a time; the scrapers drive Playwright browsers, so
    # running them concurrently would double peak memory.
    scraped = {}
    errors = {}
    for job_id, site, query, max_products in specs:
        try:
            scraped[job_id] = await _scrape_site(site, query, max_products)
        except Exception as e:
            errors[job_id] = str(e)
            logging.error(f"Scraper task failed for job {job_id}: {e}")

    counts = [len(p) for p in scraped.values() if p]
    shared_count = min(counts) if counts else 0
    logging.info(f"Paired scrape: {counts} products found, keeping {shared_count} from each")

    async with AsyncSessionLocal() as session:
        for job_id, *_ in specs:
            result = await session.execute(select(ScrapeJob).where(ScrapeJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job:
                continue

            if job_id in errors:
                job.status = JobStatus.FAILED
                job.error_log = errors[job_id]
                continue

            _save_products(session, job, scraped[job_id][:shared_count])

        await session.commit()

async def execute_scheduled_job(scheduled_job_id: int, site: str, query: str):
    logging.info(f"Executing scheduled job: {scheduled_job_id} for {site} - {query}")
    target_sites = BOTH_SITES if site.lower() == "both" else [site]
    job_ids = []

    async with AsyncSessionLocal() as session:
        # Get scheduled job to fetch max_products
        result = await session.execute(select(ScheduledJob).where(ScheduledJob.id == scheduled_job_id))
        scheduled_job = result.scalar_one_or_none()

        # Create a scrape job per target site, with max_products and user_id
        # carried over from the scheduled job
        for target_site in target_sites:
            new_job = ScrapeJob(
                site=target_site,
                query=query,
                max_products=scheduled_job.max_products if scheduled_job else None,
                status=JobStatus.PENDING,
                user_id=scheduled_job.user_id if scheduled_job else None,
                scheduled_job_id=scheduled_job_id
            )
            session.add(new_job)
            await session.commit()
            await session.refresh(new_job)
            job_ids.append(new_job.id)

        # Update scheduled job last run
        if scheduled_job:
            scheduled_job.last_run = datetime.utcnow()
            await session.commit()

    # A "both" run goes through the paired task so each site returns the
    # same number of products.
    if len(job_ids) > 1:
        await run_paired_scraper_task(job_ids)
    else:
        await run_scraper_task(job_ids[0])

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
