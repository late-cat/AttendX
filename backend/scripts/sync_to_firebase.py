#!/usr/bin/env python3
"""
Firebase Sync Script for AttendX
================================

This script syncs your local data folder with Firebase Storage.
Any changes you make locally (rename, add, delete students/photos) 
will be reflected in Firebase.

Usage:
    cd backend
    python scripts/sync_to_firebase.py

What it syncs:
    - data/known_faces/{student}/*.jpg → students/{student}/*.jpg
    - data/embeddings/{student}.npy → embeddings/{student}.npy
"""

import os
import sys

# Add parent directories to path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
root_dir = os.path.dirname(backend_dir)
sys.path.insert(0, backend_dir)

from config.firebase_admin import initialize_firebase, get_bucket
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Paths
KNOWN_FACES_DIR = os.path.join(root_dir, "data/known_faces")
EMBEDDINGS_DIR = os.path.join(root_dir, "data/embeddings")


def get_local_students():
    """Get list of local student folders"""
    if not os.path.exists(KNOWN_FACES_DIR):
        return {}
    
    students = {}
    for name in os.listdir(KNOWN_FACES_DIR):
        folder_path = os.path.join(KNOWN_FACES_DIR, name)
        if os.path.isdir(folder_path) and not name.startswith('.'):
            # Get all image files
            images = [f for f in os.listdir(folder_path) 
                     if f.lower().endswith(('.jpg', '.jpeg', '.png')) and not f.startswith('.')]
            students[name] = images
    return students


def get_local_embeddings():
    """Get list of local embedding files"""
    if not os.path.exists(EMBEDDINGS_DIR):
        return []
    
    return [f.replace('.npy', '') for f in os.listdir(EMBEDDINGS_DIR) 
            if f.endswith('.npy') and not f.startswith('.')]


def get_firebase_students(bucket):
    """Get list of students in Firebase Storage"""
    students = {}
    blobs = bucket.list_blobs(prefix="students/")
    
    for blob in blobs:
        # Skip the folder itself
        if blob.name == "students/":
            continue
        
        # Parse path: students/{name}/{image}
        parts = blob.name.split('/')
        if len(parts) >= 3:
            name = parts[1]
            image = parts[2]
            if name not in students:
                students[name] = []
            if image:  # Not empty
                students[name].append(image)
    
    return students


def get_firebase_embeddings(bucket):
    """Get list of embeddings in Firebase Storage"""
    embeddings = []
    blobs = bucket.list_blobs(prefix="embeddings/")
    
    for blob in blobs:
        if blob.name.endswith('.npy'):
            # Parse: embeddings/{name}.npy
            name = os.path.basename(blob.name).replace('.npy', '')
            embeddings.append(name)
    
    return embeddings


def sync_students(bucket, local_students, firebase_students):
    """Sync student images from local to Firebase"""
    logger.info("\n📸 Syncing Student Images...")
    
    uploaded = 0
    deleted = 0
    
    # 1. Upload new/updated students
    for name, local_images in local_students.items():
        firebase_images = firebase_students.get(name, [])
        
        # Upload each image
        for idx, image in enumerate(sorted(local_images), start=1):
            local_path = os.path.join(KNOWN_FACES_DIR, name, image)
            storage_path = f"students/{name}/{idx}.jpg"
            
            blob = bucket.blob(storage_path)
            blob.upload_from_filename(local_path)
            blob.make_public()
            uploaded += 1
        
        if name not in firebase_students:
            logger.info(f"   ➕ Added: {name} ({len(local_images)} images)")
        else:
            logger.info(f"   🔄 Updated: {name} ({len(local_images)} images)")
    
    # 2. Delete students not in local
    for name in firebase_students:
        if name not in local_students:
            # Delete all images for this student
            prefix = f"students/{name}/"
            blobs = bucket.list_blobs(prefix=prefix)
            for blob in blobs:
                blob.delete()
                deleted += 1
            logger.info(f"   🗑️  Deleted: {name}")
    
    return uploaded, deleted


def sync_embeddings(bucket, local_embeddings, firebase_embeddings):
    """Sync embeddings from local to Firebase"""
    logger.info("\n🧠 Syncing Embeddings...")
    
    uploaded = 0
    deleted = 0
    
    # 1. Upload local embeddings
    for name in local_embeddings:
        local_path = os.path.join(EMBEDDINGS_DIR, f"{name}.npy")
        storage_path = f"embeddings/{name}.npy"
        
        blob = bucket.blob(storage_path)
        blob.upload_from_filename(local_path)
        
        if name not in firebase_embeddings:
            logger.info(f"   ➕ Added: {name}.npy")
        else:
            logger.info(f"   🔄 Updated: {name}.npy")
        uploaded += 1
    
    # 2. Delete embeddings not in local
    for name in firebase_embeddings:
        if name not in local_embeddings:
            storage_path = f"embeddings/{name}.npy"
            blob = bucket.blob(storage_path)
            if blob.exists():
                blob.delete()
                deleted += 1
                logger.info(f"   🗑️  Deleted: {name}.npy")
    
    return uploaded, deleted


def main():
    logger.info("=" * 50)
    logger.info("🔥 AttendX Firebase Sync")
    logger.info("=" * 50)
    
    # Initialize Firebase
    logger.info("\n📡 Connecting to Firebase...")
    initialize_firebase()
    bucket = get_bucket()
    logger.info("   ✅ Connected!")
    
    # Get local data
    logger.info("\n📂 Scanning local data...")
    local_students = get_local_students()
    local_embeddings = get_local_embeddings()
    logger.info(f"   Found {len(local_students)} students, {len(local_embeddings)} embeddings")
    
    # Get Firebase data
    logger.info("\n☁️  Scanning Firebase Storage...")
    firebase_students = get_firebase_students(bucket)
    firebase_embeddings = get_firebase_embeddings(bucket)
    logger.info(f"   Found {len(firebase_students)} students, {len(firebase_embeddings)} embeddings")
    
    # Sync
    img_up, img_del = sync_students(bucket, local_students, firebase_students)
    emb_up, emb_del = sync_embeddings(bucket, local_embeddings, firebase_embeddings)
    
    # Summary
    logger.info("\n" + "=" * 50)
    logger.info("✅ Sync Complete!")
    logger.info("=" * 50)
    logger.info(f"   📸 Images:     {img_up} uploaded, {img_del} deleted")
    logger.info(f"   🧠 Embeddings: {emb_up} uploaded, {emb_del} deleted")
    logger.info("")


if __name__ == "__main__":
    main()
