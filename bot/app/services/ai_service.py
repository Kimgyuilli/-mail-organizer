import json
import logging
import os

from app.services.ai_provider import call_ai

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
너는 FastAPI + Next.js 풀스택 애플리케이션의 코드를 분석하고 수정하는 봇이다.
에러 정보와 소스코드를 받아서 수정된 코드를 반환한다.
"에러 발생 소스 코드"는 스택트레이스에 직접 등장한 파일이고,
"관련 참고 코드"는 import로 연결된 참고용 파일이다. 참고 코드는 수정 맥락 파악용이다.
반드시 한국어로만 응답하라. 중국어, 일본어 등 다른 언어를 섞지 마라.
summary는 PR 제목으로 사용되므로 50자 이내의 간결한 한 줄로 작성하라."""

USER_PROMPT_TEMPLATE = """\
## 에러
- 타입: {error_type}
- 메시지: {error_message}

## 스택 트레이스
{stack_trace}

{source_code_section}

## 지시사항
1. 에러 원인을 분석하라
2. 수정이 필요한 파일의 전체 코드를 제공하라
3. 수정 사항을 설명하라"""

RESPONSE_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "error_fix",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "analysis": {"type": "string"},
                "root_cause": {"type": "string"},
                "fix_description": {"type": "string"},
                "files": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "path": {"type": "string"},
                            "content": {"type": "string"},
                        },
                        "required": ["path", "content"],
                        "additionalProperties": False,
                    },
                },
                "summary": {"type": "string"},
            },
            "required": ["analysis", "root_cause", "fix_description", "files", "summary"],
            "additionalProperties": False,
        },
    },
}


def _get_lang_tag(file_path: str) -> str:
    """파일 확장자에 따라 코드 블록 언어 태그를 반환."""
    ext = os.path.splitext(file_path)[1].lower()
    lang_map = {
        ".py": "python",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".js": "javascript",
        ".jsx": "javascript",
        ".json": "json",
        ".html": "html",
        ".css": "css",
        ".sql": "sql",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".toml": "toml",
    }
    return lang_map.get(ext, "")


def _build_source_section(
    error_files: dict[str, str], context_files: dict[str, str]
) -> str:
    parts = ["## 에러 발생 소스 코드 (스택트레이스에 포함된 파일)"]
    for path, content in error_files.items():
        lang = _get_lang_tag(path)
        parts.append(f"### {path}\n```{lang}\n{content}\n```")
    if context_files:
        parts.append("\n## 관련 참고 코드 (import된 프로젝트 내부 파일)")
        for path, content in context_files.items():
            lang = _get_lang_tag(path)
            parts.append(f"### {path}\n```{lang}\n{content}\n```")
    return "\n\n".join(parts)


def validate_ai_result(result: dict, known_files: set[str]) -> str | None:
    """AI 응답 검증. 문제 있으면 사유 문자열, 정상이면 None."""
    files = result.get("files")
    if not files:
        return "수정 파일이 없음"
    for f in files:
        if "path" not in f or "content" not in f:
            return "파일 항목에 path 또는 content 누락"
        if f["path"] not in known_files:
            return f"알 수 없는 파일 경로: {f['path']}"
        if not f["content"].strip():
            return f"빈 파일 내용: {f['path']}"
    return None


def analyze_error(
    error_type: str,
    error_message: str,
    stack_trace: str,
    error_files: dict[str, str],
    context_files: dict[str, str] | None = None,
) -> dict | None:
    """AI API로 에러를 분석하고 수정안을 반환한다. 실패 시 None."""
    user_prompt = USER_PROMPT_TEMPLATE.format(
        error_type=error_type,
        error_message=error_message,
        stack_trace=stack_trace,
        source_code_section=_build_source_section(error_files, context_files or {}),
    )

    try:
        text = call_ai(SYSTEM_PROMPT, user_prompt, response_format=RESPONSE_SCHEMA)
        return json.loads(text)
    except Exception:
        logger.exception("AI API 호출 실패")
        return None
