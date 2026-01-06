
from fastapi import APIRouter
from services.firestore_db import get_sync_version
from services.firebase_storage import get_storage_usage
from core.config import settings
import os
import time

router = APIRouter()

@router.get("/")
def read_root():
    return {"status": "AttendX Backend Running", "timestamp": time.time()}

@router.get("/system/status")
def get_status():
    return {"status": "online", "model": "ArcFace", "backend": "FastAPI"}

@router.get("/stats")
def get_stats():
    """Return system statistics."""
    total_students = 0
    if os.path.exists(settings.EMBEDDINGS_DIR):
        total_students = len([f for f in os.listdir(settings.EMBEDDINGS_DIR) if f.endswith('.npy')])
    
    return {
        "total_students": total_students,
        "model": "ArcFace",
        "threshold": 0.50
    }

@router.get("/storage/stats")
def get_storage_stats():
    """Return Firebase Storage statistics."""
    try:
        stats = get_storage_usage()
        return {
            "status": "success",
            "firebase_storage": stats,
            "local_embeddings": len([f for f in os.listdir(settings.EMBEDDINGS_DIR) if f.endswith('.npy')]) if os.path.exists(settings.EMBEDDINGS_DIR) else 0
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.get("/sync/version")
def get_sync_version_endpoint():
    """Get current sync version for cache invalidation."""
    return get_sync_version()
