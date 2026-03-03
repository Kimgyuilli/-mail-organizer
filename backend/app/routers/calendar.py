from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_google_user
from app.models import User
from app.services.calendar_service import get_event, list_calendars, list_events

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/calendars")
async def get_calendars(
    user_credentials: tuple[User, object] = Depends(get_google_user),
):
    """사용자의 Google Calendar 목록 조회."""
    _user, credentials = user_credentials
    calendars = await list_calendars(credentials)
    return {"calendars": calendars}


@router.get("/events")
async def get_events(
    calendar_id: str = Query(default="primary"),
    time_min: str | None = Query(default=None),
    time_max: str | None = Query(default=None),
    max_results: int = Query(default=250, le=2500),
    user_credentials: tuple[User, object] = Depends(get_google_user),
):
    """캘린더 이벤트 목록 조회."""
    _user, credentials = user_credentials
    events = await list_events(
        credentials, calendar_id, time_min, time_max, max_results
    )
    return {"events": events, "calendar_id": calendar_id}


@router.get("/events/{event_id}")
async def get_event_detail(
    event_id: str,
    calendar_id: str = Query(default="primary"),
    user_credentials: tuple[User, object] = Depends(get_google_user),
):
    """단일 이벤트 상세 조회."""
    _user, credentials = user_credentials
    event = await get_event(credentials, calendar_id, event_id)
    return event
