"""
Admin user management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete as sql_delete
from typing import List
from datetime import datetime, timedelta

from database import get_db
from models import User, ScrapeJob, Product, ScheduledJob
from auth import get_password_hash, get_current_user
from schemas import UserCreate, UserResponse, UserUpdate, UserRoleUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check if username already exists
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already registered")

    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(select(User))
    return result.scalars().all()


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if email is being changed and if it's already taken
    if user_data.email and user_data.email != user.email:
        email_check = await db.execute(select(User).where(User.email == user_data.email))
        if email_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")

    # Update fields if provided
    if user_data.first_name is not None:
        user.first_name = user_data.first_name
    if user_data.last_name is not None:
        user.last_name = user_data.last_name
    if user_data.email is not None:
        user.email = user_data.email
    if user_data.role is not None:
        user.role = user_data.role

    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role_data: UserRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role_data.role
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
    return {"message": "User deleted"}


# --- Settings / Maintenance ---

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user


@router.get("/settings/stats")
async def get_settings_stats(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    total_jobs = (await db.execute(select(func.count(ScrapeJob.id)))).scalar()
    total_products = (await db.execute(select(func.count(Product.id)))).scalar()
    total_scheduled = (await db.execute(select(func.count(ScheduledJob.id)))).scalar()
    active_scheduled = (await db.execute(
        select(func.count(ScheduledJob.id)).where(ScheduledJob.is_active == 1)
    )).scalar()
    cutoff = datetime.utcnow() - timedelta(days=30)
    old_completed = (await db.execute(
        select(func.count(ScrapeJob.id)).where(
            ScrapeJob.status == 'completed',
            ScrapeJob.start_time < cutoff
        )
    )).scalar()
    return {
        "total_jobs": total_jobs,
        "total_products": total_products,
        "total_scheduled_jobs": total_scheduled,
        "active_scheduled_jobs": active_scheduled,
        "old_completed_jobs": old_completed,
    }


@router.patch("/settings/scheduled-jobs/toggle")
async def toggle_all_scheduled_jobs(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    active_count = (await db.execute(
        select(func.count(ScheduledJob.id)).where(ScheduledJob.is_active == 1)
    )).scalar()
    new_state = 0 if active_count > 0 else 1
    await db.execute(update(ScheduledJob).values(is_active=new_state))
    await db.commit()
    return {"is_active": new_state}


@router.delete("/settings/scheduled-jobs")
async def delete_all_scheduled_jobs(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Null out FK references in scrape_jobs before deleting
    await db.execute(
        update(ScrapeJob).where(ScrapeJob.scheduled_job_id.isnot(None)).values(scheduled_job_id=None)
    )
    result = await db.execute(sql_delete(ScheduledJob))
    await db.commit()
    return {"deleted": result.rowcount}


@router.delete("/maintenance/jobs/old")
async def delete_old_completed_jobs(
    days: int = 30,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    job_ids_result = await db.execute(
        select(ScrapeJob.id).where(
            ScrapeJob.status == 'completed',
            ScrapeJob.start_time < cutoff
        )
    )
    job_ids = [row[0] for row in job_ids_result.fetchall()]
    if job_ids:
        await db.execute(sql_delete(Product).where(Product.job_id.in_(job_ids)))
        await db.execute(sql_delete(ScrapeJob).where(ScrapeJob.id.in_(job_ids)))
        await db.commit()
    return {"deleted": len(job_ids)}


@router.delete("/maintenance/products")
async def clear_all_products(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(sql_delete(Product))
    await db.commit()
    return {"deleted": result.rowcount}
