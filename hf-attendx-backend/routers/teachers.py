from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from core.config import settings
from core.security import get_api_key
from core.cache import cache
from services.firebase_storage import upload_student_images, upload_embedding, delete_student_storage_data
from services.firestore_db import bump_sync_version
from config.firebase_admin import get_firestore_db
from vision.recognizer import reload_embeddings
from vision.embedding_utils import generate_embeddings_for_person
import os
import shutil
import logging
from firebase_admin import firestore

router = APIRouter(tags=["Teachers"])
logger = logging.getLogger(__name__)

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
        
    student_dir = os.path.join(settings.KNOWN_FACES_DIR, name)
    os.makedirs(student_dir, exist_ok=True)
    
    try:
        for idx, file in enumerate(files):
            file_path = os.path.join(student_dir, f"{idx+1}.jpg")
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        
        success, embed_message = generate_embeddings_for_person(name, student_dir, settings.EMBEDDINGS_DIR)
        if not success:
            raise HTTPException(status_code=400, detail=embed_message)
        
        try:
            image_urls = upload_student_images(student_dir, name)
            embedding_path = os.path.join(settings.EMBEDDINGS_DIR, f"{name}.npy")
            upload_embedding(name, embedding_path)
        except Exception as e:
            logger.warning(f"⚠️ Cloud upload warning: {e}")
            image_urls = []
        
        reload_embeddings()
        update_teacher_metadata(name, len(image_urls) or len(files), department)
        
        cache.invalidate_all()
        bump_sync_version("register")
        
        return {"status": "success", "message": embed_message, "image_urls": image_urls}
            
    except Exception as e:
        if os.path.exists(student_dir): shutil.rmtree(student_dir)
        raise HTTPException(status_code=500, detail=str(e))

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
        student_dir = os.path.join(settings.KNOWN_FACES_DIR, teacher_name)
        if os.path.exists(student_dir): shutil.rmtree(student_dir)
        embedding_path = os.path.join(settings.EMBEDDINGS_DIR, f"{teacher_name}.npy")
        if os.path.exists(embedding_path): os.remove(embedding_path)
        
        delete_student_storage_data(teacher_name)
        delete_teacher_metadata(teacher_name)
        
        reload_embeddings()
        cache.invalidate_all()
        bump_sync_version("delete")
        return {"status": "success", "message": f"Deleted {teacher_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
