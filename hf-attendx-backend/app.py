
# TensorFlow environment configuration (MUST be before TensorFlow import)
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import sys

# Fix imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)
sys.path.insert(0, current_dir)

from core.config import settings
from config.firebase_admin import initialize_firebase
from services.firebase_storage import download_all_embeddings
from routers import general, attendance, students, teachers

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title=settings.APP_NAME, version=settings.VERSION)

# Add rate limit error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup
@app.on_event("startup")
async def startup_event():
    """Initialize Firebase and download embeddings on startup"""
    logger.info("🚀 Starting AttendX Backend...")
    try:
        initialize_firebase()
        logger.info("✅ Firebase initialized")
        
        # Smart embedding caching
        os.makedirs(settings.EMBEDDINGS_DIR, exist_ok=True)
        local_embeddings = [f for f in os.listdir(settings.EMBEDDINGS_DIR) if f.endswith('.npy')]
        
        if len(local_embeddings) == 0:
            logger.info("📥 No local embeddings found. Downloading from Firebase...")
            count = download_all_embeddings(settings.EMBEDDINGS_DIR)
            logger.info(f"✅ Downloaded {count} embeddings")
        else:
            logger.info(f"✅ Using {len(local_embeddings)} cached embeddings")
            
    except Exception as e:
        logger.error(f"⚠️ Startup warning: {e}")

# Include Routers
app.include_router(general.router)
app.include_router(attendance.router)
app.include_router(students.router)
app.include_router(teachers.router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
