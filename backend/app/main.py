from fastapi import FastAPI
from app.core.config import settings
from app.api.v1.router import api_router
def Create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)
    app.include_router(api_router)
    return app
app = Create_app()