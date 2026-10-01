import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Reduce TF logging
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
import sys
import logging
import re
import json

import pandas as pd
from datetime import datetime
import time

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)
sys.path.insert(0, current_dir)

try:
    from backend.vision.recognizer import recognize_face, reload_embeddings, ATTENDANCE_FILE
    from backend.vision.embedding_utils import generate_embeddings_for_person
    from backend.config.firebase_admin import (
        initialize_firebase,
        upload_student_images,
        upload_embedding,
        download_all_embeddings,
        sync_embeddings_to_firebase,
        get_storage_usage,
        delete_student_data
    )
except ImportError:
    from vision.recognizer import recognize_face, reload_embeddings, ATTENDANCE_FILE
    from vision.embedding_utils import generate_embeddings_for_person
    from config.firebase_admin import (
        initialize_firebase,
        upload_student_images,
        upload_embedding,
        download_all_embeddings,
        sync_embeddings_to_firebase,
        get_storage_usage,
        delete_student_data
    )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def sanitize_student_name(name: str) -> str:
    """Sanitize student name to prevent path traversal attacks."""
    sanitized = re.sub(r'[^a-zA-Z0-9\s\-]', '', name).strip()[:50]
    if not sanitized:
        raise ValueError("Invalid student name")
    return sanitized

TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

EMBEDDINGS_DIR = os.path.join(os.path.dirname(__file__), "../data/embeddings")
KNOWN_FACES_DIR = os.path.join(os.path.dirname(__file__), "../data/known_faces")

