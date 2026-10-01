
import logging
from firebase_admin import storage
from config.firebase_admin import get_bucket
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ==================== STUDENT IMAGES ====================

def _storage_path(
    folder: str,
    person_name: str,
    filename: str,
    version: Optional[str] = None,
) -> str:
    if version:
        return f"_staging/{version}/{folder}/{person_name}/{filename}"
    return f"{folder}/{person_name}/{filename}"


def upload_student_image(
    local_path: str,
    student_name: str,
    image_index: int,
    folder: str = "students",
    version: Optional[str] = None,
) -> str:
    """Upload a single student/teacher image to Firebase Storage"""
    try:
        bucket = get_bucket()
        storage_path = _storage_path(
            folder, student_name, f"{image_index}.jpg", version=version
        )
        blob = bucket.blob(storage_path)
        blob.upload_from_filename(local_path)
        logger.info(f"✅ Uploaded: {storage_path}")
        # Return an internal object path, never a public URL.
        return storage_path
    except Exception as e:
        logger.error(f"❌ Failed to upload {local_path}: {e}")
        raise

def upload_student_images(
    student_dir: str,
    student_name: str,
    folder: str = "students",
    version: Optional[str] = None,
) -> list[str]:
    """Upload all images for a student/teacher"""
    storage_paths = []
    image_files = sorted([
        f for f in os.listdir(student_dir) 
        if f.lower().endswith(('.jpg', '.jpeg', '.png'))
    ])
    
    for idx, filename in enumerate(image_files, start=1):
        local_path = os.path.join(student_dir, filename)
        storage_path = upload_student_image(
            local_path, student_name, idx, folder=folder, version=version
        )
        storage_paths.append(storage_path)
    
    logger.info(f"✅ Uploaded {len(storage_paths)} images for {student_name} to {folder}")
    return storage_paths

# ==================== EMBEDDINGS ====================

def upload_embedding(
    student_name: str,
    local_embedding_path: str,
    folder: str = "embeddings",
    version: Optional[str] = None,
) -> str:
    """Upload a student/teacher embedding to Firebase Storage"""
    try:
        bucket = get_bucket()
        # Keep embeddings at the long-standing ``{folder}/{name}.npy`` path.
        # Images are grouped below a person directory, but the startup loader
        # and deletion code both expect the embedding itself to be a direct
        # child of its folder.
        if version:
            storage_path = f"_staging/{version}/{folder}/{student_name}.npy"
        else:
            storage_path = f"{folder}/{student_name}.npy"
        blob = bucket.blob(storage_path)
        blob.upload_from_filename(local_embedding_path)
        logger.info(f"✅ Uploaded embedding: {storage_path}")
        return storage_path
    except Exception as e:
        logger.error(f"❌ Failed to upload embedding for {student_name}: {e}")
        raise


def delete_staged_storage_data(version: str) -> None:
    """Delete temporary objects left by an incomplete registration."""
    try:
        bucket = get_bucket()
        for blob in bucket.list_blobs(prefix=f"_staging/{version}/"):
            blob.delete()
    except Exception as e:
        logger.warning(f"⚠️ Failed to clean staged storage data {version}: {e}")


def promote_staged_storage_data(
    version: str,
    person_name: str,
    images_folder: str = "students",
    embeddings_folder: str = "embeddings",
) -> list[str]:
    """Copy a completed staged registration into its active storage paths."""
    bucket = get_bucket()
    staged_image_prefix = f"_staging/{version}/{images_folder}/{person_name}/"
    active_image_prefix = f"{images_folder}/{person_name}/"
    staged_images = list(bucket.list_blobs(prefix=staged_image_prefix))
    if not staged_images:
        raise RuntimeError(f"No staged images found for {person_name}")

    active_paths = []
    for blob in staged_images:
        filename = os.path.basename(blob.name)
        active_path = f"{active_image_prefix}{filename}"
        bucket.copy_blob(blob, bucket, active_path)
        active_paths.append(active_path)

    staged_embedding_path = f"_staging/{version}/{embeddings_folder}/{person_name}.npy"
    staged_embedding = bucket.blob(staged_embedding_path)
    if not staged_embedding.exists():
        raise RuntimeError(f"No staged embedding found for {person_name}")
    bucket.copy_blob(
        staged_embedding, bucket, f"{embeddings_folder}/{person_name}.npy"
    )

    # Remove old image objects that are not part of the new version only
    # after every staged object has been copied successfully.
    active_path_set = set(active_paths)
    for blob in bucket.list_blobs(prefix=active_image_prefix):
        if blob.name not in active_path_set:
            blob.delete()

    delete_staged_storage_data(version)
    return sorted(active_paths)

def download_all_embeddings(local_dir: str, prefix: str = "embeddings/") -> int:
    """Download ALL embeddings from Firebase for a given prefix (on startup)"""
    try:
        bucket = get_bucket()
        os.makedirs(local_dir, exist_ok=True)
        blobs = bucket.list_blobs(prefix=prefix)
        
        count = 0
        for blob in blobs:
            if blob.name == prefix: continue
            filename = os.path.basename(blob.name)
            local_path = os.path.join(local_dir, filename)
            blob.download_to_filename(local_path)
            count += 1
        
        logger.info(f"✅ Downloaded {count} embeddings from Firebase ({prefix})")
        return count
    except Exception as e:
        logger.error(f"❌ Failed to download embeddings ({prefix}): {e}")
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

def delete_student_storage_data(student_name: str, images_folder: str = "students", embeddings_folder: str = "embeddings"):
    """Delete images and embeddings for a student or teacher"""
    try:
        bucket = get_bucket()
        # Delete images
        image_blobs = bucket.list_blobs(prefix=f"{images_folder}/{student_name}/")
        for blob in image_blobs: blob.delete()
        
        # Delete embedding
        embedding_blob = bucket.blob(f"{embeddings_folder}/{student_name}.npy")
        if embedding_blob.exists(): embedding_blob.delete()
        
        logger.info(f"✅ Deleted storage data for {student_name} from {images_folder}")
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
