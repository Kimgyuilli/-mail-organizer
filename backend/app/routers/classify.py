from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Classification, Label, Mail, User, get_db
from app.services.classifier import DEFAULT_CATEGORIES, classify_batch, classify_single

router = APIRouter(prefix="/api/classify", tags=["classify"])


class ClassifySingleRequest(BaseModel):
    from_email: str = ""
    from_name: str = ""
    subject: str = ""
    body: str | None = None


class ClassifySingleResponse(BaseModel):
    category: str
    confidence: float
    reason: str


@router.post("/single", response_model=ClassifySingleResponse)
async def classify_single_mail(req: ClassifySingleRequest):
    """Classify a single email (stateless, no DB save)."""
    try:
        result = await classify_single(
            from_email=req.from_email,
            from_name=req.from_name,
            subject=req.subject,
            body=req.body,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Classification failed: {exc}")

    return ClassifySingleResponse(
        category=result.get("category", "알림"),
        confidence=result.get("confidence", 0.0),
        reason=result.get("reason", ""),
    )


@router.post("/mails")
async def classify_user_mails(
    user_id: int = Query(...),
    mail_ids: list[int] | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Classify user's mails and save results to DB.

    If mail_ids is provided, classify only those mails.
    Otherwise, classify all unclassified mails for the user.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    query = select(Mail).where(Mail.user_id == user_id)
    if mail_ids:
        query = query.where(Mail.id.in_(mail_ids))

    result = await db.execute(query)
    mails = list(result.scalars().all())

    if not mails:
        return {"classified": 0, "results": []}

    # Filter out already classified mails (unless specific IDs requested)
    if not mail_ids:
        classified_mail_ids_result = await db.execute(
            select(Classification.mail_id).where(
                Classification.mail_id.in_([m.id for m in mails])
            )
        )
        already_classified = set(classified_mail_ids_result.scalars().all())
        mails = [m for m in mails if m.id not in already_classified]

    if not mails:
        return {"classified": 0, "results": []}

    # Prepare batch input
    email_dicts = [
        {
            "from_email": m.from_email or "",
            "from_name": m.from_name or "",
            "subject": m.subject or "",
            "body": m.body_text,
        }
        for m in mails
    ]

    try:
        classifications = await classify_batch(email_dicts)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Classification failed: {exc}")

    # Ensure default labels exist
    await _ensure_default_labels(db, user_id)

    results = []
    for cls in classifications:
        idx = cls.get("index", 0)
        if idx >= len(mails):
            continue

        mail = mails[idx]
        category = cls.get("category", "알림")
        confidence = cls.get("confidence", 0.0)

        # Find or create label
        label_result = await db.execute(
            select(Label).where(Label.user_id == user_id, Label.name == category)
        )
        label = label_result.scalar_one_or_none()
        if label is None:
            label = Label(user_id=user_id, name=category, is_default=False)
            db.add(label)
            await db.flush()

        # Save classification
        classification = Classification(
            mail_id=mail.id,
            label_id=label.id,
            confidence=confidence,
        )
        db.add(classification)

        # Associate label with mail
        if label not in mail.labels:
            mail.labels.append(label)

        results.append({
            "mail_id": mail.id,
            "subject": mail.subject,
            "category": category,
            "confidence": confidence,
            "reason": cls.get("reason", ""),
        })

    await db.commit()
    return {"classified": len(results), "results": results}


async def _ensure_default_labels(db: AsyncSession, user_id: int) -> None:
    """Create default category labels if they don't exist."""
    for category in DEFAULT_CATEGORIES:
        result = await db.execute(
            select(Label).where(Label.user_id == user_id, Label.name == category)
        )
        if result.scalar_one_or_none() is None:
            db.add(Label(user_id=user_id, name=category, is_default=True))
    await db.flush()
