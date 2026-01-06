"""
Upload team photos to Firebase Storage
Run this once to store team faces in Firebase
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.firebase_admin import get_bucket
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


TEAM_PHOTOS = [
    ("bapi mondal.jpg", "bapi_mondal.jpg"),
    ("sourjo ghosh.jpg", "sourjo_ghosh.jpg"),
    ("mondrita dutta.jpg", "mondrita_dutta.jpg"),
    ("srijita ghosh.jpg", "srijita_ghosh.jpg"),
]

def upload_team_photos():
    """Upload team photos to Firebase Storage under team_faces/ folder"""
    bucket = get_bucket()
    
    # Path to team_face folder
    team_face_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'team_face')
    
    uploaded = []
    
    for original_name, storage_name in TEAM_PHOTOS:
        local_path = os.path.join(team_face_dir, original_name)
        
        if not os.path.exists(local_path):
            logger.warning(f"⚠️ File not found: {local_path}")
            continue
        
        # Upload to team_faces/ folder in Firebase
        storage_path = f"team_faces/{storage_name}"
        blob = bucket.blob(storage_path)
        blob.upload_from_filename(local_path)
        
        # Make publicly readable
        blob.make_public()
        
        logger.info(f"✅ Uploaded: {storage_path}")
        logger.info(f"   URL: {blob.public_url}")
        
        uploaded.append({
            "name": storage_name,
            "url": blob.public_url
        })
    
    return uploaded


if __name__ == "__main__":
    print("🚀 Uploading team photos to Firebase Storage...")
    results = upload_team_photos()
    
    print("\n📋 Team Photo URLs:")
    for item in results:
        print(f"  {item['name']}: {item['url']}")
    
    print(f"\n✅ Uploaded {len(results)} team photos")
