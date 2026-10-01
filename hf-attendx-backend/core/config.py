
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
    TEACHER_EMBEDDINGS_DIR: str = os.path.join(DATA_DIR, "teacher_embeddings")
    TEACHER_FACES_DIR: str = os.path.join(DATA_DIR, "teacher_faces")
    
    # Firebase
    FIREBASE_STORAGE_BUCKET: str = os.environ.get("FIREBASE_STORAGE_BUCKET", "attendx-572c8.firebasestorage.app")

    # Institution geofence. These values are deployment configuration rather
    # than application code, so a new school does not require a code change.
    SCHOOL_LAT: float = float(os.environ.get("SCHOOL_LAT", "22.621798"))
    SCHOOL_LNG: float = float(os.environ.get("SCHOOL_LNG", "88.421795"))
    ALLOWED_RADIUS_METERS: float = float(os.environ.get("ALLOWED_RADIUS_METERS", "200"))

    # Recognition configuration. Classroom recognition is intentionally
    # permissive: quality values are advisory unless explicitly enabled.
    FACE_MATCH_THRESHOLD: float = float(os.environ.get("FACE_MATCH_THRESHOLD", "0.50"))
    MIN_FACE_SIZE: int = int(os.environ.get("MIN_FACE_SIZE", "24"))
    MIN_FACE_BLUR_SCORE: float = float(os.environ.get("MIN_FACE_BLUR_SCORE", "5"))
    MIN_FACE_BRIGHTNESS: float = float(os.environ.get("MIN_FACE_BRIGHTNESS", "15"))
    MAX_FACE_BRIGHTNESS: float = float(os.environ.get("MAX_FACE_BRIGHTNESS", "245"))
    MAX_FACE_ROLL_DEGREES: float = float(os.environ.get("MAX_FACE_ROLL_DEGREES", "45"))
    MAX_FACE_NOSE_OFFSET: float = float(os.environ.get("MAX_FACE_NOSE_OFFSET", "1.5"))
    ENFORCE_FACE_QUALITY: bool = os.environ.get("ENFORCE_FACE_QUALITY", "false").strip().lower() in {"1", "true", "yes", "on"}
    
    class Config:
        env_file = ".env"

settings = Settings()

# Ensure directories exist
for path in [settings.TEMP_DIR, settings.EMBEDDINGS_DIR, settings.KNOWN_FACES_DIR, settings.TEACHER_EMBEDDINGS_DIR, settings.TEACHER_FACES_DIR]:
    os.makedirs(path, exist_ok=True)
