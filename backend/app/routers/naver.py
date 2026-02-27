from __future__ import annotations

import imaplib
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Classification, Label, Mail, SyncState, User, get_db
from app.services.naver_service import fetch_messages, list_folders, verify_credentials

router = APIRouter(prefix="/api/naver", tags=["naver"])


class NaverConnectRequest(BaseModel):
    naver_email: str
    naver_app_password: str


@router.post("/connect")
async def connect_naver(
    req: NaverConnectRequest,
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Connect Naver account by verifying IMAP credentials."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify IMAP credentials
    try:
        ok = await verify_credentials(
            settings.naver_imap_host,
            settings.naver_imap_port,
            req.naver_email,
            req.naver_app_password,
        )
    except imaplib.IMAP4.error as exc:
        raise HTTPException(
            status_code=400,
            detail=f"IMAP 인증 실패: {exc}",
        )
    except (TimeoutError, OSError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"IMAP 서버 연결 실패: {exc}",
        )

    if not ok:
        raise HTTPException(status_code=400, detail="IMAP 인증 실패")

    # Save credentials
    user.naver_email = req.naver_email
    user.naver_app_password = req.naver_app_password
    await db.commit()

    return {"status": "connected", "naver_email": req.naver_email}


@router.get("/folders")
async def get_folders(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """List available IMAP folders."""
    user = await _get_naver_user(user_id, db)

    folders = await list_folders(
        settings.naver_imap_host,
        settings.naver_imap_port,
        user.naver_email,
        user.naver_app_password,
    )

    return {"folders": folders}


@router.post("/sync")
async def sync_messages(
    user_id: int = Query(...),
    folder: str = Query(default="INBOX"),
    max_results: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Sync messages from Naver IMAP folder.

    Uses SyncState to track last synced UID for incremental sync.
    """
    user = await _get_naver_user(user_id, db)

    # Get sync state
    sync_result = await db.execute(
        select(SyncState).where(
            SyncState.user_id == user.id,
            SyncState.source == "naver",
        )
    )
    sync_state = sync_result.scalar_one_or_none()
    since_uid = sync_state.last_uid if sync_state else None

    # Fetch messages from IMAP
    result = await fetch_messages(
        settings.naver_imap_host,
        settings.naver_imap_port,
        user.naver_email,
        user.naver_app_password,
        folder=folder,
        since_uid=since_uid,
        max_results=max_results,
    )

    messages = result["messages"]
    last_uid = result["last_uid"]

    if not messages:
        return {"synced": 0, "total_fetched": 0}

    # Filter out already-synced messages
    external_ids = [m["external_id"] for m in messages]
    existing = await db.execute(
        select(Mail.external_id).where(
            Mail.user_id == user.id,
            Mail.source == "naver",
            Mail.external_id.in_(external_ids),
        )
    )
    existing_ids = set(existing.scalars().all())

    new_messages = [m for m in messages if m["external_id"] not in existing_ids]

    # Save new messages to DB
    for msg in new_messages:
        mail = Mail(
            user_id=user.id,
            source="naver",
            external_id=msg["external_id"],
            from_email=msg["from_email"],
            from_name=msg["from_name"],
            to_email=msg["to_email"],
            subject=msg["subject"],
            body_text=msg["body_text"],
            folder=msg["folder"],
            received_at=msg["received_at"],
            is_read=msg["is_read"],
        )
        db.add(mail)

    # Update sync state
    if last_uid:
        if sync_state is None:
            sync_state = SyncState(
                user_id=user.id,
                source="naver",
                last_uid=last_uid,
                last_synced_at=datetime.now(tz=UTC),
            )
            db.add(sync_state)
        else:
            sync_state.last_uid = last_uid
            sync_state.last_synced_at = datetime.now(tz=UTC)

    await db.commit()

    return {
        "synced": len(new_messages),
        "total_fetched": len(messages),
    }


@router.get("/messages")
async def list_messages(
    user_id: int = Query(...),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List synced Naver messages from DB with classification."""
    query = (
        select(Mail)
        .where(Mail.user_id == user_id, Mail.source == "naver")
        .order_by(Mail.received_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    mails = list(result.scalars().all())

    count_result = await db.execute(
        select(func.count(Mail.id)).where(
            Mail.user_id == user_id, Mail.source == "naver"
        )
    )
    total = count_result.scalar()

    classifications = await _get_classifications_for_mails(
        db, [m.id for m in mails]
    )

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "messages": [
            {
                "id": m.id,
                "external_id": m.external_id,
                "from_email": m.from_email,
                "from_name": m.from_name,
                "subject": m.subject,
                "folder": m.folder,
                "received_at": (
                    m.received_at.isoformat() if m.received_at else None
                ),
                "is_read": m.is_read,
                "classification": classifications.get(m.id),
            }
            for m in mails
        ],
    }


@router.get("/messages/{mail_id}")
async def get_message(
    mail_id: int,
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a single synced Naver message with body."""
    result = await db.execute(
        select(Mail).where(
            Mail.id == mail_id,
            Mail.user_id == user_id,
            Mail.source == "naver",
        )
    )
    mail = result.scalar_one_or_none()
    if mail is None:
        raise HTTPException(status_code=404, detail="Message not found")

    classifications = await _get_classifications_for_mails(db, [mail.id])

    return {
        "id": mail.id,
        "external_id": mail.external_id,
        "from_email": mail.from_email,
        "from_name": mail.from_name,
        "to_email": mail.to_email,
        "subject": mail.subject,
        "body_text": mail.body_text,
        "folder": mail.folder,
        "received_at": (
            mail.received_at.isoformat() if mail.received_at else None
        ),
        "is_read": mail.is_read,
        "classification": classifications.get(mail.id),
    }


async def _get_naver_user(
    user_id: int,
    db: AsyncSession,
) -> User:
    """Load user and verify Naver credentials exist."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.naver_email or not user.naver_app_password:
        raise HTTPException(
            status_code=401, detail="Naver account not connected"
        )
    return user


async def _get_classifications_for_mails(
    db: AsyncSession,
    mail_ids: list[int],
) -> dict[int, dict]:
    """Get latest classification for each mail."""
    if not mail_ids:
        return {}

    result = await db.execute(
        select(Classification, Label)
        .join(Label, Classification.label_id == Label.id)
        .where(Classification.mail_id.in_(mail_ids))
        .order_by(Classification.created_at.desc())
    )
    rows = result.all()

    classifications: dict[int, dict] = {}
    for cls, label in rows:
        if cls.mail_id not in classifications:
            classifications[cls.mail_id] = {
                "classification_id": cls.id,
                "category": label.name,
                "confidence": cls.confidence,
                "user_feedback": cls.user_feedback,
            }
    return classifications
