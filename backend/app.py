# TensorFlow environment configuration (MUST be before TensorFlow import)
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Reduce TF logging
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
import sys
import logging

import pandas as pd
from datetime import datetime
import time

# Fix imports for deployment - add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)
sys.path.insert(0, current_dir)

# Import from backend subdirectories
try:
    from backend.vision.recognizer import recognize_face, ATTENDANCE_FILE
    from backend.vision.embedding_utils import generate_embeddings_for_person
    from backend.config.firebase_admin import (
        initialize_firebase,
        upload_student_images,
        upload_embedding,
        download_all_embeddings,
        sync_embeddings_to_firebase,
        get_storage_usage
    )
except ImportError:
    # Fallback for local development
    from vision.recognizer import recognize_face, ATTENDANCE_FILE
    from vision.embedding_utils import generate_embeddings_for_person
    from config.firebase_admin import (
        initialize_firebase,
        upload_student_images,
        upload_embedding,
        download_all_embeddings,
        sync_embeddings_to_firebase,
        get_storage_usage
    )

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS for all origins (allows any device/domain to access the API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

# Paths
EMBEDDINGS_DIR = os.path.join(os.path.dirname(__file__), "../data/embeddings")
KNOWN_FACES_DIR = os.path.join(os.path.dirname(__file__), "../data/known_faces")

@app.on_event("startup")
async def startup_event():
    """Initialize Firebase and download embeddings on startup"""
    logger.info("🚀 Starting AttendX Backend...")
    
    try:
        # Initialize Firebase
        initialize_firebase()
        logger.info("✅ Firebase initialized")
        
        # Smart embedding caching: Download from Firebase if local is empty
        os.makedirs(EMBEDDINGS_DIR, exist_ok=True)
        local_embeddings = [f for f in os.listdir(EMBEDDINGS_DIR) if f.endswith('.npy')]
        
        if len(local_embeddings) == 0:
            logger.info("📥 No local embeddings found. Downloading from Firebase...")
            count = download_all_embeddings(EMBEDDINGS_DIR)
            logger.info(f"✅ Downloaded {count} embeddings from Firebase")
        else:
            logger.info(f"✅ Using {len(local_embeddings)} cached embeddings")
        
    except Exception as e:
        logger.error(f"⚠️ Startup warning: {e}")
        logger.info("Continuing without Firebase (development mode)")

@app.get("/")
def read_root():
    return {"status": "AttendX Backend Running", "timestamp": time.time()}

@app.get("/stats")
def get_stats():
    """Return system statistics."""
    # Count total students from embeddings
    total_students = 0
    if os.path.exists(EMBEDDINGS_DIR):
        total_students = len([f for f in os.listdir(EMBEDDINGS_DIR) if f.endswith('.npy')])
    
    return {
        "total_students": total_students,
        "model": "ArcFace",
        "threshold": 0.50
    }

@app.get("/storage/stats")
def get_storage_stats():
    """Return Firebase Storage statistics."""
    try:
        stats = get_storage_usage()
        return {
            "status": "success",
            "firebase_storage": stats,
            "local_embeddings": len([f for f in os.listdir(EMBEDDINGS_DIR) if f.endswith('.npy')]) if os.path.exists(EMBEDDINGS_DIR) else 0
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@app.get("/system/status")
def get_status():
    return {"status": "online", "model": "ArcFace", "backend": "FastAPI"}

@app.get("/attendance/logs")
def get_logs():
    """Return all attendance logs."""
    if not os.path.exists(ATTENDANCE_FILE):
        return {"logs": []}
    
    try:
        df = pd.read_csv(ATTENDANCE_FILE)
        # Convert to list of dicts
        logs = df.to_dict(orient="records")
        return {"logs": logs}
    except Exception as e:
        return {"logs": [], "error": str(e)}

@app.get("/attendance/today")
def get_today_logs():
    """Return only today's attendance."""
    if not os.path.exists(ATTENDANCE_FILE):
        return {"logs": [], "stats": {"present": 0}}
        
    try:
        df = pd.read_csv(ATTENDANCE_FILE)
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        today_df = df[df["Date"] == today_str]
        logs = today_df.to_dict(orient="records")
        
        # Calculate stats
        unique_students = len(today_df["Name"].unique()) if not today_df.empty else 0
        
        return {
            "logs": logs,
            "stats": {
                "present": unique_students,
                "total_entries": len(logs)
            }
        }
    except Exception as e:
        return {"logs": [], "error": str(e)}

@app.post("/recognize")
async def recognize_api(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Save temp file
    temp_filename = f"{uuid.uuid4()}.jpg"
    temp_path = os.path.join(TEMP_DIR, temp_filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Run recognition
        results = recognize_face(temp_path)
        
        # Cleanup
        os.remove(temp_path)
        
        # Determine overall status
        status = "unknown"
        name = "Unknown"
        message = "No face detected"
        
        if results:
            # Pick best result (lowest distance or first match)
            # Logic: If any result is 'present' or 'marked', that's our match
            for res in results:
                if res['status'] in ['present', 'marked']:
                    status = res['status']
                    name = res['name']
                    message = res['message']
                    break
            else:
                # If no match found among faces
                if results[0]['status'] == 'unknown':
                    message = "Face not recognized"
        
        return {
            "status": status,
            "name": name,
            "message": message,
            "details": results
        }

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/register-student")
async def register_student(name: str = Form(...), files: list[UploadFile] = File(...)):
    """Register a new student with their face images."""
    if not name or not files:
        raise HTTPException(status_code=400, detail="Name and images required")
    
    # Create student folder locally
    student_dir = os.path.join(KNOWN_FACES_DIR, name)
    os.makedirs(student_dir, exist_ok=True)
    
    try:
        # Step 1: Save uploaded images locally
        logger.info(f"📥 Saving {len(files)} images for {name}...")
        for idx, file in enumerate(files):
            file_path = os.path.join(student_dir, f"{idx+1}.jpg")
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        
        # Step 2: Generate embeddings from local images
        logger.info(f"🧠 Generating embeddings for {name}...")
        success = generate_embeddings_for_person(name, student_dir, EMBEDDINGS_DIR)
        
        if not success:
            raise HTTPException(status_code=400, detail="No valid faces found in images")
        
        # Step 3: Upload images to Firebase Storage
        logger.info(f"☁️ Uploading images to Firebase for {name}...")
        try:
            image_urls = upload_student_images(student_dir, name)
            logger.info(f"✅ Uploaded {len(image_urls)} images to Firebase")
        except Exception as e:
            logger.warning(f"⚠️ Firebase upload failed: {e}")
            image_urls = []
        
        # Step 4: Upload embedding to Firebase Storage (smart caching!)
        logger.info(f"☁️ Uploading embedding to Firebase for {name}...")
        try:
            embedding_path = os.path.join(EMBEDDINGS_DIR, f"{name}.npy")
            upload_embedding(name, embedding_path)
            logger.info(f"✅ Uploaded embedding to Firebase")
        except Exception as e:
            logger.warning(f"⚠️ Embedding upload failed: {e}")
        
        return {
            "status": "success",
            "message": f"Student {name} registered successfully",
            "image_urls": image_urls,
            "embeddings_cached": True
        }
            
    except HTTPException:
        # Cleanup on validation failure
        if os.path.exists(student_dir):
            shutil.rmtree(student_dir)
        raise
    except Exception as e:
        # Cleanup on failure
        if os.path.exists(student_dir):
            shutil.rmtree(student_dir)
        logger.error(f"❌ Registration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
