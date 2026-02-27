from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Classification, Label, Mail, get_db

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


@router.get("/messages")
async def list_all_messages(
    user_id: int = Query(...),
    source: str | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List synced messages from all sources (Gmail + Naver) with classification.

    Args:
        user_id: User ID
        source: Filter by source ("gmail", "naver", or None for all)
        offset: Pagination offset
        limit: Results per page
    """
    # Build query with optional source filter
    where_clauses = [Mail.user_id == user_id]
    if source:
        where_clauses.append(Mail.source == source)

    query = (
        select(Mail)
        .where(*where_clauses)
        .order_by(Mail.received_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    mails = list(result.scalars().all())

    # Count total
    count_result = await db.execute(
        select(func.count(Mail.id)).where(*where_clauses)
    )
    total = count_result.scalar()

    # Fetch classifications for these mails
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
                "source": m.source,
                "external_id": m.external_id,
                "from_email": m.from_email,
                "from_name": m.from_name,
                "subject": m.subject,
                "to_email": m.to_email,
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


async def _get_classifications_for_mails(
    db: AsyncSession,
    mail_ids: list[int],
) -> dict[int, dict]:
    """Get latest classification for each mail. Returns {mail_id: {...}}."""
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
