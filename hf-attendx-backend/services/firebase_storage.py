
import logging
from firebase_admin import storage
from config.firebase_admin import get_bucket
import os

logger = logging.getLogger(__name__)

# ==================== STUDENT IMAGES ====================

def upload_student_image(local_path: str, student_name: str, image_index: int) -> str:
    """Upload a single student image to Firebase Storage"""
    try:
        bucket = get_bucket()
        storage_path = f"students/{student_name}/{image_index}.jpg"
        blob = bucket.blob(storage_path)
        blob.upload_from_filename(local_path)
        blob.make_public()
        logger.info(f"✅ Uploaded: {storage_path}")
        return blob.public_url
    except Exception as e:
        logger.error(f"❌ Failed to upload {local_path}: {e}")
        raise

def upload_student_images(student_dir: str, student_name: str) -> list[str]:
    """Upload all images for a student"""
    urls = []
    image_files = sorted([
        f for f in os.listdir(student_dir) 
        if f.lower().endswith(('.jpg', '.jpeg', '.png'))
    ])
    
    for idx, filename in enumerate(image_files, start=1):
        local_path = os.path.join(student_dir, filename)
        url = upload_student_image(local_path, student_name, idx)
        urls.append(url)
    
    logger.info(f"✅ Uploaded {len(urls)} images for {student_name}")
    return urls

# ==================== EMBEDDINGS ====================

def upload_embedding(student_name: str, local_embedding_path: str) -> str:
    """Upload a student's embedding to Firebase Storage"""
    try:
        bucket = get_bucket()
        storage_path = f"embeddings/{student_name}.npy"
        blob = bucket.blob(storage_path)
        blob.upload_from_filename(local_embedding_path)
        logger.info(f"✅ Uploaded embedding: {storage_path}")
        return storage_path
    except Exception as e:
        logger.error(f"❌ Failed to upload embedding for {student_name}: {e}")
        raise

def download_all_embeddings(local_dir: str) -> int:
    """Download ALL embeddings from Firebase (on startup)"""
    try:
        bucket = get_bucket()
        os.makedirs(local_dir, exist_ok=True)
        prefix = "embeddings/"
        blobs = bucket.list_blobs(prefix=prefix)
        
        count = 0
        for blob in blobs:
            if blob.name == prefix: continue
            filename = os.path.basename(blob.name)
            local_path = os.path.join(local_dir, filename)
            blob.download_to_filename(local_path)
            count += 1
        
        logger.info(f"✅ Downloaded {count} embeddings from Firebase")
        return count
    except Exception as e:
        logger.error(f"❌ Failed to download embeddings: {e}")
        raise

def get_storage_usage() -> dict:
    """Get storage usage statistics"""
    try:
        bucket = get_bucket()
        student_count = len(list(bucket.list_blobs(prefix="students/")))
        embedding_count = len(list(bucket.list_blobs(prefix="embeddings/")))
        return {
            "student_images": student_count,
            "embeddings": embedding_count,
            "total_files": student_count + embedding_count
        }
    except Exception as e:
        logger.error(f"❌ Failed to get storage usage: {e}")
        return {"error": str(e)}

def delete_student_storage_data(student_name: str):
    """Delete images and embeddings for a student"""
    try:
        bucket = get_bucket()
        # Delete images
        image_blobs = bucket.list_blobs(prefix=f"students/{student_name}/")
        for blob in image_blobs: blob.delete()
        
        # Delete embedding
        embedding_blob = bucket.blob(f"embeddings/{student_name}.npy")
        if embedding_blob.exists(): embedding_blob.delete()
        
        logger.info(f"✅ Deleted storage data for {student_name}")
    except Exception as e:
        logger.error(f"❌ Failed to delete storage data for {student_name}: {e}")
        raise

def get_all_students_from_storage() -> list:
    """List all students found in storage (fallback)"""
    try:
        bucket = get_bucket()
        blobs = bucket.list_blobs(prefix="students/", delimiter="/")
        # Note: prefixes are 'folders'
        count = 0
        students = []
        # Blob listing with delimiter is tricky in python client, usually returns prefixes in separate property
        # Simpler approach: List embeddings provided they mirror students
        blobs = bucket.list_blobs(prefix="embeddings/")
        for blob in blobs:
            name = os.path.basename(blob.name).replace('.npy', '')
            if name: students.append({'name': name, 'image_count': 1}) # Dummy count
        return students
    except Exception:
        return []
