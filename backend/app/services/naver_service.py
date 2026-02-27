from __future__ import annotations

import asyncio
import email
import email.header
import email.utils
import imaplib
import re
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any


@contextmanager
def _imap_connection(
    host: str,
    port: int,
    user: str,
    password: str,
):
    """Context manager for IMAP connection with guaranteed cleanup."""
    conn = imaplib.IMAP4_SSL(host, port)
    try:
        conn.login(user, password)
        yield conn
    finally:
        try:
            conn.logout()
        except Exception:
            pass


async def verify_credentials(
    host: str,
    port: int,
    user: str,
    password: str,
) -> bool:
    """Test IMAP login. Returns True if successful."""

    def _test():
        with _imap_connection(host, port, user, password):
            return True

    return await asyncio.to_thread(_test)


async def list_folders(
    host: str,
    port: int,
    user: str,
    password: str,
) -> list[str]:
    """List all IMAP folders."""

    def _fetch():
        with _imap_connection(host, port, user, password) as conn:
            status, data = conn.list()
            if status != "OK":
                return []
            folders = []
            for item in data:
                if item is None:
                    continue
                if isinstance(item, bytes):
                    decoded = item.decode(
                        "utf-8", errors="replace"
                    )
                else:
                    decoded = item
                # Parse folder name from IMAP LIST response
                # Format: (\\flags) "delimiter" "folder_name"
                match = re.search(
                    r'"[^"]*"\s+"?([^"]*)"?\s*$', decoded
                )
                if match:
                    folders.append(match.group(1))
                else:
                    parts = decoded.rsplit('"', 2)
                    if len(parts) >= 2:
                        folders.append(parts[-2])
            return folders

    return await asyncio.to_thread(_fetch)


async def fetch_messages(
    host: str,
    port: int,
    user: str,
    password: str,
    folder: str = "INBOX",
    since_uid: str | None = None,
    max_results: int = 50,
) -> dict[str, Any]:
    """Fetch messages from a folder via IMAP.

    Returns dict with 'messages' (list[dict]) and
    'last_uid' (str | None).
    If since_uid is provided, fetches only messages
    with UID > since_uid.
    """

    def _fetch():
        with _imap_connection(
            host, port, user, password
        ) as conn:
            status, _ = conn.select(folder, readonly=True)
            if status != "OK":
                return {
                    "messages": [],
                    "last_uid": since_uid,
                }

            # Search for messages
            if since_uid:
                try:
                    uid_start = int(since_uid) + 1
                except ValueError:
                    uid_start = 1
                search_criteria = f"UID {uid_start}:*"
                status, data = conn.uid(
                    "SEARCH", None, search_criteria
                )
            else:
                status, data = conn.uid(
                    "SEARCH", None, "ALL"
                )

            if status != "OK" or not data[0]:
                return {
                    "messages": [],
                    "last_uid": since_uid,
                }

            uids = data[0].split()

            # Filter out since_uid itself (range is inclusive)
            if since_uid:
                try:
                    threshold = int(since_uid)
                    uids = [
                        u for u in uids
                        if int(u) > threshold
                    ]
                except ValueError:
                    pass

            if not uids:
                return {
                    "messages": [],
                    "last_uid": since_uid,
                }

            # Take most recent N messages
            uids = uids[-max_results:]

            messages = []
            for uid in uids:
                msg = _fetch_single(conn, uid, folder)
                if msg:
                    messages.append(msg)

            if uids:
                last = uids[-1]
                last_uid = _uid_to_str(last)
            else:
                last_uid = since_uid

            return {
                "messages": messages,
                "last_uid": last_uid,
            }

    return await asyncio.to_thread(_fetch)


def _fetch_single(
    conn: imaplib.IMAP4_SSL,
    uid: bytes | str,
    folder: str,
) -> dict[str, Any] | None:
    """Fetch and parse a single message by UID."""
    status, msg_data = conn.uid(
        "FETCH", uid, "(RFC822 FLAGS)"
    )
    if status != "OK" or not msg_data or not msg_data[0]:
        return None

    raw_email = msg_data[0]
    if not isinstance(raw_email, tuple):
        return None

    flags_part = raw_email[0]
    body = raw_email[1]

    uid_str = _uid_to_str(uid)
    parsed = _parse_email(body, uid_str)

    # Check flags for read status
    if isinstance(flags_part, bytes):
        flags_str = flags_part.decode(
            "utf-8", errors="replace"
        )
    else:
        flags_str = str(flags_part)
    parsed["is_read"] = "\\Seen" in flags_str
    parsed["folder"] = folder

    return parsed


def _uid_to_str(uid: bytes | str) -> str:
    """Convert IMAP UID to string."""
    if isinstance(uid, bytes):
        return uid.decode()
    return str(uid)


def _parse_email(
    raw_bytes: bytes, uid: str
) -> dict[str, Any]:
    """Parse raw email bytes into a flat dict."""
    msg = email.message_from_bytes(raw_bytes)

    from_header = msg.get("From", "")
    from_name, from_email_addr = _decode_header_addr(
        from_header
    )

    to_header = msg.get("To", "")
    _, to_email_addr = _decode_header_addr(to_header)

    subject = _decode_header_value(msg.get("Subject", ""))

    body_text = _extract_body(msg)

    date_header = msg.get("Date", "")
    received_at = _parse_date(date_header)

    return {
        "external_id": uid,
        "from_email": from_email_addr,
        "from_name": from_name,
        "to_email": to_email_addr,
        "subject": subject,
        "body_text": body_text,
        "received_at": received_at,
        "is_read": False,
        "folder": "INBOX",
    }


def _decode_header_value(value: str | None) -> str:
    """Decode MIME encoded header value."""
    if not value:
        return ""
    parts = email.header.decode_header(value)
    decoded_parts = []
    for part, charset in parts:
        if isinstance(part, bytes):
            decoded_parts.append(
                part.decode(charset or "utf-8", errors="replace")
            )
        else:
            decoded_parts.append(part)
    return " ".join(decoded_parts)


def _decode_header_addr(
    header: str,
) -> tuple[str, str]:
    """Decode and parse 'Name <email>' header."""
    decoded = _decode_header_value(header)
    name, addr = email.utils.parseaddr(decoded)
    return name, addr


def _extract_body(msg: email.message.Message) -> str:
    """Extract plain text body from email message."""
    if not msg.is_multipart():
        content_type = msg.get_content_type()
        payload = msg.get_payload(decode=True)
        if payload is None:
            return ""
        charset = msg.get_content_charset() or "utf-8"
        text = payload.decode(charset, errors="replace")
        if content_type == "text/html":
            return _strip_html(text)
        return text

    # Multipart: prefer text/plain, fallback to text/html
    for preferred in ("text/plain", "text/html"):
        for part in msg.walk():
            if part.get_content_type() == preferred:
                payload = part.get_payload(decode=True)
                if payload is None:
                    continue
                charset = (
                    part.get_content_charset() or "utf-8"
                )
                text = payload.decode(
                    charset, errors="replace"
                )
                if preferred == "text/html":
                    return _strip_html(text)
                return text

    return ""


def _strip_html(html: str) -> str:
    """Minimal HTML tag stripping."""
    text = re.sub(
        r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL
    )
    text = re.sub(
        r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL
    )
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _parse_date(date_str: str) -> datetime | None:
    """Parse email Date header to datetime."""
    if not date_str:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(date_str)
    except (ValueError, TypeError):
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)
