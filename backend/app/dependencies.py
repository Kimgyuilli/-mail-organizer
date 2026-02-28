"""FastAPI dependencies for user authentication and validation."""

from __future__ import annotations

from fastapi import Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import AccountNotConnectedException, UserNotFoundException
from app.models import User, get_db
from app.services.google_auth import build_credentials


async def get_current_user(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Validate and return current user by user_id query parameter."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise UserNotFoundException()
    return user


async def get_google_user(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, object]:
    """Validate user has Google OAuth connected and return (user, credentials).

    Also handles token refresh if expired.
    """
    if not user.google_oauth_token or not user.google_refresh_token:
        raise AccountNotConnectedException("Google")

    credentials = build_credentials(user.google_oauth_token, user.google_refresh_token)

    if credentials.expired and credentials.refresh_token:
        from google.auth.transport.requests import Request

        credentials.refresh(Request())
        user.google_oauth_token = credentials.token
        await db.commit()

    return user, credentials


async def get_naver_user(
    user: User = Depends(get_current_user),
) -> User:
    """Validate user has Naver IMAP credentials connected."""
    if not user.naver_email or not user.naver_app_password:
        raise AccountNotConnectedException("Naver")
    return user
