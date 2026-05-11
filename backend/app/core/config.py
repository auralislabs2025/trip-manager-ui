from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    APP_NAME: str
    DEBUG: bool
    LOG_LEVEL: str
    APP_ENV: str


    # Database
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Resend (for contact form emails)
    RESEND_API_KEY: Optional[str] = None

    # SMTP fallback (used when RESEND_API_KEY is not set)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = Field(
        default=None,
        validation_alias="SMTP_EMAIL",  # backward compat with older env naming
    )
    SMTP_PASSWORD: Optional[str] = Field(
        default=None,
        validation_alias="SMTP_APP_PASSWORD",  # backward compat with older env naming
    )
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: Optional[str] = None
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        env_file = ".env"
        env_prefix = "TRIP_TRACKER_"
        env_file_encoding = "utf-8"
        extra = "ignore"
    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

settings = Settings() 