import os

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Smart Traffic Management System")
    VERSION: str = os.getenv("VERSION", "1.0.0")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smart_traffic_secret_key_2026_super_secure")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smart_traffic.db")
    
    CORS_ORIGINS: list = [
        origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()
    ]
    
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
    DATA_MODE: str = os.getenv("DATA_MODE", "recorded_video") # dataset, recorded_video, live

settings = Settings()
