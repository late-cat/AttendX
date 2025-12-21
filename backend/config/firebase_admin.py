"""
Firebase Admin SDK Configuration and Storage Utilities

This module handles all Firebase Storage interactions including:
- Uploading student images
- Uploading/downloading embeddings (smart caching)
- Managing storage lifecycle
"""

import firebase_admin
from firebase_admin import credentials, storage
import os
import logging

logger = logging.getLogger(__name__)

# Global bucket reference
_bucket = None

def initialize_firebase():
    """Initialize Firebase Admin SDK (call once on startup)"""
    global _bucket
    
    if _bucket is not None:
        return _bucket
    
    try:
        # Local service account key path
        service_account_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
        
        if not os.path.exists(service_account_path):
            raise FileNotFoundError(f"Service account key not found at {service_account_path}")
        
        # Initialize Firebase Admin
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'attendx-572c8.firebasestorage.app'
        })
        
        # Get storage bucket
        _bucket = storage.bucket()
        logger.info("✅ Firebase Admin SDK initialized successfully")
        return _bucket
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Firebase: {e}")
        raise

def get_bucket():
    """Get the Firebase Storage bucket (initialize if needed)"""
    global _bucket
    if _bucket is None:
        _bucket = initialize_firebase()
    return _bucket

# ==================== STUDENT IMAGES ====================

def upload_student_image(local_path: str, student_name: str, image_index: int) -> str:
    """
    Upload a single student image to Firebase Storage
    
    Args:
        local_path: Path to local image file
        student_name: Student's name (used for folder organization)
        image_index: Image number (1, 2, 3, etc.)
    
    Returns:
        Public download URL
    """
    try:
        bucket = get_bucket()
        
        # Storage path: students/{name}/{index}.jpg
        storage_path = f"students/{student_name}/{image_index}.jpg"
        
        blob = bucket.blob(storage_path)
        blob.upload_from_filename(local_path)
        
        # Make publicly readable
        blob.make_public()
        
        logger.info(f"✅ Uploaded: {storage_path}")
        return blob.public_url
        
    except Exception as e:
        logger.error(f"❌ Failed to upload {local_path}: {e}")
        raise

def upload_student_images(student_dir: str, student_name: str) -> list[str]:
    """
    Upload all images for a student
    
    Args:
        student_dir: Local directory containing student images
        student_name: Student's name
    
    Returns:
        List of public download URLs
    """
    urls = []
    
    # Find all image files
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

def download_student_images(student_name: str, local_dir: str) -> int:
    """
    Download all images for a student from Firebase
    
    Args:
        student_name: Student's name
        local_dir: Local directory to save images
    
    Returns:
        Number of images downloaded
    """
    try:
        bucket = get_bucket()
        os.makedirs(local_dir, exist_ok=True)
        
        # List all files for this student
        prefix = f"students/{student_name}/"
        blobs = bucket.list_blobs(prefix=prefix)
        
        count = 0
        for blob in blobs:
            # Extract filename from path
            filename = os.path.basename(blob.name)
            local_path = os.path.join(local_dir, filename)
            
            # Download
            blob.download_to_filename(local_path)
            count += 1
        
        logger.info(f"✅ Downloaded {count} images for {student_name}")
        return count
        
    except Exception as e:
        logger.error(f"❌ Failed to download images for {student_name}: {e}")
        raise

# ==================== EMBEDDINGS (SMART CACHING) ====================

def upload_embedding(student_name: str, local_embedding_path: str) -> str:
    """
    Upload a student's embedding to Firebase Storage
    
    Args:
        student_name: Student's name
        local_embedding_path: Path to .npy file
    
    Returns:
        Storage path
    """
    try:
        bucket = get_bucket()
        
        # Storage path: embeddings/{name}.npy
        storage_path = f"embeddings/{student_name}.npy"
        
        blob = bucket.blob(storage_path)
        blob.upload_from_filename(local_embedding_path)
        
        logger.info(f"✅ Uploaded embedding: {storage_path}")
        return storage_path
        
    except Exception as e:
        logger.error(f"❌ Failed to upload embedding for {student_name}: {e}")
        raise

def download_embedding(student_name: str, local_dir: str) -> str:
    """
    Download a single student's embedding from Firebase
    
    Args:
        student_name: Student's name
        local_dir: Local directory to save embedding
    
    Returns:
        Path to downloaded file
    """
    try:
        bucket = get_bucket()
        
        storage_path = f"embeddings/{student_name}.npy"
        local_path = os.path.join(local_dir, f"{student_name}.npy")
        
        blob = bucket.blob(storage_path)
        
        # Check if file exists
        if not blob.exists():
            logger.warning(f"⚠️ Embedding not found: {storage_path}")
            return None
        
        # Download
        os.makedirs(local_dir, exist_ok=True)
        blob.download_to_filename(local_path)
        
        logger.info(f"✅ Downloaded embedding: {storage_path}")
        return local_path
        
    except Exception as e:
        logger.error(f"❌ Failed to download embedding for {student_name}: {e}")
        raise

def download_all_embeddings(local_dir: str) -> int:
    """
    Download ALL embeddings from Firebase (on startup)
    
    Args:
        local_dir: Local directory to save embeddings
    
    Returns:
        Number of embeddings downloaded
    """
    try:
        bucket = get_bucket()
        os.makedirs(local_dir, exist_ok=True)
        
        # List all embedding files
        prefix = "embeddings/"
        blobs = bucket.list_blobs(prefix=prefix)
        
        count = 0
        for blob in blobs:
            # Skip the folder itself
            if blob.name == prefix:
                continue
                
            filename = os.path.basename(blob.name)
            local_path = os.path.join(local_dir, filename)
            
            # Download
            blob.download_to_filename(local_path)
            count += 1
        
        logger.info(f"✅ Downloaded {count} embeddings from Firebase")
        return count
        
    except Exception as e:
        logger.error(f"❌ Failed to download embeddings: {e}")
        raise

def sync_embeddings_to_firebase(local_dir: str) -> int:
    """
    Upload all local embeddings to Firebase (backup/sync)
    
    Args:
        local_dir: Local directory containing .npy files
    
    Returns:
        Number of embeddings uploaded
    """
    count = 0
    
    if not os.path.exists(local_dir):
        logger.warning(f"⚠️ Embeddings directory not found: {local_dir}")
        return 0
    
    for filename in os.listdir(local_dir):
        if filename.endswith('.npy'):
            student_name = filename.replace('.npy', '')
            local_path = os.path.join(local_dir, filename)
            upload_embedding(student_name, local_path)
            count += 1
    
    logger.info(f"✅ Synced {count} embeddings to Firebase")
    return count

# ==================== UTILITY FUNCTIONS ====================

def delete_student_data(student_name: str):
    """
    Delete all data for a student (images + embedding)
    
    Args:
        student_name: Student's name
    """
    try:
        bucket = get_bucket()
        
        # Delete images
        image_prefix = f"students/{student_name}/"
        image_blobs = bucket.list_blobs(prefix=image_prefix)
        for blob in image_blobs:
            blob.delete()
        
        # Delete embedding
        embedding_path = f"embeddings/{student_name}.npy"
        embedding_blob = bucket.blob(embedding_path)
        if embedding_blob.exists():
            embedding_blob.delete()
        
        logger.info(f"✅ Deleted all data for {student_name}")
        
    except Exception as e:
        logger.error(f"❌ Failed to delete data for {student_name}: {e}")
        raise

def get_storage_usage() -> dict:
    """
    Get storage usage statistics
    
    Returns:
        Dictionary with storage stats
    """
    try:
        bucket = get_bucket()
        
        # Count files
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