@app.on_event("startup")
async def startup_event():
    """Initialize Firebase and download embeddings on startup"""
    logger.info("🚀 Starting AttendX Backend...")
    
    try:
        initialize_firebase()
        logger.info("✅ Firebase initialized")
        
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
    total_students = 0
    if os.path.exists(KNOWN_FACES_DIR):
        total_students = len([
            d for d in os.listdir(KNOWN_FACES_DIR) 
            if os.path.isdir(os.path.join(KNOWN_FACES_DIR, d)) and not d.startswith('.')
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

@app.get("/attendance/logs")
def get_logs():
    """Return all attendance logs."""
    if not os.path.exists(ATTENDANCE_FILE):
        return {"logs": []}
    
    try:
        df = pd.read_csv(ATTENDANCE_FILE)
        logs = df.to_dict(orient="records")
        return {"logs": logs}
    except Exception as e:
        return {"logs": [], "error": str(e)}

@app.delete("/attendance/clear/today")
def clear_today_attendance():
    """Clear only today's attendance records."""
    if not os.path.exists(ATTENDANCE_FILE):
        return {"status": "success", "message": "No attendance file found", "deleted": 0}
    
    try:
        df = pd.read_csv(ATTENDANCE_FILE)
        today_str = datetime.now().strftime("%Y-%m-%d")
        original_count = len(df)
        
        df = df[df["Date"] != today_str]
        df.to_csv(ATTENDANCE_FILE, index=False)
        
        deleted = original_count - len(df)
        logger.info(f"🗑️ Cleared {deleted} attendance records for today")
        
        return {
            "status": "success",
            "message": f"Cleared {deleted} records for today",
            "deleted": deleted
        }
    except Exception as e:
        logger.error(f"❌ Clear today failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attendance/today")
def get_today_logs():
    """Return only today's attendance."""
    if not os.path.exists(ATTENDANCE_FILE):
        return {"logs": [], "stats": {"present": 0}}
        
    try:
        df = pd.read_csv(ATTENDANCE_FILE)
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        today_df = df[df["Date"] == today_str]
        logs = today_df.to_dict(orient="records")
        
        unique_students = len(today_df["Name"].unique()) if not today_df.empty else 0
        
        return {
            "logs": logs,
            "stats": {
                "present": unique_students,
                "total_entries": len(logs)
            }
        }
    except Exception as e:
        return {"logs": [], "error": str(e)}

@app.post("/recognize")
async def recognize_api(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    temp_filename = f"{uuid.uuid4()}.jpg"
    temp_path = os.path.join(TEMP_DIR, temp_filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        results = recognize_face(temp_path)
        
        os.remove(temp_path)
        
        status = "unknown"
        name = "Unknown"
        message = "No face detected"
        
        if results:
            for res in results:
                if res['status'] in ['present', 'marked']:
                    status = res['status']
                    name = res['name']
                    message = res['message']
                    break
            else:
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
async def register_student(name: str = Form(...), class_name: str = Form(""), section: str = Form(""), roll_number: str = Form(""), files: list[UploadFile] = File(...)):
    """Register a new student with their face images and metadata."""
    if not name or not files:
        raise HTTPException(status_code=400, detail="Name and images required")
    
    try:
        name = sanitize_student_name(name)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student name")
    
    MAX_FILES = 10
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES} images allowed")
    
    student_dir = os.path.join(KNOWN_FACES_DIR, name)
    os.makedirs(student_dir, exist_ok=True)
    
    try:
        logger.info(f"📥 Saving {len(files)} images for {name}...")
        for idx, file in enumerate(files):
            file_path = os.path.join(student_dir, f"{idx+1}.jpg")
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
                
        metadata = {
            "name": name,
            "class_name": class_name,
            "section": section,
            "roll_number": roll_number,
            "registered_at": datetime.now().isoformat()
        }
        with open(os.path.join(student_dir, "metadata.json"), "w") as f:
            json.dump(metadata, f)
        
        
        logger.info(f"🧠 Generating embeddings for {name}...")
        success = generate_embeddings_for_person(name, student_dir, EMBEDDINGS_DIR)
        
        if not success:
            raise HTTPException(status_code=400, detail="No valid faces found in images")
        
        logger.info(f"☁️ Uploading images to Firebase for {name}...")
        try:
            image_urls = upload_student_images(student_dir, name)
            logger.info(f"✅ Uploaded {len(image_urls)} images to Firebase")
        except Exception as e:
            logger.warning(f"⚠️ Firebase upload failed: {e}")
            image_urls = []
        
        logger.info(f"☁️ Uploading embedding to Firebase for {name}...")
        try:
            embedding_path = os.path.join(EMBEDDINGS_DIR, f"{name}.npy")
            upload_embedding(name, embedding_path)
            logger.info(f"✅ Uploaded embedding to Firebase")
        except Exception as e:
            logger.warning(f"⚠️ Embedding upload failed: {e}")
        
        reload_embeddings()
        logger.info(f"✅ Embeddings cache refreshed")
        
        return {
            "status": "success",
            "message": f"Student {name} registered successfully",
            "image_urls": image_urls,
            "embeddings_cached": True
        }
            
    except HTTPException:
        if os.path.exists(student_dir):
            shutil.rmtree(student_dir)
        raise
    except Exception as e:
        if os.path.exists(student_dir):
            shutil.rmtree(student_dir)
        logger.error(f"❌ Registration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/students")
def list_students():
    """List all registered students."""
    students = []
    
    if os.path.exists(KNOWN_FACES_DIR):
        for name in os.listdir(KNOWN_FACES_DIR):
            student_path = os.path.join(KNOWN_FACES_DIR, name)
            if os.path.isdir(student_path) and not name.startswith('.'):
                images = [f for f in os.listdir(student_path) 
                         if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
                
                embedding_exists = os.path.exists(
                    os.path.join(EMBEDDINGS_DIR, f"{name}.npy")
                )
                
                students.append({
                    "name": name,
                    "image_count": len(images),
                    "has_embedding": embedding_exists
                })
    
    return {
        "students": sorted(students, key=lambda x: x["name"]),
        "total": len(students)
    }


@app.delete("/delete-student/{student_name}")
async def delete_student(student_name: str):
    """Delete a student from local storage and Firebase."""
    if not student_name:
        raise HTTPException(status_code=400, detail="Student name required")
    
    logger.info(f"🗑️ Deleting student: {student_name}")
    
    deleted_local = False
    deleted_firebase = False
    
    try:
        student_dir = os.path.join(KNOWN_FACES_DIR, student_name)
        if os.path.exists(student_dir):
            shutil.rmtree(student_dir)
            logger.info(f"✅ Deleted local images: {student_dir}")
            deleted_local = True
        
        embedding_path = os.path.join(EMBEDDINGS_DIR, f"{student_name}.npy")
        if os.path.exists(embedding_path):
            os.remove(embedding_path)
            logger.info(f"✅ Deleted local embedding: {embedding_path}")
            deleted_local = True
        
        try:
            delete_student_data(student_name)
            deleted_firebase = True
            logger.info(f"✅ Deleted from Firebase: {student_name}")
        except Exception as e:
            logger.warning(f"⚠️ Firebase delete failed: {e}")
        
        if not deleted_local and not deleted_firebase:
            raise HTTPException(status_code=404, detail=f"Student '{student_name}' not found")
        
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
        
        reload_embeddings()
        logger.info(f"✅ Embeddings cache refreshed")
        
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
