from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, get_db
from app.services.google_auth import (
    build_credentials,
    create_auth_url,
    exchange_code,
    get_user_email,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
async def login():
    """Redirect user to Google OAuth consent screen."""
    url = create_auth_url()
    return {"auth_url": url}


@router.get("/callback")
async def callback(
    code: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle OAuth callback: exchange code, upsert user, return tokens."""
    try:
        credentials = exchange_code(code)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {exc}")

    email = await get_user_email(credentials)

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
            google_oauth_token=credentials.token,
            google_refresh_token=credentials.refresh_token,
        )
        db.add(user)
    else:
        user.google_oauth_token = credentials.token
        if credentials.refresh_token:
            user.google_refresh_token = credentials.refresh_token

    await db.commit()
    await db.refresh(user)

    # Redirect to frontend with user_id
    frontend_url = f"http://localhost:3000?user_id={user.id}"
    return RedirectResponse(url=frontend_url)


@router.get("/me")
async def me(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Get current user info."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    has_google = bool(user.google_oauth_token)
    has_naver = bool(user.naver_email)

    return {
        "user_id": user.id,
        "email": user.email,
        "google_connected": has_google,
        "naver_connected": has_naver,
    }


async def get_current_user_credentials(
    user_id: int,
    db: AsyncSession,
) -> tuple[User, object]:
    """Helper: load user and build Google credentials. Raises 401 if not connected."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.google_oauth_token or not user.google_refresh_token:
        raise HTTPException(status_code=401, detail="Google account not connected")

    credentials = build_credentials(user.google_oauth_token, user.google_refresh_token)

    if credentials.expired and credentials.refresh_token:
        from google.auth.transport.requests import Request

        credentials.refresh(Request())
        user.google_oauth_token = credentials.token
        await db.commit()

    return user, credentials
