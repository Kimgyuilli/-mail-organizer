from __future__ import annotations

import base64
import email.utils
from datetime import UTC, datetime
from typing import Any

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


def _build_gmail(credentials: Credentials):
    """Build Gmail API service client."""
    return build("gmail", "v1", credentials=credentials)


async def list_message_ids(
    credentials: Credentials,
    max_results: int = 20,
    page_token: str | None = None,
    query: str | None = None,
) -> dict[str, Any]:
    """List message IDs from Gmail.

    Returns dict with 'message_ids' (list[str]) and
    'next_page_token' (str | None).
    """
    import asyncio

    service = _build_gmail(credentials)

    def _fetch():
        kwargs: dict[str, Any] = {
            "userId": "me",
            "maxResults": max_results,
        }
        if page_token:
            kwargs["pageToken"] = page_token
        if query:
            kwargs["q"] = query
        return service.users().messages().list(**kwargs).execute()

    result = await asyncio.to_thread(_fetch)
    messages = result.get("messages", [])
    return {
        "message_ids": [m["id"] for m in messages],
        "next_page_token": result.get("nextPageToken"),
    }


async def get_message_detail(
    credentials: Credentials,
    message_id: str,
) -> dict[str, Any]:
    """Fetch a single message's full detail and parse it.

    Returns dict with: external_id, from_email, from_name,
    subject, body_text, received_at, is_read.
    """
    import asyncio

    service = _build_gmail(credentials)

    def _fetch():
        return (
            service.users()
            .messages()
            .get(userId="me", id=message_id, format="full")
            .execute()
        )

    raw = await asyncio.to_thread(_fetch)
    return _parse_message(raw)


async def get_messages_batch(
    credentials: Credentials,
    message_ids: list[str],
) -> list[dict[str, Any]]:
    """Fetch multiple messages in sequence.

    For large batches, consider calling in chunks.
    """
    results = []
    for mid in message_ids:
        detail = await get_message_detail(credentials, mid)
        results.append(detail)
    return results


async def list_labels(
    credentials: Credentials,
) -> list[dict[str, str]]:
    """List all Gmail labels for the user."""
    import asyncio

    service = _build_gmail(credentials)

    def _fetch():
        return service.users().labels().list(userId="me").execute()

    result = await asyncio.to_thread(_fetch)
    return [
        {"id": lb["id"], "name": lb["name"]}
        for lb in result.get("labels", [])
    ]


async def create_label(
    credentials: Credentials,
    name: str,
) -> dict[str, str]:
    """Create a new Gmail label. Returns {id, name}."""
    import asyncio

    service = _build_gmail(credentials)

    def _create():
        body = {
            "name": name,
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show",
        }
        return service.users().labels().create(
            userId="me", body=body
        ).execute()

    result = await asyncio.to_thread(_create)
    return {"id": result["id"], "name": result["name"]}


async def apply_labels(
    credentials: Credentials,
    message_id: str,
    add_label_ids: list[str],
) -> None:
    """Apply Gmail labels to a single message."""
    import asyncio

    service = _build_gmail(credentials)

    def _modify():
        service.users().messages().modify(
            userId="me",
            id=message_id,
            body={"addLabelIds": add_label_ids},
        ).execute()

    await asyncio.to_thread(_modify)


async def batch_apply_labels(
    credentials: Credentials,
    message_ids: list[str],
    add_label_ids: list[str],
) -> None:
    """Apply Gmail labels to multiple messages at once."""
    import asyncio

    service = _build_gmail(credentials)

    def _batch():
        service.users().messages().batchModify(
            userId="me",
            body={
                "ids": message_ids,
                "addLabelIds": add_label_ids,
            },
        ).execute()

    await asyncio.to_thread(_batch)


async def get_or_create_gmail_label(
    credentials: Credentials,
    label_name: str,
) -> str:
    """Find a Gmail label by name or create it. Returns label ID."""
    labels = await list_labels(credentials)
    for lb in labels:
        if lb["name"] == label_name:
            return lb["id"]
    new_label = await create_label(credentials, label_name)
    return new_label["id"]


def _parse_message(raw: dict) -> dict[str, Any]:
    """Parse Gmail API message response into a flat dict."""
    headers = {
        h["name"].lower(): h["value"]
        for h in raw.get("payload", {}).get("headers", [])
    }

    from_header = headers.get("from", "")
    from_name, from_email = _parse_from(from_header)

    subject = headers.get("subject", "")

    body_text = _extract_body(raw.get("payload", {}))

    internal_date_ms = int(raw.get("internalDate", "0"))
    received_at = datetime.fromtimestamp(
        internal_date_ms / 1000, tz=UTC
    )

    label_ids = raw.get("labelIds", [])
    is_read = "UNREAD" not in label_ids

    return {
        "external_id": raw["id"],
        "from_email": from_email,
        "from_name": from_name,
        "subject": subject,
        "body_text": body_text,
        "received_at": received_at,
        "is_read": is_read,
    }


def _parse_from(from_header: str) -> tuple[str, str]:
    """Parse 'Name <email>' format."""
    name, addr = email.utils.parseaddr(from_header)
    return name, addr


def _extract_body(payload: dict) -> str:
    """Extract plain text body from Gmail payload.

    Handles both simple and multipart MIME structures.
    """
    mime_type = payload.get("mimeType", "")

    if mime_type == "text/plain":
        data = payload.get("body", {}).get("data", "")
        return _decode_base64url(data)

    parts = payload.get("parts", [])

    # Try text/plain first, then text/html
    for preferred in ("text/plain", "text/html"):
        for part in parts:
            if part.get("mimeType") == preferred:
                data = part.get("body", {}).get("data", "")
                text = _decode_base64url(data)
                if preferred == "text/html":
                    return _strip_html(text)
                return text

    # Recurse into nested multipart
    for part in parts:
        if part.get("mimeType", "").startswith("multipart/"):
            result = _extract_body(part)
            if result:
                return result

    return ""


def _decode_base64url(data: str) -> str:
    """Decode base64url-encoded string."""
    if not data:
        return ""
    padded = data + "=" * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")


def _strip_html(html: str) -> str:
    """Minimal HTML tag stripping for plain text extraction."""
    import re

    text = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL)
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text
