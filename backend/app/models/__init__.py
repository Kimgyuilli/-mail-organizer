from __future__ import annotations

from app.models.base import Base, get_db
from app.models.label import Classification, Label
from app.models.mail import Mail, mail_labels
from app.models.sync_state import SyncState
from app.models.user import User

MailLabel = mail_labels

__all__ = [
    "Base",
    "Classification",
    "Label",
    "Mail",
    "MailLabel",
    "SyncState",
    "User",
    "get_db",
]
