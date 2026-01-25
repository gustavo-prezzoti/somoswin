"""
Configuration settings for Lead Qualifier Service
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Java API Configuration
    java_api_url: str = "http://backend:8080"
    internal_api_key: str = "winai-lq-f8a9b2c7e4d1-2026-xK9mN3pL"
    
    # OpenAI Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    
    # Redis Configuration
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_db: int = 0
    
    # Scheduler Configuration
    cron_interval_minutes: int = 30
    run_on_startup: bool = True
    
    # Queue Configuration
    queue_name: str = "lead-qualification"
    max_workers: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
