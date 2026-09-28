
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from core.config import settings
from core.security import get_api_key
from core.cache import cache
from services.firebase_storage import (
    upload_student_images, upload_embedding, delete_student_storage_data,
    get_all_students_from_storage
)
from services.firestore_db import (
    update_student_metadata, delete_student_metadata, 
    get_all_students_from_metadata, bump_sync_version,
    get_attendance_logs
)
from vision.recognizer import recognize_face, reload_embeddings
from vision.embedding_utils import generate_embeddings_for_person
import os
import shutil
import uuid
import logging
import re
import time
from collections import defaultdict

router = APIRouter(tags=["Students"])
logger = logging.getLogger(__name__)

def sanitize_student_name(name: str) -> str:
    """Sanitize student name to prevent path traversal attacks."""
    sanitized = re.sub(r'[^a-zA-Z0-9\s\-]', '', name).strip()[:50]
    if not sanitized:
        raise ValueError("Invalid student name")
    return sanitized

@router.post("/recognize")
async def recognize_api(request: Request, file: UploadFile = File(...), save: bool = Form(True)):
    """Recognize faces in uploaded image. Public endpoint (for now)."""
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    temp_filename = f"{uuid.uuid4()}.jpg"
    temp_path = os.path.join(settings.TEMP_DIR, temp_filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        results = recognize_face(temp_path, save=save)
        
        # Cleanup
        if os.path.exists(temp_path): os.remove(temp_path)
        
        status = "unknown"
        name = "Unknown"
        message = "No face detected"
        
        if results:
            for res in results:
                if res['status'] in ['present', 'marked', 'detected']:
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
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register-student")
async def register_student(
    name: str = Form(...), 
    class_name: str = Form(""),
    section: str = Form(""),
    roll_number: str = Form(""),
    files: list[UploadFile] = File(...),
    api_key: str = Depends(get_api_key)  # Protected
):
    """Register a new student."""
    if not name or not files:
        raise HTTPException(status_code=400, detail="Name and images required")
    
    try:
        name = sanitize_student_name(name)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid student name")
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed")
    
    student_dir = os.path.join(settings.KNOWN_FACES_DIR, name)
    os.makedirs(student_dir, exist_ok=True)
    
    try:
        # Save images
        for idx, file in enumerate(files):
            file_path = os.path.join(student_dir, f"{idx+1}.jpg")
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        
        # Generator embeddings
        success, embed_message = generate_embeddings_for_person(name, student_dir, settings.EMBEDDINGS_DIR)
        if not success:
            raise HTTPException(status_code=400, detail=embed_message)
        
        # Uploads
        try:
            image_urls = upload_student_images(student_dir, name)
            embedding_path = os.path.join(settings.EMBEDDINGS_DIR, f"{name}.npy")
            upload_embedding(name, embedding_path)
        except Exception as e:
            logger.warning(f"⚠️ Cloud upload warning: {e}")
            image_urls = []
        
        reload_embeddings()
        update_student_metadata(name, len(image_urls) or len(files), class_name, section, roll_number)
        
        cache.invalidate_all()
        bump_sync_version("register")
        
        return {
            "status": "success", 
            "message": embed_message, 
            "image_urls": image_urls
        }
            
    except HTTPException:
        if os.path.exists(student_dir): shutil.rmtree(student_dir)
        raise
    except Exception as e:
        if os.path.exists(student_dir): shutil.rmtree(student_dir)
        logger.error(f"❌ Registration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/students")
def list_students():
    """List all students."""
    try:
        students = get_all_students_from_metadata()
        
        # Migration logic if needed
        if not students and os.path.exists(settings.EMBEDDINGS_DIR) and os.listdir(settings.EMBEDDINGS_DIR):
             # Fallback
             students = get_all_students_from_storage()
             
        return {"students": students, "total": len(students)}
    except Exception as e:
        return {"students": [], "total": 0, "error": str(e)}

@router.get("/students/with-attendance")
def get_students_with_attendance(refresh: bool = False):
    """Get all students with their attendance percentage (last 15 days)."""
    # Check cache
    cache_age = time.time() - cache.attendance["timestamp"]
    if not refresh and cache.attendance["data"] and cache_age < cache.attendance["ttl"]:
         return cache.attendance["data"]
            
    try:
        students = get_all_students_from_metadata()
        if not students:
             # Fallback
             students = get_all_students_from_storage()
        
        logs = get_attendance_logs(days=15)
        
        attendance_by_student = defaultdict(set)
        for log in logs:
            attendance_by_student[log['Name']].add(log['Date'])
            
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
        
        cache.attendance["data"] = result
        cache.attendance["timestamp"] = time.time()
        
        return result
    except Exception as e:
        logger.error(f"❌ Failed to get students with attendance: {e}")
        return {"students": [], "total": 0, "period_days": 15, "error": str(e)}


@router.delete("/delete-student/{student_name}")
async def delete_student(
    student_name: str,
    api_key: str = Depends(get_api_key)  # Protected
):
    """Delete a student."""
    try:
        # Local cleanup
        student_dir = os.path.join(settings.KNOWN_FACES_DIR, student_name)
        if os.path.exists(student_dir): shutil.rmtree(student_dir)
        
        embedding_path = os.path.join(settings.EMBEDDINGS_DIR, f"{student_name}.npy")
        if os.path.exists(embedding_path): os.remove(embedding_path)
        
        # Cloud cleanup
        delete_student_storage_data(student_name)
        delete_student_metadata(student_name)
        
        reload_embeddings()
        cache.invalidate_all()
        bump_sync_version("delete")
        
        return {"status": "success", "message": f"Deleted {student_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
