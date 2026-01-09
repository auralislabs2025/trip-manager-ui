from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Trip Tracker"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_prefix = "TRIP_TRACKER_"
        env_nested_delimiter = "__"
settings = Settings()