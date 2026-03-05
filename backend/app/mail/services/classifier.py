from __future__ import annotations

import asyncio
import json
from typing import Callable

from openai import AsyncOpenAI

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
"""

SINGLE_TEMPLATE = """\
이메일:
- 발신자: {from_email} ({from_name})
- 제목: {subject}
- 본문 (일부): {body}
"""

BATCH_TEMPLATE = """\
아래 이메일들을 각각 분류하세요.

{emails_text}"""

MODEL = "gpt-4o-mini"

SINGLE_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "email_classification",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string"},
                "confidence": {"type": "number"},
                "reason": {"type": "string"},
            },
            "required": ["category", "confidence", "reason"],
            "additionalProperties": False,
        },
    },
}

BATCH_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "batch_classification",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "index": {"type": "integer"},
                            "category": {"type": "string"},
                            "confidence": {"type": "number"},
                            "reason": {"type": "string"},
                        },
                        "required": [
                            "index",
                            "category",
                            "confidence",
                            "reason",
                        ],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["results"],
            "additionalProperties": False,
        },
    },
}

# 최대 동시 API 호출 수
_MAX_CONCURRENT = 3
_semaphore = asyncio.Semaphore(_MAX_CONCURRENT)


def _truncate_body(body: str | None, max_chars: int = 300) -> str:
    if not body:
        return "(본문 없음)"
    return body[:max_chars] + ("..." if len(body) > max_chars else "")


def _build_feedback_section(examples: list[dict]) -> str:
    """사용자 피드백 예시를 프롬프트에 추가할 섹션으로 변환."""
    if not examples:
        return ""

    lines = [
        "## 사용자의 이전 분류 수정 기록 (이 패턴을 참고하세요):",
        "",
    ]

    for ex in examples[:10]:
        from_info = f"{ex.get('from_email', '')} ({ex.get('from_name', '')})"
        subject = ex.get("subject", "")
        original = ex.get("original_category", "")
        corrected = ex.get("corrected_category", "")

        lines.append(
            f'- "발신자: {from_info}, 제목: {subject}" '
            f'→ 원래 "{original}"로 분류했으나 사용자가 "{corrected}"로 수정'
        )

    return "\n".join(lines)


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.openai_api_key)


async def classify_single(
    from_email: str,
    from_name: str,
    subject: str,
    body: str | None,
    feedback_examples: list[dict] | None = None,
    sender_rules: dict[str, str] | None = None,
) -> dict:
    """Classify a single email using OpenAI API."""
    if sender_rules and from_email and from_email in sender_rules:
        return {
            "category": sender_rules[from_email],
            "confidence": 1.0,
            "reason": "발신자 규칙 적용 (사용자 피드백 기반)",
        }

    client = _get_client()

    system_prompt = SYSTEM_PROMPT
    if feedback_examples:
        feedback_section = _build_feedback_section(feedback_examples)
        system_prompt = f"{SYSTEM_PROMPT}\n\n{feedback_section}"

    user_message = SINGLE_TEMPLATE.format(
        from_email=from_email or "",
        from_name=from_name or "",
        subject=subject or "(제목 없음)",
        body=_truncate_body(body),
    )

    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=256,
        response_format=SINGLE_RESPONSE_FORMAT,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )

    return json.loads(response.choices[0].message.content)


async def _process_chunk(
    chunk: list[dict],
    chunk_start: int,
    index_map: dict[int, int],
    client: AsyncOpenAI,
    system_prompt: str,
) -> list[dict]:
    """단일 청크를 처리하고 원본 인덱스로 매핑."""
    parts = []
    for i, mail in enumerate(chunk):
        parts.append(
            f"[메일 {i}]\n"
            f"- 발신자: {mail.get('from_email', '')} "
            f"({mail.get('from_name', '')})\n"
            f"- 제목: {mail.get('subject', '(제목 없음)')}\n"
            f"- 본문: {_truncate_body(mail.get('body'))}"
        )

    user_message = BATCH_TEMPLATE.format(emails_text="\n\n".join(parts))

    async with _semaphore:
        response = await client.chat.completions.create(
            model=MODEL,
            max_tokens=4096,
            response_format=BATCH_RESPONSE_FORMAT,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )

    parsed = json.loads(response.choices[0].message.content)
    chunk_results = parsed["results"]

    for result in chunk_results:
        ai_index = result.get("index", 0)
        key = chunk_start + ai_index
        original_index = index_map.get(key, key)
        result["index"] = original_index

    return chunk_results


async def classify_batch(
    emails: list[dict],
    feedback_examples: list[dict] | None = None,
    sender_rules: dict[str, str] | None = None,
    on_progress: Callable[[int, int], None] | None = None,
) -> list[dict]:
    """Classify multiple emails with parallel chunk processing."""
    if not emails:
        return []

    auto_classified = []
    needs_ai = []
    index_map: dict[int, int] = {}

    for i, mail in enumerate(emails):
        from_email = mail.get("from_email", "")
        if sender_rules and from_email and from_email in sender_rules:
            auto_classified.append({
                "index": i,
                "category": sender_rules[from_email],
                "confidence": 1.0,
                "reason": "발신자 규칙 적용 (사용자 피드백 기반)",
            })
        else:
            index_map[len(needs_ai)] = i
            needs_ai.append(mail)

    total = len(emails)

    if auto_classified and on_progress:
        on_progress(len(auto_classified), total)

    if not needs_ai:
        return auto_classified

    client = _get_client()

    system_prompt = SYSTEM_PROMPT
    if feedback_examples:
        feedback_section = _build_feedback_section(feedback_examples)
        system_prompt = f"{SYSTEM_PROMPT}\n\n{feedback_section}"

    chunk_size = 15
    ai_results: list[dict] = []

    # 청크별 코루틴 생성
    tasks = []
    chunk_starts = []
    for chunk_start in range(0, len(needs_ai), chunk_size):
        chunk = needs_ai[chunk_start : chunk_start + chunk_size]
        tasks.append(
            _process_chunk(chunk, chunk_start, index_map, client, system_prompt)
        )
        chunk_starts.append(chunk_start)

    # 병렬 처리 + 진행률 콜백
    processed = len(auto_classified)
    for coro in asyncio.as_completed(tasks):
        chunk_results = await coro
        ai_results.extend(chunk_results)
        processed += len(chunk_results)
        if on_progress:
            on_progress(processed, total)

    all_results = auto_classified + ai_results
    all_results.sort(key=lambda x: x.get("index", 0))

    return all_results
