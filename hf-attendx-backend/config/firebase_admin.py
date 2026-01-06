"""
Firebase Admin SDK Configuration and Storage Utilities

This module handles all Firebase Storage interactions including:
- Uploading student images
- Uploading/downloading embeddings (smart caching)
- Managing storage lifecycle
"""

import firebase_admin
from firebase_admin import credentials, storage, firestore
import os
import logging
from datetime import datetime, timedelta, timezone
import random

logger = logging.getLogger(__name__)

# IST Timezone (UTC+5:30) - Used for consistent date handling
IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    """Get current datetime in IST timezone."""
    return datetime.now(IST)

# Global bucket reference
_bucket = None

def initialize_firebase():
    """Initialize Firebase Admin SDK (call once on startup)"""
    global _bucket
    
    if _bucket is not None:
        return _bucket
    
    try:
        import json
        
        # Try to load from environment variable first (HF Spaces)
        service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
        
        if service_account_json:
            # Parse JSON from environment variable
            service_account_info = json.loads(service_account_json)
            cred = credentials.Certificate(service_account_info)
            logger.info("✅ Using Firebase credentials from environment")
        else:
            # Fallback to local file (development)
            service_account_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
            
            if not os.path.exists(service_account_path):
                raise FileNotFoundError(f"No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT env var or provide serviceAccountKey.json")
            
            cred = credentials.Certificate(service_account_path)
            logger.info("✅ Using Firebase credentials from local file")
        
        # Security: Load bucket from environment variable
        FIREBASE_BUCKET = os.environ.get("FIREBASE_STORAGE_BUCKET", "attendx-572c8.firebasestorage.app")
        
        firebase_admin.initialize_app(cred, {
            'storageBucket': FIREBASE_BUCKET
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


# ==================== FIRESTORE (ATTENDANCE LOGS) ====================

_db = None

def get_firestore_db():
    """Get Firestore database instance"""
    global _db
    if _db is None:
        # Ensure Firebase is initialized first
        get_bucket()
        _db = firestore.client()
    return _db


def save_attendance_log(name: str, date: str, time: str) -> bool:
    """
    Save attendance log to Firestore
    
    Args:
        name: Student name
        date: Date string (YYYY-MM-DD)
        time: Time string (HH:MM:SS)
    
    Returns:
        True if successful
    """
    try:
        db = get_firestore_db()
        
        # Create document with auto-generated ID
        doc_ref = db.collection('attendance_logs').document()
        doc_ref.set({
            'name': name,
            'date': date,
            'time': time,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'created_at': get_ist_now().isoformat()
        })
        
        logger.info(f"✅ Saved attendance log to Firestore: {name} on {date}")
        
        # Cleanup old logs occasionally (5% chance) to avoid extra reads on every write
        if random.random() < 0.05:
            cleanup_old_logs(days=15)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to save attendance log: {e}")
        return False


def get_attendance_logs(days: int = None) -> list:
    """
    Fetch attendance logs from Firestore
    
    Args:
        days: Optional, only fetch logs from last N days. None = all logs.
    
    Returns:
        List of attendance log dictionaries
    """
    try:
        db = get_firestore_db()
        
        query = db.collection('attendance_logs').order_by('date', direction=firestore.Query.DESCENDING)
        
        # Filter by date if days specified
        if days:
            cutoff_date = (get_ist_now() - timedelta(days=days)).strftime('%Y-%m-%d')
            query = query.where('date', '>=', cutoff_date)
        
        docs = query.stream()
        
        logs = []
        for doc in docs:
            data = doc.to_dict()
            logs.append({
                'Name': data.get('name', ''),
                'Date': data.get('date', ''),
                'Time': data.get('time', '')
            })
        
        logger.info(f"✅ Fetched {len(logs)} attendance logs from Firestore")
        return logs
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch attendance logs: {e}")
        return []


def get_attendance_logs_by_date(date: str) -> list:
    """
    Fetch attendance logs for a specific date only.
    Much more efficient than fetching all and filtering client-side.
    
    Args:
        date: Date string (YYYY-MM-DD format)
    
    Returns:
        List of attendance logs for that date
    """
    try:
        db = get_firestore_db()
        
        docs = db.collection('attendance_logs')\
                 .where('date', '==', date)\
                 .order_by('time', direction=firestore.Query.DESCENDING)\
                 .stream()
        
        logs = []
        for doc in docs:
            data = doc.to_dict()
            logs.append({
                'Name': data.get('name', ''),
                'Date': data.get('date', ''),
                'Time': data.get('time', '')
            })
        
        logger.info(f"✅ Fetched {len(logs)} logs for date {date}")
        return logs
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch logs for date {date}: {e}")
        return []


def check_attendance_exists(name: str, date: str) -> bool:
    """
    Check if attendance already exists for a student on a given date.
    Efficient query: limit(1)
    
    Args:
        name: Student name
        date: Date string (YYYY-MM-DD)
        
    Returns:
        True if exists
    """
    try:
        db = get_firestore_db()
        docs = db.collection('attendance_logs')\
                 .where('name', '==', name)\
                 .where('date', '==', date)\
                 .limit(1)\
                 .stream()
        
        # If any document is returned, it exists
        for _ in docs:
            return True
            
        return False
        
    except Exception as e:
        logger.error(f"❌ Failed to check attendance existence: {e}")
        return False


def get_today_attendance() -> dict:
    """
    Fetch today's attendance from Firestore
    
    Returns:
        Dictionary with logs and stats
    """
    try:
        db = get_firestore_db()
        today_str = get_ist_now().strftime('%Y-%m-%d')
        
        docs = db.collection('attendance_logs').where('date', '==', today_str).stream()
        
        logs = []
        names_seen = set()
        for doc in docs:
            data = doc.to_dict()
            name = data.get('name', '')
            names_seen.add(name)
            logs.append({
                'Name': name,
                'Date': data.get('date', ''),
                'Time': data.get('time', '')
            })
        
        return {
            'logs': logs,
            'stats': {
                'present': len(names_seen),
                'total_entries': len(logs)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch today's attendance: {e}")
        return {'logs': [], 'stats': {'present': 0, 'total_entries': 0}}



def cleanup_old_logs(days: int = 15) -> int:
    """
    Delete attendance logs older than N days
    
    Args:
        days: Delete logs older than this many days
    
    Returns:
        Number of logs deleted
    """
    try:
        db = get_firestore_db()
        cutoff_date = (get_ist_now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        # Find old logs
        old_docs = db.collection('attendance_logs').where('date', '<', cutoff_date).stream()
        
        # Delete them
        deleted = 0
        for doc in old_docs:
            doc.reference.delete()
            deleted += 1
        
        if deleted > 0:
            logger.info(f"🗑️ Cleaned up {deleted} logs older than {days} days")
        
        return deleted
        
    except Exception as e:
        logger.error(f"❌ Failed to cleanup old logs: {e}")
        return 0


def clear_today_attendance_firestore() -> int:
    """
    Clear today's attendance logs from Firestore
    
    Returns:
        Number of logs deleted
    """
    try:
        db = get_firestore_db()
        today_str = get_ist_now().strftime('%Y-%m-%d')
        
        docs = db.collection('attendance_logs').where('date', '==', today_str).stream()
        
        deleted = 0
        for doc in docs:
            doc.reference.delete()
            deleted += 1
        
        logger.info(f"🗑️ Cleared {deleted} attendance logs for today")
        return deleted
        
    except Exception as e:
        logger.error(f"❌ Failed to clear today's attendance: {e}")
        return 0


# ==================== FIRESTORE (STUDENT METADATA) ====================

def update_student_metadata(name: str, photo_count: int):
    """
    Update student metadata (photo count) in Firestore.
    Solves N+1 query issue for student list.
    """
    try:
        db = get_firestore_db()
        db.collection('students').document(name).set({
            'name': name,
            'photo_count': photo_count,
            'last_updated': firestore.SERVER_TIMESTAMP
        }, merge=True)
        logger.info(f"✅ Updated metadata for {name}: {photo_count} photos")
    except Exception as e:
        logger.error(f"❌ Failed to update metadata for {name}: {e}")

def delete_student_metadata(name: str):
    """Delete student metadata from Firestore"""
    try:
        db = get_firestore_db()
        db.collection('students').document(name).delete()
        logger.info(f"✅ Deleted metadata for {name}")
    except Exception as e:
        logger.error(f"❌ Failed to delete metadata for {name}: {e}")

def get_all_students_from_metadata() -> list:
    """
    Get all students from Firestore metadata (Fast!)
    Replaces slow storage iteration.
    """
    try:
        db = get_firestore_db()
        docs = db.collection('students').order_by('name').stream()
        
        students = []
        for doc in docs:
            data = doc.to_dict()
            students.append({
                "name": data.get('name', doc.id),
                "image_count": data.get('photo_count', 0),
                "has_embedding": True # If in metadata, it's registered
            })
        return students
    except Exception as e:
        logger.error(f"❌ Failed to get students from metadata: {e}")
        return []

# ==================== SYNC VERSION (CACHE INVALIDATION) ====================

def bump_sync_version(action: str = "update") -> int:
    """
    Increment sync version - triggers cache invalidation for all clients.
    Call this after any data mutation (attendance, register, delete).
    
    Args:
        action: Type of action that triggered the bump
                ("attendance", "register", "delete", "clear")
    
    Returns:
        New version number
    """
    try:
        db = get_firestore_db()
        doc_ref = db.collection('metadata').document('sync')
        
        # Use transaction to safely increment
        doc_ref.set({
            'version': firestore.Increment(1),
            'lastAction': action,
            'timestamp': firestore.SERVER_TIMESTAMP
        }, merge=True)
        
        # Get the new version to return
        new_doc = doc_ref.get()
        new_version = new_doc.to_dict().get('version', 1) if new_doc.exists else 1
        
        logger.info(f"🔄 Sync version bumped to {new_version} (action: {action})")
        return new_version
        
    except Exception as e:
        logger.error(f"❌ Failed to bump sync version: {e}")
        return -1


def get_sync_version() -> dict:
    """
    Get current sync version and metadata.
    
    Returns:
        Dictionary with version, lastAction, timestamp
    """
    try:
        db = get_firestore_db()
        doc = db.collection('metadata').document('sync').get()
        
        if doc.exists:
            data = doc.to_dict()
            return {
                'version': data.get('version', 0),
                'lastAction': data.get('lastAction', 'none'),
                'timestamp': data.get('timestamp')
            }
        else:
            # Initialize if doesn't exist
            return {'version': 0, 'lastAction': 'none', 'timestamp': None}
            
    except Exception as e:
        logger.error(f"❌ Failed to get sync version: {e}")
        return {'version': 0, 'lastAction': 'error', 'error': str(e)}


# ==================== STORAGE QUERIES ====================

def get_student_photo_count(student_name: str) -> int:
    """
    Get the number of photos for a student from Firebase Storage
    
    Args:
        student_name: Student's name
    
    Returns:
        Number of photos
    """
    try:
        bucket = get_bucket()
        prefix = f"students/{student_name}/"
        blobs = list(bucket.list_blobs(prefix=prefix))
        
        # Filter out the folder itself
        count = len([b for b in blobs if not b.name.endswith('/')])
        return count
        
    except Exception as e:
        logger.error(f"❌ Failed to get photo count for {student_name}: {e}")
        return 0


def get_all_students_with_photo_counts() -> list:
    """
    Get all students with their photo counts from Firebase Storage/Embeddings
    
    Returns:
        List of student dicts with name, image_count, has_embedding
    """
    try:
        bucket = get_bucket()
        
        # Get all embeddings (source of truth for registered students)
        embeddings = list(bucket.list_blobs(prefix="embeddings/"))
        
        students = []
        for blob in embeddings:
            if blob.name.endswith('.npy'):
                name = blob.name.replace('embeddings/', '').replace('.npy', '')
                
                # Get photo count from storage
                photo_count = get_student_photo_count(name)
                
                students.append({
                    "name": name,
                    "image_count": photo_count,
                    "has_embedding": True
                })
        
        return sorted(students, key=lambda x: x["name"])
        
    except Exception as e:
        logger.error(f"❌ Failed to get students with photo counts: {e}")
        return []

