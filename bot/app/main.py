import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import health, webhook
from app.services.discord_service import close_client, init_client

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_client()
    yield
    await close_client()


app = FastAPI(title="500 Error Auto-Fix Bot", lifespan=lifespan)

app.include_router(health.router)
app.include_router(webhook.router)
