from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging

from pytz import timezone

scheduler = AsyncIOScheduler(timezone=timezone('Africa/Nairobi'))
logging.basicConfig()
logging.getLogger('apscheduler').setLevel(logging.INFO)

def start_scheduler():
    if not scheduler.running:
        scheduler.start()

def add_scheduled_job(job_id, site, query, cron_expression):
    """Add a scheduled scraping job"""
    from services import execute_scheduled_job
    
    try:
        trigger = CronTrigger.from_crontab(cron_expression)
        scheduler.add_job(
            execute_scheduled_job,
            trigger=trigger,
            args=[job_id, site, query],
            id=f"scheduled_{job_id}",
            replace_existing=True
        )
        return True
    except Exception as e:
        logging.error(f"Error adding scheduled job: {e}")
        return False

def remove_scheduled_job(job_id):
    """Remove a scheduled job"""
    try:
        scheduler.remove_job(f"scheduled_{job_id}")
        return True
    except Exception as e:
        logging.error(f"Error removing scheduled job: {e}")
        return False

def get_scheduled_jobs():
    """Get all scheduled jobs"""
    return scheduler.get_jobs()
