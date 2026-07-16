"""
Pydantic schemas for request/response models
"""
from pydantic import BaseModel, field_validator, PlainSerializer
from typing import List, Optional, Annotated
from datetime import datetime, timezone


def _utc_iso(dt: datetime) -> str:
    """Serialize a stored datetime as an explicit-UTC ISO string.

    Every datetime in the database is naive UTC (the scheduler even converts
    Nairobi times to UTC before stripping the tzinfo). Emitting it without a
    marker makes the browser's ``new Date()`` read it as local time, so a job
    run at 15:14 EAT shows as 12:14. Tagging it UTC lets the client convert.
    """
    return dt.replace(tzinfo=timezone.utc).isoformat()


# A datetime that serializes as an explicit-UTC ISO string ("...+00:00").
UtcDatetime = Annotated[datetime, PlainSerializer(_utc_iso, return_type=str)]


class NormalizedJobInput(BaseModel):
    """Stores site and query lowercased.

    Analytics groups by these columns, and mixed casing silently splits one
    site into several groups, so they are normalized before they ever reach
    the database.
    """

    @field_validator('site', 'query', check_fields=False)
    @classmethod
    def _normalize(cls, v: str) -> str:
        return v.strip().lower()


# Job Schemas
class JobCreate(NormalizedJobInput):
    site: str
    query: str


class BothJobCreate(NormalizedJobInput):
    query: str


class JobResponse(BaseModel):
    id: int
    site: str
    query: str
    status: str
    start_time: UtcDatetime
    end_time: Optional[UtcDatetime] = None
    paused_at: Optional[UtcDatetime] = None
    total_items: int

    class Config:
        from_attributes = True


class PaginatedJobResponse(BaseModel):
    items: List[JobResponse]
    total: int
    page: int
    limit: int
    pages: int


# Product Schemas
class ProductResponse(BaseModel):
    id: int
    title: str
    price: float
    currency: str
    url: str
    image_url: Optional[str]
    rating: Optional[str]
    review_count: Optional[str]

    class Config:
        from_attributes = True


# Auth Schemas
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    profile_image: Optional[str] = None

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


# Admin Schemas
class UserRoleUpdate(BaseModel):
    role: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


# Scheduler Schemas
class ScheduledJobCreate(NormalizedJobInput):
    site: str
    query: str
    max_products: int = 10
    cron_expression: str


class ScheduledJobResponse(BaseModel):
    id: int
    site: str
    query: str
    max_products: int
    cron_expression: str
    is_active: int
    created_at: UtcDatetime
    last_run: Optional[UtcDatetime] = None
    next_run: Optional[UtcDatetime] = None
    last_run_status: Optional[str] = None

    class Config:
        from_attributes = True
