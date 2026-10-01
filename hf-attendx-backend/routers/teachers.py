from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from core.config import settings
from core.security import get_api_key
from core.cache import cache
from services.firebase_storage import (
    upload_student_images,
    upload_embedding,
    delete_student_storage_data,
    promote_staged_storage_data,
    delete_staged_storage_data,
)
from services.firestore_db import bump_sync_version
from config.firebase_admin import get_firestore_db
from vision.recognizer import reload_embeddings
from vision.embedding_utils import generate_embeddings_for_person
from services.registration_staging import (
    activate_registration,
    cleanup_registration_staging,
    create_registration_staging,
)
import os
import shutil
import logging
import re
from firebase_admin import firestore

router = APIRouter(tags=["Teachers"])
logger = logging.getLogger(__name__)


def sanitize_teacher_name(name: str) -> str:
    """Keep display names safe for local and cloud storage paths."""
    sanitized = re.sub(r"[^a-zA-Z0-9\s\-]", "", name).strip()[:50]
    if not sanitized:
        raise ValueError("Invalid teacher name")
    return sanitized

def update_teacher_metadata(name: str, photo_count: int, department: str = ""):
    try:
        db = get_firestore_db()
        db.collection('teachers').document(name).set({
            'name': name, 'photo_count': photo_count, 'last_updated': firestore.SERVER_TIMESTAMP,
            'department': department
        }, merge=True)
    except Exception as e:
        logger.error(f"❌ Failed to update teacher metadata: {e}")

def delete_teacher_metadata(name: str):
    try:
        db = get_firestore_db()
        db.collection('teachers').document(name).delete()
    except Exception as e:
        logger.error(f"❌ Failed to delete teacher metadata: {e}")

@router.post("/register-teacher")
async def register_teacher(
    name: str = Form(...), 
    department: str = Form(""),
    files: list[UploadFile] = File(...),
    api_key: str = Depends(get_api_key)
):
    if not name or not files:
        raise HTTPException(status_code=400, detail="Name and images required")

    try:
        name = sanitize_teacher_name(name)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid teacher name")

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed")
        
    active_teacher_dir = os.path.join(settings.TEACHER_FACES_DIR, name)
    active_embedding_path = os.path.join(
        settings.TEACHER_EMBEDDINGS_DIR, f"{name}.npy"
    )
    version, teacher_dir, staging_embeddings_dir = create_registration_staging(
        settings.TEACHER_FACES_DIR, settings.TEACHER_EMBEDDINGS_DIR, name
    )
    staged_embedding_path = os.path.join(staging_embeddings_dir, f"{name}.npy")
    
    try:
        for idx, file in enumerate(files):
            file_path = os.path.join(teacher_dir, f"{idx+1}.jpg")
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        
        success, embed_message = generate_embeddings_for_person(
            name, teacher_dir, staging_embeddings_dir
        )
        if not success:
            raise HTTPException(status_code=400, detail=embed_message)
        
        cloud_staged = False
        try:
            upload_student_images(
                teacher_dir, name, folder="teachers", version=version
            )
            upload_embedding(
                name,
                staged_embedding_path,
                folder="teacher_embeddings",
                version=version,
            )
            cloud_staged = True
        except Exception as e:
            logger.warning(f"⚠️ Cloud upload warning: {e}")
            delete_staged_storage_data(version)

        # Replace the active enrollment only after the new registration has
        # produced a valid embedding and its staged files are complete.
        activate_registration(
            teacher_dir,
            staged_embedding_path,
            active_teacher_dir,
            active_embedding_path,
        )

        image_paths = []
        if cloud_staged:
            try:
                image_paths = promote_staged_storage_data(
                    version,
                    name,
                    images_folder="teachers",
                    embeddings_folder="teacher_embeddings",
                )
            except Exception as e:
                logger.warning(f"⚠️ Cloud promotion warning: {e}")
                delete_staged_storage_data(version)
        
        reload_embeddings()
        update_teacher_metadata(name, len(image_paths) or len(files), department)
        
        cache.invalidate_all()
        bump_sync_version("register")
        
        return {"status": "success", "message": embed_message, "image_paths": image_paths}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cleanup_registration_staging(teacher_dir, staging_embeddings_dir)

@router.get("/teachers")
def list_teachers():
    try:
        db = get_firestore_db()
        docs = db.collection('teachers').order_by('name').stream()
        teachers = [{"name": d.get('name', doc.id), "image_count": d.get('photo_count', 0), "department": d.get('department', '')} for doc, d in [(doc, doc.to_dict()) for doc in docs]]
        return {"teachers": teachers, "total": len(teachers)}
    except Exception as e:
        return {"teachers": [], "total": 0, "error": str(e)}

@router.delete("/delete-teacher/{teacher_name}")
async def delete_teacher(teacher_name: str, api_key: str = Depends(get_api_key)):
    try:
        teacher_name = sanitize_teacher_name(teacher_name)
        teacher_dir = os.path.join(settings.TEACHER_FACES_DIR, teacher_name)
        if os.path.exists(teacher_dir): shutil.rmtree(teacher_dir)
        embedding_path = os.path.join(settings.TEACHER_EMBEDDINGS_DIR, f"{teacher_name}.npy")
        if os.path.exists(embedding_path): os.remove(embedding_path)
        
        delete_student_storage_data(teacher_name, images_folder="teachers", embeddings_folder="teacher_embeddings")
        delete_teacher_metadata(teacher_name)
        
        reload_embeddings()
        cache.invalidate_all()
        bump_sync_version("delete")
        return {"status": "success", "message": f"Deleted {teacher_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
