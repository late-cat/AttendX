import numpy as np
from deepface import DeepFace
from datetime import datetime
import pandas as pd
import os
import cv2

# Configuration
# Pointing to the root 'data' directory
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
EMBEDDINGS_DIR = os.path.join(ROOT_DIR, "data/embeddings")
ATTENDANCE_FILE = os.path.join(ROOT_DIR, "data/attendance.csv")

MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "retinaface"
THRESHOLD = 0.50

# Performance: Global embedding cache
_cached_embeddings = None
_cache_loaded = False

def load_embeddings(force_reload=False):
    """Load embeddings with caching for performance."""
    global _cached_embeddings, _cache_loaded
    
    # Return cached if available and not forcing reload
    if _cache_loaded and not force_reload:
        return _cached_embeddings
    
    embeddings = {}
    if not os.path.exists(EMBEDDINGS_DIR):
        print(f"Warning: {EMBEDDINGS_DIR} does not exist.")
        _cached_embeddings = {}
        _cache_loaded = True
        return {}
    
    for file in os.listdir(EMBEDDINGS_DIR):
        if file.endswith(".npy"):
            name = os.path.splitext(file)[0]
            path = os.path.join(EMBEDDINGS_DIR, file)
            embeddings[name] = np.load(path)
    
    _cached_embeddings = embeddings
    _cache_loaded = True
    print(f"✅ Loaded {len(embeddings)} embeddings into cache")
    return embeddings

def reload_embeddings():
    """Force reload embeddings (call after registration)."""
    return load_embeddings(force_reload=True)

def find_cosine_distance(source_representation, test_representation):
    """Calculate cosine distance between two vectors."""
    a = np.matmul(np.transpose(source_representation), test_representation)
    b = np.sum(np.multiply(source_representation, source_representation))
    c = np.sum(np.multiply(test_representation, test_representation))
    return 1 - (a / (np.sqrt(b) * np.sqrt(c)))

def mark_attendance(name):
    """Log attendance to CSV file."""
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    # check if file exists, if not create it
    if not os.path.exists(ATTENDANCE_FILE):
        df = pd.DataFrame(columns=["Name", "Date", "Time"])
        df.to_csv(ATTENDANCE_FILE, index=False)
    
    try:
        df = pd.read_csv(ATTENDANCE_FILE)
    except pd.errors.EmptyDataError:
        df = pd.DataFrame(columns=["Name", "Date", "Time"])
        
    # Check if already marked for today
    already_marked = False
    if not df.empty:
        matches = df[(df["Name"] == name) & (df["Date"] == date_str)]
        if not matches.empty:
            already_marked = True
            
    if not already_marked:
        new_entry = pd.DataFrame({"Name": [name], "Date": [date_str], "Time": [time_str]})
        df = pd.concat([df, new_entry], ignore_index=True)
        df.to_csv(ATTENDANCE_FILE, index=False)
        return True, "Marked present"
    else:
        return False, "Already marked present"

def recognize_face(image_path):
    """Run face recognition on a single image path."""
    known_embeddings = load_embeddings()
    
    try:
        # Detect and represent faces
        faces = DeepFace.represent(
            img_path=image_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False
        )
        
        results = []
        
        for face_obj in faces:
            embedding = face_obj["embedding"]
            
            min_dist = 100
            best_match = "Unknown"
            
            for name, known_embed in known_embeddings.items():
                distance = find_cosine_distance(known_embed, embedding)
                if distance < min_dist:
                    min_dist = distance
                    best_match = name
            
            status = "unknown"
            message = "Face not recognized"
            
            if min_dist <= THRESHOLD:
                is_new, msg = mark_attendance(best_match)
                status = "present" if is_new else "marked"
                message = msg
                
                results.append({
                    "name": best_match,
                    "distance": float(min_dist),
                    "status": status,
                    "message": message
                })
            else:
                results.append({
                    "name": "Unknown",
                    "distance": float(min_dist),
                    "status": "unknown",
                    "message": "Face not recognized"
                })
                
        return results

    except Exception as e:
        print(f"Error in recognition: {e}")
        return []
