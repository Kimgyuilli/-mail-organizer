import logging
import traceback
from datetime import datetime, timezone

import httpx
from fastapi import Request, Response
from starlette.middleware.base import (
    BaseHTTPMiddleware,
    RequestResponseEndpoint,
)

from app.config import settings

logger = logging.getLogger(__name__)


class ErrorReporterMiddleware(BaseHTTPMiddleware):
    """500 에러 발생 시 error-bot에 에러 리포트를 전송."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            response = await call_next(request)
        except Exception as exc:
            tb = traceback.format_exc()
            await self._report_error(
                request, type(exc).__name__, str(exc), tb
            )
            raise

        if response.status_code >= 500:
            method = request.method
            path = request.url.path
            code = response.status_code
            await self._report_error(
                request,
                error_type=f"HTTP {code}",
                error_message=f"{method} {path} returned {code}",
                stack_trace="(응답 코드 기반 감지)",
            )

        return response

    async def _report_error(
        self,
        request: Request,
        error_type: str,
        error_message: str,
        stack_trace: str,
    ) -> None:
        if not settings.error_bot_url:
            return

        payload = {
            "errorType": error_type,
            "errorMessage": error_message,
            "stackTrace": stack_trace,
            "requestUrl": f"{request.method} {request.url.path}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                url = f"{settings.error_bot_url}/webhook/error"
                await client.post(url, json=payload)
        except Exception:
            logger.warning(
                "error-bot에 에러 리포트 전송 실패", exc_info=True
            )
