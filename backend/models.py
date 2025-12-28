from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    role = Column(String, default="user")
    profile_image = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    jobs = relationship("ScrapeJob", back_populates="user")


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"

class ScrapeJob(Base):
    __tablename__ = "scrape_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for backward compatibility
    scheduled_job_id = Column(Integer, ForeignKey("scheduled_jobs.id"), nullable=True)
    site = Column(String, nullable=False)  # jumia or kilimall
    query = Column(String, nullable=False)
    max_products = Column(Integer, nullable=True)  # Limit number of products to scrape
    status = Column(String, default=JobStatus.PENDING)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)
    total_items = Column(Integer, default=0)
    error_log = Column(String, nullable=True)

    user = relationship("User", back_populates="jobs")
    scheduled_job = relationship("ScheduledJob", back_populates="jobs")
    products = relationship("Product", back_populates="job")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("scrape_jobs.id"))
    title = Column(String, nullable=False)
    price = Column(Float, nullable=True)
    currency = Column(String, default="KES")
    url = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    rating = Column(String, nullable=True)
    review_count = Column(String, nullable=True)
    scraped_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("ScrapeJob", back_populates="products")

class ScheduledJob(Base):
    __tablename__ = "scheduled_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    site = Column(String, nullable=False)
    query = Column(String, nullable=False)
    max_products = Column(Integer, default=10)
    cron_expression = Column(String, nullable=False)  # e.g., "0 0 * * *" for daily at midnight
    is_active = Column(Integer, default=1)  # SQLite doesn't have boolean
    created_at = Column(DateTime, default=datetime.utcnow)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)

    jobs = relationship("ScrapeJob", back_populates="scheduled_job")

