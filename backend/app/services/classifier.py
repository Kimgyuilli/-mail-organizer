from __future__ import annotations

import json

import anthropic

from app.config import settings

DEFAULT_CATEGORIES = [
    "업무",       # Work
    "개인",       # Personal
    "금융",       # Finance
    "프로모션",   # Promotion
    "뉴스레터",   # Newsletter
    "알림",       # Notification
    "중요",       # Important
]

SYSTEM_PROMPT = """당신은 이메일 분류 전문가입니다.
주어진 이메일의 발신자, 제목, 본문을 분석하여 가장 적절한 카테고리를 분류하세요.

카테고리 목록:
- 업무: 회의, 업무 요청, 팀 커뮤니케이션
- 개인: 개인적인 연락, 가족/친구
- 금융: 은행, 결제, 카드, 보험
- 프로모션: 광고, 마케팅, 할인 쿠폰
- 뉴스레터: 구독 뉴스, 블로그 업데이트
- 알림: 서비스 알림, 비밀번호 변경, 배송 안내
- 중요: 긴급하거나 중요한 메일

응답은 반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트는 포함하지 마세요.
"""

SINGLE_TEMPLATE = """\
이메일:
- 발신자: {from_email} ({from_name})
- 제목: {subject}
- 본문 (일부): {body}

JSON 형식으로 응답:
{{"category": "카테고리명", "confidence": 0.0~1.0, "reason": "분류 이유 한 줄"}}"""

BATCH_TEMPLATE = """\
아래 이메일들을 각각 분류하세요.

{emails_text}

JSON 배열로 응답:
[{{"index": 0, "category": "카테고리명", \
"confidence": 0.0~1.0, "reason": "한 줄"}}, ...]"""


def _truncate_body(body: str | None, max_chars: int = 500) -> str:
    if not body:
        return "(본문 없음)"
    return body[:max_chars] + ("..." if len(body) > max_chars else "")


async def classify_single(
    from_email: str,
    from_name: str,
    subject: str,
    body: str | None,
) -> dict:
    """Classify a single email using Claude API."""
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    user_message = SINGLE_TEMPLATE.format(
        from_email=from_email or "",
        from_name=from_name or "",
        subject=subject or "(제목 없음)",
        body=_truncate_body(body),
    )

    response = await client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=256,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    text = response.content[0].text.strip()
    return json.loads(text)


async def classify_batch(
    emails: list[dict],
) -> list[dict]:
    """Classify multiple emails in a single API call.

    Each email dict should have keys: from_email, from_name, subject, body.
    Returns list of classification results with index.
    """
    if not emails:
        return []

    parts = []
    for i, mail in enumerate(emails):
        parts.append(
            f"[메일 {i}]\n"
            f"- 발신자: {mail.get('from_email', '')} ({mail.get('from_name', '')})\n"
            f"- 제목: {mail.get('subject', '(제목 없음)')}\n"
            f"- 본문: {_truncate_body(mail.get('body'))}"
        )

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    user_message = BATCH_TEMPLATE.format(emails_text="\n\n".join(parts))

    response = await client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    text = response.content[0].text.strip()
    return json.loads(text)
