# app/core/config.py
from pydantic_settings import BaseSettings
from pydantic import PostgresDsn, computed_field, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str
    API_V1_STR: str = "/api/v1"
    
    API_V1_STR: str = "/api/v1"
    
    # DATABASE_URL (Required)
    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # SUPABASE CONFIG
    SUPABASE_URL: str
    SUPABASE_KEY: str

    SEPAY_API_URL: str
    SEPAY_ACCESS_TOKEN: str
    VIETQR_API_URL: str
    VIETQR_CLIENT_ID: str
    VIETQR_API_KEY: str
    
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int
    MAIL_SERVER: str

    SEPAY_WEBHOOK_KEY: str
    
    UPLOAD_DIR: str = "storage/uploads"



    @field_validator("DATABASE_URL")
    def assemble_db_connection(cls, v: str) -> str:
        if v and v.startswith("postgresql://") and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()