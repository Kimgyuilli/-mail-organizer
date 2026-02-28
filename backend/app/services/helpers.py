"""Common database query helpers shared across routers."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Classification, Label, Mail


async def get_mail_classifications(
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


async def filter_new_external_ids(
    db: AsyncSession,
    user_id: int,
    source: str,
    external_ids: list[str],
) -> list[str]:
    """Filter out already-synced message IDs. Returns only new IDs."""
    if not external_ids:
        return []

    existing = await db.execute(
        select(Mail.external_id).where(
            Mail.user_id == user_id,
            Mail.source == source,
            Mail.external_id.in_(external_ids),
        )
    )
    existing_ids = set(existing.scalars().all())
    return [eid for eid in external_ids if eid not in existing_ids]
