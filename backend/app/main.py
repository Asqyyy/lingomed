from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import health, chat, voice
from app.config import config
from app.rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Validating configuration...")
    config.validate()
    logger.info("Configuration valid. LingoMed backend starting.")
    yield
    logger.info("LingoMed backend shutting down.")


app = FastAPI(title="LingoMed", version="0.1.0", lifespan=lifespan)

# Attach limiter so routers can reach it via request.app.state.limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(voice.router)


@app.get("/")
@limiter.limit("5/minute")
async def root(request: Request):
    return {"app": "LingoMed", "version": "0.1.0", "status": "running"}
