from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import Base
from app.models.base import engine
from app.routers import auth, classify, gmail, inbox, naver
from app.services.background_sync import sync_all_users

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # DB 테이블 생성
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 스케줄러 시작
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        sync_all_users,
        "interval",
        minutes=settings.sync_interval_minutes,
        id="sync_all_users",
        name="전체 사용자 메일 동기화",
    )
    scheduler.start()
    logger.info(
        f"백그라운드 스케줄러 시작 (간격: {settings.sync_interval_minutes}분)"
    )

    yield

    # 스케줄러 종료
    scheduler.shutdown()
    logger.info("백그라운드 스케줄러 종료")


app = FastAPI(title="Mail Organizer", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(classify.router)
app.include_router(gmail.router)
app.include_router(inbox.router)
app.include_router(naver.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
