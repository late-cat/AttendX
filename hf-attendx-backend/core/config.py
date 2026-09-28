
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Info
    APP_NAME: str = "AttendX Backend"
    VERSION: str = "2.0.0"
    
    # Security
    API_KEY: str = os.environ.get("API_KEY", "attendx-secret-key-change-me")
    ALLOWED_ORIGINS: list = os.environ.get(
        "ALLOWED_ORIGINS", 
        "https://attend-x-gamma.vercel.app,https://attend-x-alpha.vercel.app,http://localhost:3000"
    ).split(",")
    
    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    TEMP_DIR: str = os.path.join(BASE_DIR, "temp_uploads")
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    EMBEDDINGS_DIR: str = os.path.join(DATA_DIR, "embeddings")
    KNOWN_FACES_DIR: str = os.path.join(DATA_DIR, "known_faces")
    
    # Firebase
    FIREBASE_STORAGE_BUCKET: str = os.environ.get("FIREBASE_STORAGE_BUCKET", "attendx-572c8.firebasestorage.app")
    
    class Config:
        env_file = ".env"

settings = Settings()

# Ensure directories exist
for path in [settings.TEMP_DIR, settings.EMBEDDINGS_DIR, settings.KNOWN_FACES_DIR]:
    os.makedirs(path, exist_ok=True)
