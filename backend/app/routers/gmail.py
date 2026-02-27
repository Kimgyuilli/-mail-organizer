from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Classification, Label, Mail, get_db
from app.routers.auth import get_current_user_credentials
from app.services.gmail_service import (
    apply_labels,
    get_messages_batch,
    get_or_create_gmail_label,
    list_message_ids,
)

router = APIRouter(prefix="/api/gmail", tags=["gmail"])


@router.post("/sync")
async def sync_messages(
    user_id: int = Query(...),
    max_results: int = Query(default=20, le=100),
    query: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Fetch messages from Gmail and save new ones to DB.

    Returns count of newly synced messages.
    """
    user, credentials = await get_current_user_credentials(
        user_id, db
    )

    # List message IDs from Gmail
    result = await list_message_ids(
        credentials,
        max_results=max_results,
        query=query,
    )
    gmail_ids = result["message_ids"]

    if not gmail_ids:
        return {
            "synced": 0,
            "total_fetched": 0,
            "next_page_token": None,
        }

    # Filter out already-synced messages
    existing = await db.execute(
        select(Mail.external_id).where(
            Mail.user_id == user.id,
            Mail.source == "gmail",
            Mail.external_id.in_(gmail_ids),
        )
    )
    existing_ids = set(existing.scalars().all())
    new_ids = [gid for gid in gmail_ids if gid not in existing_ids]

    if not new_ids:
        return {
            "synced": 0,
            "total_fetched": len(gmail_ids),
            "next_page_token": result["next_page_token"],
        }

    # Fetch full details for new messages
    details = await get_messages_batch(credentials, new_ids)

    # Save to DB
    for detail in details:
        mail = Mail(
            user_id=user.id,
            source="gmail",
            external_id=detail["external_id"],
            from_email=detail["from_email"],
            from_name=detail["from_name"],
            subject=detail["subject"],
            body_text=detail["body_text"],
            received_at=detail["received_at"],
            is_read=detail["is_read"],
        )
        db.add(mail)

    await db.commit()

    return {
        "synced": len(details),
        "total_fetched": len(gmail_ids),
        "next_page_token": result["next_page_token"],
    }


@router.get("/messages")
async def list_messages(
    user_id: int = Query(...),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List synced Gmail messages from DB."""
    query = (
        select(Mail)
        .where(Mail.user_id == user_id, Mail.source == "gmail")
        .order_by(Mail.received_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    mails = result.scalars().all()

    count_result = await db.execute(
        select(func.count(Mail.id)).where(
            Mail.user_id == user_id, Mail.source == "gmail"
        )
    )
    total = count_result.scalar()

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
                "received_at": (
                    m.received_at.isoformat() if m.received_at else None
                ),
                "is_read": m.is_read,
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
    """Get a single synced message with body."""
    result = await db.execute(
        select(Mail).where(
            Mail.id == mail_id,
            Mail.user_id == user_id,
            Mail.source == "gmail",
        )
    )
    mail = result.scalar_one_or_none()
    if mail is None:
        raise HTTPException(status_code=404, detail="Message not found")

    return {
        "id": mail.id,
        "external_id": mail.external_id,
        "from_email": mail.from_email,
        "from_name": mail.from_name,
        "subject": mail.subject,
        "body_text": mail.body_text,
        "received_at": (
            mail.received_at.isoformat() if mail.received_at else None
        ),
        "is_read": mail.is_read,
    }


@router.post("/sync/full")
async def sync_all_messages(
    user_id: int = Query(...),
    max_pages: int = Query(default=5, le=20),
    per_page: int = Query(default=50, le=100),
    query: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Sync multiple pages of messages from Gmail.

    Iterates through pages until max_pages or no more results.
    """
    user, credentials = await get_current_user_credentials(
        user_id, db
    )

    total_synced = 0
    page_token = None

    for _ in range(max_pages):
        result = await list_message_ids(
            credentials,
            max_results=per_page,
            page_token=page_token,
            query=query,
        )
        gmail_ids = result["message_ids"]

        if not gmail_ids:
            break

        # Filter already-synced
        existing = await db.execute(
            select(Mail.external_id).where(
                Mail.user_id == user.id,
                Mail.source == "gmail",
                Mail.external_id.in_(gmail_ids),
            )
        )
        existing_ids = set(existing.scalars().all())
        new_ids = [gid for gid in gmail_ids if gid not in existing_ids]

        if new_ids:
            details = await get_messages_batch(credentials, new_ids)
            for detail in details:
                mail = Mail(
                    user_id=user.id,
                    source="gmail",
                    external_id=detail["external_id"],
                    from_email=detail["from_email"],
                    from_name=detail["from_name"],
                    subject=detail["subject"],
                    body_text=detail["body_text"],
                    received_at=detail["received_at"],
                    is_read=detail["is_read"],
                )
                db.add(mail)
            await db.commit()
            total_synced += len(details)

        page_token = result["next_page_token"]
        if not page_token:
            break

    return {"total_synced": total_synced}


class ApplyLabelsRequest(BaseModel):
    mail_ids: list[int]


@router.post("/apply-labels")
async def apply_classification_labels(
    req: ApplyLabelsRequest,
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Apply AI classification results as Gmail labels.

    For each mail, finds its classification label and applies it
    as a Gmail label on the original message.
    """
    user, credentials = await get_current_user_credentials(
        user_id, db
    )

    # Load mails with their classifications
    result = await db.execute(
        select(Mail).where(
            Mail.id.in_(req.mail_ids),
            Mail.user_id == user.id,
            Mail.source == "gmail",
        )
    )
    mails = list(result.scalars().all())

    if not mails:
        raise HTTPException(
            status_code=404, detail="No matching mails found"
        )

    applied = []
    for mail in mails:
        # Get classification for this mail
        cls_result = await db.execute(
            select(Classification)
            .where(Classification.mail_id == mail.id)
            .order_by(Classification.created_at.desc())
        )
        classification = cls_result.scalar_one_or_none()
        if classification is None:
            continue

        # Get label name
        label_result = await db.execute(
            select(Label).where(Label.id == classification.label_id)
        )
        label = label_result.scalar_one_or_none()
        if label is None:
            continue

        # Prefix with "AI/" to avoid conflicts with user labels
        gmail_label_name = f"AI/{label.name}"
        gmail_label_id = await get_or_create_gmail_label(
            credentials, gmail_label_name
        )

        await apply_labels(
            credentials, mail.external_id, [gmail_label_id]
        )

        applied.append({
            "mail_id": mail.id,
            "subject": mail.subject,
            "gmail_label": gmail_label_name,
        })

    return {"applied": len(applied), "results": applied}
