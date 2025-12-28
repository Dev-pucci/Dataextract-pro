"""
Authentication and user profile endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from database import get_db
from models import User
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from schemas import UserCreate, UserResponse, UserProfileUpdate, Token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.username == user.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already registered")

    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        role="user"  # Default role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check if email is being changed and if it's already taken
    if profile_data.email and profile_data.email != current_user.email:
        result = await db.execute(select(User).where(User.email == profile_data.email))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = profile_data.email

    # Update other fields
    if profile_data.first_name is not None:
        current_user.first_name = profile_data.first_name
    if profile_data.last_name is not None:
        current_user.last_name = profile_data.last_name

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/profile/image")
async def upload_profile_image(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Read the base64 string from the request body
    base64_string = await request.body()
    base64_string = base64_string.decode('utf-8')

    # Get the user from the current session
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    # Store with data URI prefix
    user.profile_image = f"data:image/jpeg;base64,{base64_string}"

    await db.commit()
    await db.refresh(user)
    return {"message": "Profile image uploaded successfully", "profile_image": user.profile_image}


@router.delete("/profile/image")
async def delete_profile_image(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get the user from the current session
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    user.profile_image = None
    await db.commit()
    return {"message": "Profile image deleted successfully"}
