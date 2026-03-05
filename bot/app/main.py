import logging

from fastapi import FastAPI

from app.routers import health, webhook

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="500 Error Auto-Fix Bot")

app.include_router(health.router)
app.include_router(webhook.router)
