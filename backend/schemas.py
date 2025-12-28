"""
Pydantic schemas for request/response models
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# Job Schemas
class JobCreate(BaseModel):
    site: str
    query: str


class JobResponse(BaseModel):
    id: int
    site: str
    query: str
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    paused_at: Optional[datetime] = None
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
class ScheduledJobCreate(BaseModel):
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
    created_at: datetime
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    last_run_status: Optional[str] = None

    class Config:
        from_attributes = True
