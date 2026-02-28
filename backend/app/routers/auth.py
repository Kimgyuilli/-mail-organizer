from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user
from app.models import User, get_db
from app.services.google_auth import (
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
async def me(user: User = Depends(get_current_user)):
    """Get current user info."""
    has_google = bool(user.google_oauth_token)
    has_naver = bool(user.naver_email)

    return {
        "user_id": user.id,
        "email": user.email,
        "google_connected": has_google,
        "naver_connected": has_naver,
    }
