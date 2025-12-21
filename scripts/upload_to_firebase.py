#!/usr/bin/env python3
"""
Upload existing student data to Firebase Storage

This script uploads all your existing student photos and embeddings to Firebase.
Run this once to populate Firebase with your current local data.
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from config.firebase_admin import (
    initialize_firebase,
    upload_student_images,
    upload_embedding
)

def main():
    print("🚀 Starting Firebase data sync...")
    
    # Initialize Firebase
    try:
        initialize_firebase()
        print("✅ Firebase initialized\n")
    except Exception as e:
        print(f"❌ Failed to initialize Firebase: {e}")
        return
    
    # Paths
    known_faces_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'known_faces')
    embeddings_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'embeddings')
    
    # Get all students
    if not os.path.exists(known_faces_dir):
        print(f"❌ Known faces directory not found: {known_faces_dir}")
        return
    
    students = [d for d in os.listdir(known_faces_dir) 
                if os.path.isdir(os.path.join(known_faces_dir, d))]
    
    if not students:
        print("⚠️  No students found in data/known_faces/")
        return
    
    print(f"📋 Found {len(students)} students to upload:\n")
    
    total_images = 0
    total_embeddings = 0
    
    for student_name in students:
        print(f"📤 Uploading data for: {student_name}")
        
        # Upload images
        student_dir = os.path.join(known_faces_dir, student_name)
        try:
            urls = upload_student_images(student_dir, student_name)
            print(f"   ✅ Uploaded {len(urls)} images")
            total_images += len(urls)
        except Exception as e:
            print(f"   ⚠️  Image upload failed: {e}")
        
        # Upload embedding
        embedding_path = os.path.join(embeddings_dir, f"{student_name}.npy")
        if os.path.exists(embedding_path):
            try:
                upload_embedding(student_name, embedding_path)
                print(f"   ✅ Uploaded embedding")
                total_embeddings += 1
            except Exception as e:
                print(f"   ⚠️  Embedding upload failed: {e}")
        else:
            print(f"   ⚠️  No embedding found for {student_name}")
        
        print()  # Blank line
    
    print("=" * 50)
    print(f"🎉 Upload complete!")
    print(f"   📸 Total images uploaded: {total_images}")
    print(f"   🧠 Total embeddings uploaded: {total_embeddings}")
    print("=" * 50)
    print(f"\n✅ Check Firebase Console:")
    print("   https://console.firebase.google.com/u/0/project/attendx-572c8/storage")

if __name__ == "__main__":
    main()
