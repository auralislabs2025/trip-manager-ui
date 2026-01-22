from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_v1_router
from app.core.logging import setup_logging
from app.core.init_db import init_db
import logging

setup_logging()
logger = logging.getLogger(__name__)

def Create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)
    
    # Add CORS middleware to allow frontend requests
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, specify actual origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize database on startup
    @app.on_event("startup")
    async def startup_event():
        try:
            init_db()
            logger.info("Application startup completed")
        except Exception as e:
            logger.warning(f"Database initialization failed, will use JSON fallback: {e}")
    
    app.include_router(api_v1_router, prefix="/api/v1")
    return app

app = Create_app()