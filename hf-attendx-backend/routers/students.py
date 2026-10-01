
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from typing import List, Optional
from core.config import settings
from core.security import get_api_key
from core.cache import cache
from services.firebase_storage import (
    upload_student_images, upload_embedding, delete_student_storage_data,
    get_all_students_from_storage, promote_staged_storage_data,
    delete_staged_storage_data,
)
from services.firestore_db import (
    update_student_metadata, delete_student_metadata, 
    get_all_students_from_metadata, bump_sync_version,
    get_attendance_logs
)
from vision.recognizer import recognize_face, reload_embeddings
from services.recognition_batch import aggregate_recognition_results
from vision.embedding_utils import generate_embeddings_for_person
from services.registration_staging import (
    activate_registration,
    cleanup_registration_staging,
    create_registration_staging,
)
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
async def recognize_api(request: Request, file: UploadFile = File(...), save: str = Form("true")):
    """Recognize faces in uploaded image. Public endpoint (for now)."""
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    should_save = str(save).lower() in ("true", "1", "yes")
    
    temp_filename = f"{uuid.uuid4()}.jpg"
    temp_path = os.path.join(settings.TEMP_DIR, temp_filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        results = recognize_face(temp_path, save=should_save)
        
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


@router.post("/recognize/batch")
async def recognize_batch_api(
    files: Optional[List[UploadFile]] = File(None),
    images: Optional[List[UploadFile]] = File(None),
    save: str = Form("false"),
):
    """Recognize a classroom across two or three photos for review.

    The normal review flow uses ``save=false`` and finalizes selected students
    through ``/attendance/finalize``. ``images`` is accepted as an alias for
    clients that use that field name; the existing single-photo ``/recognize``
    endpoint remains unchanged.
    """
    uploaded_files = (files or []) + (images or [])
    if len(uploaded_files) < 2 or len(uploaded_files) > 3:
        raise HTTPException(
            status_code=400,
            detail="Upload between 2 and 3 classroom images.",
        )

    should_save = str(save).lower() in ("true", "1", "yes")
    image_results = []
    image_diagnostics = []

    for image_index, file in enumerate(uploaded_files, start=1):
        filename = file.filename or f"classroom-{image_index}.jpg"
        extension = os.path.splitext(filename)[1].lower()
        if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
            extension = ".jpg"
        temp_path = os.path.join(
            settings.TEMP_DIR, f"classroom_{uuid.uuid4()}{extension}"
        )

        try:
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            try:
                results = recognize_face(temp_path, save=should_save)
                if not isinstance(results, list):
                    results = []
                image_results.append((image_index, filename, results))
                image_details = [
                    {
                        **result,
                        "image_index": image_index,
                        "filename": filename,
                        "face_index": face_index,
                    }
                    for face_index, result in enumerate(results)
                    if isinstance(result, dict)
                ]
                recognized_names = sorted(
                    {
                        str(result.get("name")).strip()
                        for result in results
                        if isinstance(result, dict)
                        and result.get("status") in {"present", "marked", "detected"}
                        and result.get("name")
                        and str(result.get("name")).lower() != "unknown"
                    }
                )
                image_diagnostics.append(
                    {
                        "image_index": image_index,
                        "filename": filename,
                        "status": "processed",
                        "details": image_details,
                        "detected_count": len(image_details),
                        "recognized_count": len(recognized_names),
                        "recognized_names": recognized_names,
                        "quality_rejected_count": sum(
                            1
                            for result in results
                            if isinstance(result, dict)
                            and result.get("status") == "rejected"
                        ),
                    }
                )
            except Exception as exc:
                # Keep the other classroom images useful if one image cannot
                # be decoded or the recognition backend fails for that image.
                logger.exception("Recognition failed for classroom image %s", filename)
                image_diagnostics.append(
                    {
                        "image_index": image_index,
                        "filename": filename,
                        "status": "error",
                        "details": [],
                        "detected_count": 0,
                        "recognized_count": 0,
                        "quality_rejected_count": 0,
                        "error": str(exc),
                    }
                )
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    aggregate = aggregate_recognition_results(image_results)
    recognized_faces = aggregate["recognized_faces"]
    status = "success" if recognized_faces else "error"
    processed_count = sum(
        1 for diagnostic in image_diagnostics if diagnostic["status"] == "processed"
    )
    error_count = len(image_diagnostics) - processed_count

    # Include both the snake_case aggregate fields and the camelCase fields
    # already used by the review UI, so the batch response can be consumed
    # without changing the single-photo response contract.
    return {
        "status": status,
        "message": (
            f"Recognized {len(recognized_faces)} unique student(s) across "
            f"{processed_count} of {len(uploaded_files)} image(s)."
            if recognized_faces
            else "No students were recognized in the uploaded classroom images."
        ),
        "image_count": len(uploaded_files),
        "processed_image_count": processed_count,
        "error_image_count": error_count,
        "images": image_diagnostics,
        "details": aggregate["details"],
        "recognized_faces": recognized_faces,
        "validFaces": recognized_faces,
        "unrecognized_faces": aggregate["unrecognized_faces"],
        "detected_count": aggregate["detected_count"],
        "recognized_count": aggregate["recognized_count"],
        "unrecognized_count": aggregate["unrecognized_count"],
        "quality_rejected_count": aggregate["quality_rejected_count"],
        "detectedCount": aggregate["detected_count"],
        "recognizedCount": aggregate["recognized_count"],
        "unrecognizedCount": aggregate["unrecognized_count"],
        "qualityRejectedCount": aggregate["quality_rejected_count"],
    }

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
    
    active_student_dir = os.path.join(settings.KNOWN_FACES_DIR, name)
    active_embedding_path = os.path.join(settings.EMBEDDINGS_DIR, f"{name}.npy")
    version, student_dir, staging_embeddings_dir = create_registration_staging(
        settings.KNOWN_FACES_DIR, settings.EMBEDDINGS_DIR, name
    )
    staged_embedding_path = os.path.join(staging_embeddings_dir, f"{name}.npy")

    try:
        # Save images
        for idx, file in enumerate(files):
            file_path = os.path.join(student_dir, f"{idx+1}.jpg")
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        
        # Generator embeddings
        success, embed_message = generate_embeddings_for_person(
            name, student_dir, staging_embeddings_dir
        )
        if not success:
            raise HTTPException(status_code=400, detail=embed_message)
        
        # Uploads
        cloud_staged = False
        try:
            upload_student_images(student_dir, name, version=version)
            upload_embedding(name, staged_embedding_path, version=version)
            cloud_staged = True
        except Exception as e:
            logger.warning(f"⚠️ Cloud upload warning: {e}")
            delete_staged_storage_data(version)

        # Do not touch the active enrollment until the new photos and
        # embedding have been validated and staged successfully.
        activate_registration(
            student_dir,
            staged_embedding_path,
            active_student_dir,
            active_embedding_path,
        )

        image_paths = []
        if cloud_staged:
            try:
                image_paths = promote_staged_storage_data(version, name)
            except Exception as e:
                logger.warning(f"⚠️ Cloud promotion warning: {e}")
                delete_staged_storage_data(version)
        
        reload_embeddings()
        update_student_metadata(name, len(image_paths) or len(files), class_name, section, roll_number)
        
        cache.invalidate_all()
        bump_sync_version("register")
        
        return {
            "status": "success", 
            "message": embed_message, 
            "image_paths": image_paths
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Registration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cleanup_registration_staging(student_dir, staging_embeddings_dir)

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
        student_name = sanitize_student_name(student_name)
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
