from fastapi import FastAPI
from app.core.config import settings
from app.api.v1.router import api_v1_router
from app.core.logging import setup_logging
setup_logging()
def Create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)
    app.include_router(api_v1_router, prefix="/api/v1")
    return app
app = Create_app()