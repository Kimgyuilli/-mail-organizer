import asyncio

from fastapi import APIRouter

from app.services.ai_provider import health_check as ai_health_check
from app.services.discord_service import health_check as discord_health_check
from app.services.github_service import health_check as github_health_check

router = APIRouter()


@router.get("/health")
async def health():
    loop = asyncio.get_running_loop()
    # 동기 함수는 executor에서, 비동기 함수는 직접 실행 — 3개 병렬
    openai_result, github_result, discord_result = await asyncio.gather(
        loop.run_in_executor(None, ai_health_check),
        loop.run_in_executor(None, github_health_check),
        discord_health_check(),
    )
    services = {
        "openai": openai_result,
        "github": github_result,
        "discord": discord_result,
    }
    all_ok = all(s["status"] == "ok" for s in services.values())
    return {"status": "ok" if all_ok else "degraded", "services": services}
