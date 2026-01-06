# TensorFlow environment configuration (MUST be before TensorFlow import)
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Reduce TF logging
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import shutil
import uuid
import sys
import logging
import re

import pandas as pd
from datetime import datetime
import time

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Fix imports for deployment - add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)
sys.path.insert(0, current_dir)

# Import from local subdirectories (HF Spaces flat structure)
from vision.recognizer import recognize_face, reload_embeddings, ATTENDANCE_FILE
from vision.embedding_utils import generate_embeddings_for_person
from config.firebase_admin import (
    initialize_firebase,
    upload_student_images,
    upload_embedding,
    download_all_embeddings,
    sync_embeddings_to_firebase,
    get_storage_usage,
    delete_student_data,
    # Firestore functions
    save_attendance_log,
    get_attendance_logs,
    get_attendance_logs_by_date,  # NEW: Efficient single-date query
    get_today_attendance as get_today_attendance_firestore,
    clear_today_attendance_firestore,
    get_all_students_with_photo_counts,
    # Metadata optimization
    update_student_metadata,
    delete_student_metadata,
    get_all_students_from_metadata,
    # Sync version (cache invalidation)
    bump_sync_version,
    get_sync_version
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI()

# Add rate limit error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration - explicitly list allowed origins
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", 
    "https://attend-x-gamma.vercel.app,https://attend-x-alpha.vercel.app,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security: Input validation helper
def sanitize_student_name(name: str) -> str:
    """Sanitize student name to prevent path traversal attacks."""
    # Keep only alphanumeric, spaces, hyphens
    sanitized = re.sub(r'[^a-zA-Z0-9\s\-]', '', name).strip()[:50]
    if not sanitized:
        raise ValueError("Invalid student name")
    return sanitized

TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

# Paths (relative to app.py in HF Spaces)
EMBEDDINGS_DIR = os.path.join(os.path.dirname(__file__), "data/embeddings")
KNOWN_FACES_DIR = os.path.join(os.path.dirname(__file__), "data/known_faces")

@app.on_event("startup")
async def startup_event():
    """Initialize Firebase and download embeddings on startup"""
    logger.info("🚀 Starting AttendX Backend...")
    
    try:
        # Initialize Firebase
        initialize_firebase()
        logger.info("✅ Firebase initialized")
        
        # Smart embedding caching: Download from Firebase if local is empty
        os.makedirs(EMBEDDINGS_DIR, exist_ok=True)
        local_embeddings = [f for f in os.listdir(EMBEDDINGS_DIR) if f.endswith('.npy')]
        
        if len(local_embeddings) == 0:
            logger.info("📥 No local embeddings found. Downloading from Firebase...")
            count = download_all_embeddings(EMBEDDINGS_DIR)
            logger.info(f"✅ Downloaded {count} embeddings from Firebase")
        else:
            logger.info(f"✅ Using {len(local_embeddings)} cached embeddings")
        
    except Exception as e:
        logger.error(f"⚠️ Startup warning: {e}")
        logger.info("Continuing without Firebase (development mode)")

@app.get("/")
def read_root():
    return {"status": "AttendX Backend Running", "timestamp": time.time()}

@app.get("/stats")
def get_stats():
    """Return system statistics."""
    # Count total students from embeddings (same source as /students)
    total_students = 0
    if os.path.exists(EMBEDDINGS_DIR):
        total_students = len([
            f for f in os.listdir(EMBEDDINGS_DIR) 
            if f.endswith('.npy')
        ])
    
    return {
        "total_students": total_students,
        "model": "ArcFace",
        "threshold": 0.50
    }

@app.get("/storage/stats")
def get_storage_stats():
    """Return Firebase Storage statistics."""
    try:
        stats = get_storage_usage()
        return {
            "status": "success",
            "firebase_storage": stats,
            "local_embeddings": len([f for f in os.listdir(EMBEDDINGS_DIR) if f.endswith('.npy')]) if os.path.exists(EMBEDDINGS_DIR) else 0
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@app.get("/system/status")
def get_status():
    return {"status": "online", "model": "ArcFace", "backend": "FastAPI"}

@app.get("/sync/version")
def get_sync_version_endpoint():
    """
    Get current sync version for cache invalidation.
    Frontend listens to this to know when to refetch data.
    """
    return get_sync_version()

@app.get("/attendance/logs")
def get_logs(date: str = None, days: int = None, refresh: bool = False):
    """
    Return attendance logs from Firestore with optional filtering.
    Optimized: Cached for 60 seconds to reduce Firestore reads.
    
    Args:
        date: Specific date (YYYY-MM-DD). If provided, returns only that date.
        days: Number of days to fetch (default: 7, max: 15). Ignored if date is provided.
        refresh: Force refresh cache if True.
    
    Examples:
        /attendance/logs?date=2025-12-28  → Only Dec 28 logs
        /attendance/logs?days=7           → Last 7 days
        /attendance/logs                  → Default: last 7 days
    """
    global _logs_cache
    
    # Build cache key
    cache_key = f"date_{date}" if date else f"days_{days or 7}"
    
    # Check cache validity
    if not refresh:
        cached_data = _logs_cache["data"].get(cache_key)
        cached_time = _logs_cache["timestamp"].get(cache_key, 0)
        cache_age = time.time() - cached_time
        
        if cached_data and cache_age < _logs_cache["ttl"]:
            logger.info(f"📦 Serving cached logs for {cache_key} (age: {int(cache_age)}s)")
            return {"logs": cached_data, "cached": True}
    
    try:
        if date:
            # Single date query - most efficient for "Today" filter
            logs = get_attendance_logs_by_date(date)
        else:
            # Multi-day query with limit
            query_days = min(days or 7, 15)  # Default 7, max 15
            logs = get_attendance_logs(days=query_days)
        
        # Update cache
        _logs_cache["data"][cache_key] = logs
        _logs_cache["timestamp"][cache_key] = time.time()
        
        return {"logs": logs}
    except Exception as e:
        logger.error(f"❌ Failed to get logs: {e}")
        return {"logs": [], "error": str(e)}

@app.delete("/attendance/clear/today")
def clear_today_attendance():
    """Clear only today's attendance records from Firestore."""
    try:
        deleted = clear_today_attendance_firestore()
        logger.info(f"🗑️ Cleared {deleted} attendance records for today")
        
        # Invalidate caches and bump sync version
        invalidate_all_caches()
        bump_sync_version("clear")
        
        return {
            "status": "success",
            "message": f"Cleared {deleted} records for today",
            "deleted": deleted
        }
    except Exception as e:
        logger.error(f"❌ Clear today failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attendance/today")
def get_today_logs(refresh: bool = False):
    """
    Return only today's attendance from Firestore.
    Optimized: Cached for 60 seconds to reduce Firestore reads.
    
    Args:
        refresh: Force refresh cache if True.
    """
    global _today_cache
    
    # Check cache validity
    cache_age = time.time() - _today_cache["timestamp"]
    if not refresh and _today_cache["data"] and cache_age < _today_cache["ttl"]:
        logger.info(f"📦 Serving cached today's attendance (age: {int(cache_age)}s)")
        return {**_today_cache["data"], "cached": True}
    
    try:
        result = get_today_attendance_firestore()
        
        # Update cache
        _today_cache["data"] = result
        _today_cache["timestamp"] = time.time()
        
        return result
    except Exception as e:
        logger.error(f"❌ Failed to get today's logs: {e}")
        return {"logs": [], "stats": {"present": 0, "total_entries": 0}, "error": str(e)}

@app.post("/recognize")
@limiter.limit("20/minute")
async def recognize_api(request: Request, file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Save temp file
    temp_filename = f"{uuid.uuid4()}.jpg"
    temp_path = os.path.join(TEMP_DIR, temp_filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Run recognition
        results = recognize_face(temp_path)
        
        # Cleanup
        os.remove(temp_path)
        
        # Determine overall status
        status = "unknown"
        name = "Unknown"
        message = "No face detected"
        
        if results:
            # Pick best result (lowest distance or first match)
            # Logic: If any result is 'present' or 'marked', that's our match
            for res in results:
                if res['status'] in ['present', 'marked']:
                    status = res['status']
                    name = res['name']
                    message = res['message']
                    break
            else:
                # If no match found among faces
                if results[0]['status'] == 'unknown':
                    message = "Face not recognized"
        
        return {
            "status": status,
            "name": name,
            "message": message,
            "details": results
        }

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/register-student")
@limiter.limit("20/minute")
async def register_student(request: Request, name: str = Form(...), files: list[UploadFile] = File(...)):
    """Register a new student with their face images."""
    if not name or not files:
        raise HTTPException(status_code=400, detail="Name and images required")
    
    # Security: Sanitize student name
    try:
        name = sanitize_student_name(name)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student name")
    
    # Validation: Max 10 images per student
    MAX_FILES = 10
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES} images allowed")
    
    # Create student folder locally
    student_dir = os.path.join(KNOWN_FACES_DIR, name)
    os.makedirs(student_dir, exist_ok=True)
    
    try:
        # Step 1: Save uploaded images locally
        logger.info(f"📥 Saving {len(files)} images for {name}...")
        for idx, file in enumerate(files):
            file_path = os.path.join(student_dir, f"{idx+1}.jpg")
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        
        # Step 2: Generate embeddings from local images
        logger.info(f"🧠 Generating embeddings for {name}...")
        success, embed_message = generate_embeddings_for_person(name, student_dir, EMBEDDINGS_DIR)
        
        if not success:
            raise HTTPException(status_code=400, detail=embed_message)
        
        # Step 3: Upload images to Firebase Storage
        logger.info(f"☁️ Uploading images to Firebase for {name}...")
        try:
            image_urls = upload_student_images(student_dir, name)
            logger.info(f"✅ Uploaded {len(image_urls)} images to Firebase")
        except Exception as e:
            logger.warning(f"⚠️ Firebase upload failed: {e}")
            image_urls = []
        
        # Step 4: Upload embedding to Firebase Storage (smart caching!)
        logger.info(f"☁️ Uploading embedding to Firebase for {name}...")
        try:
            embedding_path = os.path.join(EMBEDDINGS_DIR, f"{name}.npy")
            upload_embedding(name, embedding_path)
            logger.info(f"✅ Uploaded embedding to Firebase")
        except Exception as e:
            logger.warning(f"⚠️ Embedding upload failed: {e}")
        
        # Step 5: Reload embeddings cache for immediate recognition
        reload_embeddings()
        logger.info(f"✅ Embeddings cache refreshed")
        
        # Step 6: Update metadata (Optimization)
        try:
            update_student_metadata(name, len(image_urls))
        except Exception as e:
            logger.warning(f"⚠️ Failed to update metadata: {e}")
        
        # Step 7: Invalidate all caches and bump sync version
        invalidate_all_caches()
        bump_sync_version("register")
        
        return {
            "status": "success",
            "message": embed_message,  # Use detailed message from embedding generation
            "image_urls": image_urls,
            "embeddings_cached": True
        }
            
    except HTTPException:
        # Cleanup on validation failure
        if os.path.exists(student_dir):
            shutil.rmtree(student_dir)
        raise
    except Exception as e:
        # Cleanup on failure
        if os.path.exists(student_dir):
            shutil.rmtree(student_dir)
        logger.error(f"❌ Registration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/students")
def list_students():
    """List all registered students (Optimized). using metadata."""
    try:
        # 1. Try fast metadata query
        students = get_all_students_from_metadata()
        
        # 2. If empty but embeddings exist, might need migration (First run)
        if not students and os.path.exists(EMBEDDINGS_DIR) and os.listdir(EMBEDDINGS_DIR):
            logger.info("⚠️ Metadata empty but embeddings exist. Migrating...")
            
            # Fallback to slow method
            students = get_all_students_with_photo_counts()
            
            # Populate metadata for next time (Lazy Migration)
            for s in students:
                try:
                    update_student_metadata(s['name'], s['image_count'])
                except:
                    pass
            
            logger.info("✅ Migration complete")
            
        return {
            "students": students,
            "total": len(students)
        }
    except Exception as e:
        logger.error(f"❌ Failed to list students: {e}")
        return {"students": [], "total": 0, "error": str(e)}


# In-memory cache for student attendance data
_attendance_cache = {
    "data": None,
    "timestamp": 0,
    "ttl": 300  # 5 minutes cache
}

# Cache for today's attendance
_today_cache = {
    "data": None,
    "timestamp": 0,
    "ttl": 60  # 60 seconds cache
}

# Cache for attendance logs (keyed by filter)
_logs_cache = {
    "data": {},      # {filter_key: data}
    "timestamp": {}, # {filter_key: timestamp}
    "ttl": 60        # 60 seconds cache
}

def invalidate_all_caches():
    """Invalidate all server-side caches. Called after data mutations."""
    global _attendance_cache, _today_cache, _logs_cache
    _attendance_cache["data"] = None
    _attendance_cache["timestamp"] = 0
    _today_cache["data"] = None
    _today_cache["timestamp"] = 0
    _logs_cache["data"] = {}
    _logs_cache["timestamp"] = {}
    logger.info("🗑️ All caches invalidated")

@app.get("/students/with-attendance")
def get_students_with_attendance(refresh: bool = False):
    """
    Get all students with their attendance percentage (last 15 days).
    Optimized: Cached for 5 minutes to reduce Firestore reads.
    
    Args:
        refresh: Force refresh cache if True
    """
    global _attendance_cache
    
    # Check cache validity
    cache_age = time.time() - _attendance_cache["timestamp"]
    if not refresh and _attendance_cache["data"] and cache_age < _attendance_cache["ttl"]:
        logger.info(f"📦 Serving cached attendance data (age: {int(cache_age)}s)")
        return _attendance_cache["data"]
    
    try:
        from collections import defaultdict
        
        # 1. Get all students from metadata
        students = get_all_students_from_metadata()
        
        # 2. Get attendance logs for last 15 days (ONE efficient query)
        logs = get_attendance_logs(days=15)
        
        # 3. Count unique days present per student
        attendance_by_student = defaultdict(set)  # name -> set of dates
        for log in logs:
            attendance_by_student[log['Name']].add(log['Date'])
        
        # 4. Calculate percentage for each student
        period_days = 15
        for student in students:
            days_present = len(attendance_by_student.get(student['name'], set()))
            student['days_present'] = days_present
            student['attendance_pct'] = round((days_present / period_days) * 100)
        
        result = {
            "students": students,
            "total": len(students),
            "period_days": period_days
        }
        
        # Update cache
        _attendance_cache["data"] = result
        _attendance_cache["timestamp"] = time.time()
        
        logger.info(f"✅ Calculated attendance for {len(students)} students (cache refreshed)")
        return result
    except Exception as e:
        logger.error(f"❌ Failed to get students with attendance: {e}")
        return {"students": [], "total": 0, "period_days": 15, "error": str(e)}


@app.delete("/delete-student/{student_name}")
async def delete_student(student_name: str):
    """Delete a student from local storage and Firebase."""
    if not student_name:
        raise HTTPException(status_code=400, detail="Student name required")
    
    logger.info(f"🗑️ Deleting student: {student_name}")
    
    deleted_local = False
    deleted_firebase = False
    
    try:
        # 1. Delete local images folder
        student_dir = os.path.join(KNOWN_FACES_DIR, student_name)
        if os.path.exists(student_dir):
            shutil.rmtree(student_dir)
            logger.info(f"✅ Deleted local images: {student_dir}")
            deleted_local = True
        
        # 2. Delete local embedding
        embedding_path = os.path.join(EMBEDDINGS_DIR, f"{student_name}.npy")
        if os.path.exists(embedding_path):
            os.remove(embedding_path)
            logger.info(f"✅ Deleted local embedding: {embedding_path}")
            deleted_local = True
        
        # 3. Delete from Firebase
        try:
            delete_student_data(student_name)
            deleted_firebase = True
            logger.info(f"✅ Deleted from Firebase: {student_name}")
        except Exception as e:
            logger.warning(f"⚠️ Firebase delete failed: {e}")
        
        if not deleted_local and not deleted_firebase:
            raise HTTPException(status_code=404, detail=f"Student '{student_name}' not found")
        
        # 4. Delete student's attendance records
        deleted_attendance = 0
        if os.path.exists(ATTENDANCE_FILE):
            try:
                df = pd.read_csv(ATTENDANCE_FILE)
                original_count = len(df)
                df = df[df["Name"] != student_name]
                df.to_csv(ATTENDANCE_FILE, index=False)
                deleted_attendance = original_count - len(df)
                logger.info(f"✅ Deleted {deleted_attendance} attendance records for {student_name}")
            except Exception as e:
                logger.warning(f"⚠️ Attendance cleanup failed: {e}")
        
        # 5. Delete metadata (Optimization)
        try:
            delete_student_metadata(student_name)
        except Exception as e:
            logger.warning(f"⚠️ Metadata cleanup failed: {e}")
            
        # Reload embeddings cache so deleted student is no longer recognized
        reload_embeddings()
        logger.info(f"✅ Embeddings cache refreshed")
        
        # Invalidate all caches and bump sync version
        invalidate_all_caches()
        bump_sync_version("delete")
        
        return {
            "status": "success",
            "message": f"Student '{student_name}' deleted successfully",
            "deleted_local": deleted_local,
            "deleted_firebase": deleted_firebase,
            "attendance_records_removed": deleted_attendance
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Delete failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
