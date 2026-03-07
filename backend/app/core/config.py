from typing import ClassVar
from pydantic import Field
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Uni-Assist Checker"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Gemini
    GOOGLE_GEMINI_API_KEY: str
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # Stripe
    STRIPE_SECRET_KEY: str
    STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    
    # CORS
    
    if DEBUG:
        FRONTEND_URL = "http://localhost:3000"
    else:
        FRONTEND_URL: str = Field(default="https://uniassist-checker.vercel.app")

    # LangSmith (optional — set LANGCHAIN_API_KEY in .env to enable)
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "unimate"

    # Storage
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()