#!/usr/bin/env python3
"""
Smart Firebase Sync for AttendX
================================

Syncs local data to Firebase with smart detection:
- NEW students → Upload photos + embedding
- DELETED students → Remove from Firebase  
- CHANGED photo count → Re-upload photos
- MISSING embedding locally → Auto-generate first
- Already synced → Skip (fast!)

Usage:
    cd backend
    python scripts/sync_to_firebase.py
"""

import os
import sys

script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
root_dir = os.path.dirname(backend_dir)
sys.path.insert(0, backend_dir)

from config.firebase_admin import initialize_firebase, get_bucket
from vision.embedding_utils import generate_embeddings_for_person
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

KNOWN_FACES_DIR = os.path.join(root_dir, "data/known_faces")
EMBEDDINGS_DIR = os.path.join(root_dir, "data/embeddings")


def get_local_data():
    """Get local students with photo count and embedding status"""
    students = {}
    
    if not os.path.exists(KNOWN_FACES_DIR):
        return students
    
    for name in os.listdir(KNOWN_FACES_DIR):
        folder_path = os.path.join(KNOWN_FACES_DIR, name)
        if os.path.isdir(folder_path) and not name.startswith('.'):
            images = [f for f in os.listdir(folder_path) 
                     if f.lower().endswith(('.jpg', '.jpeg', '.png')) and not f.startswith('.')]
            
            embedding_path = os.path.join(EMBEDDINGS_DIR, f"{name}.npy")
            has_embedding = os.path.exists(embedding_path)
            
            students[name] = {
                'images': images,
                'count': len(images),
                'has_embedding': has_embedding
            }
    
    return students


def get_firebase_data(bucket):
    """Get Firebase students with photo count and embedding status"""
    students = {}
    embeddings = set()
    
    blobs = list(bucket.list_blobs(prefix="students/"))
    for blob in blobs:
        if blob.name == "students/":
            continue
        parts = blob.name.split('/')
        if len(parts) >= 3:
            name = parts[1]
            image = parts[2]
            if name not in students:
                students[name] = {'images': [], 'count': 0}
            if image:
                students[name]['images'].append(image)
                students[name]['count'] += 1
    
    blobs = list(bucket.list_blobs(prefix="embeddings/"))
    for blob in blobs:
        if blob.name.endswith('.npy'):
            name = os.path.basename(blob.name).replace('.npy', '')
            embeddings.add(name)
    
    return students, embeddings


def smart_sync():
    """Smart sync with full coverage"""
    
    logger.info("=" * 50)
    logger.info("🔥 AttendX Smart Sync")
    logger.info("=" * 50)
    
    logger.info("\n📡 Connecting to Firebase...")
    initialize_firebase()
    bucket = get_bucket()
    logger.info("   ✅ Connected!")
    
    logger.info("\n🔍 Scanning...")
    local = get_local_data()
    firebase_students, firebase_embeddings = get_firebase_data(bucket)
    
    local_emb_count = sum(1 for s in local.values() if s['has_embedding'])
    
    logger.info(f"   Local:    {len(local)} students, {local_emb_count} embeddings")
    logger.info(f"   Firebase: {len(firebase_students)} students, {len(firebase_embeddings)} embeddings")
    
    new_students = 0
    updated_students = 0  # photo count changed
    deleted_students = 0
    skipped = 0
    
    logger.info("\n📊 Processing...")
    
    for name, data in local.items():
        fb_data = firebase_students.get(name, {'count': 0})
        has_fb_embedding = name in firebase_embeddings
        
        if not data['has_embedding'] and data['count'] > 0:
            logger.info(f"   🧠 Generating: {name}")
            student_dir = os.path.join(KNOWN_FACES_DIR, name)
            success = generate_embeddings_for_person(name, student_dir, EMBEDDINGS_DIR)
            if success:
                data['has_embedding'] = True
        
        needs_photos = False
        needs_embedding = False
        
        if name not in firebase_students:
            needs_photos = True
            needs_embedding = True
            new_students += 1
            logger.info(f"   ➕ New: {name} ({data['count']} photos)")
        else:
            if data['count'] != fb_data['count']:
                needs_photos = True
                updated_students += 1
                logger.info(f"   � Updated: {name} ({fb_data['count']} → {data['count']} photos)")
                
                student_dir = os.path.join(KNOWN_FACES_DIR, name)
                generate_embeddings_for_person(name, student_dir, EMBEDDINGS_DIR)
                data['has_embedding'] = True
                needs_embedding = True
            
            if data['has_embedding'] and not has_fb_embedding:
                needs_embedding = True
        
        if needs_photos:
            if name in firebase_students:
                prefix = f"students/{name}/"
                for blob in bucket.list_blobs(prefix=prefix):
                    blob.delete()
            
            for idx, image in enumerate(sorted(data['images']), start=1):
                local_path = os.path.join(KNOWN_FACES_DIR, name, image)
                storage_path = f"students/{name}/{idx}.jpg"
                blob = bucket.blob(storage_path)
                blob.upload_from_filename(local_path)
                blob.make_public()
        
        if needs_embedding and data['has_embedding']:
            local_path = os.path.join(EMBEDDINGS_DIR, f"{name}.npy")
            storage_path = f"embeddings/{name}.npy"
            blob = bucket.blob(storage_path)
            blob.upload_from_filename(local_path)
        
        if not needs_photos and not needs_embedding:
            skipped += 1
    
    for name in firebase_students:
        if name not in local:
            logger.info(f"   🗑️ Removed: {name}")
            prefix = f"students/{name}/"
            for blob in bucket.list_blobs(prefix=prefix):
                blob.delete()
            if name in firebase_embeddings:
                blob = bucket.blob(f"embeddings/{name}.npy")
                if blob.exists():
                    blob.delete()
            deleted_students += 1
    
    logger.info("\n" + "=" * 40)
    logger.info("✅ Sync Complete!")
    logger.info("=" * 40)
    
    changes = []
    if new_students > 0:
        changes.append(f"{new_students} added")
    if updated_students > 0:
        changes.append(f"{updated_students} updated")
    if deleted_students > 0:
        changes.append(f"{deleted_students} deleted")
    if skipped > 0:
        changes.append(f"{skipped} unchanged")
    
    logger.info(f"   Students: {', '.join(changes) if changes else 'No changes'}")
    logger.info("")


if __name__ == "__main__":
    smart_sync()
