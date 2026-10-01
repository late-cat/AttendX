from core.config import settings
import numpy as np
from deepface import DeepFace
from datetime import datetime, timezone, timedelta
import pandas as pd
import os
import cv2
from vision.face_quality import assess_face_quality

IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    """Get current datetime in IST timezone."""
    return datetime.now(IST)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ATTENDANCE_FILE = os.path.join(ROOT_DIR, "data/attendance.csv")

MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "retinaface"
THRESHOLD = settings.FACE_MATCH_THRESHOLD

_cached_embeddings = {"student": None, "teacher": None}
_cache_loaded = {"student": False, "teacher": False}

def load_embeddings(force_reload=False, role="student"):
    """Load embeddings with caching for performance based on role (student/teacher)."""
    global _cached_embeddings, _cache_loaded

    if _cache_loaded[role] and not force_reload:
        return _cached_embeddings[role]

    embeddings = {}
    target_dir = settings.TEACHER_EMBEDDINGS_DIR if role == "teacher" else settings.EMBEDDINGS_DIR

    if not os.path.exists(target_dir):
        print(f"Warning: {target_dir} does not exist.")
        _cached_embeddings[role] = {}
        _cache_loaded[role] = True
        return {}
    
    for file in os.listdir(target_dir):
        if file.endswith(".npy"):
            name = os.path.splitext(file)[0]
            path = os.path.join(target_dir, file)
            embeddings[name] = np.load(path)
    
    _cached_embeddings[role] = embeddings
    _cache_loaded[role] = True
    print(f"✅ Loaded {len(embeddings)} {role} embeddings into cache")
    return embeddings

def reload_embeddings():
    """Force reload embeddings (call after registration)."""
    load_embeddings(force_reload=True, role="student")
    return load_embeddings(force_reload=True, role="teacher")

def find_cosine_distance(source_representation, test_representation):
    """Calculate cosine distance between two vectors."""
    a = np.matmul(np.transpose(source_representation), test_representation)
    b = np.sum(np.multiply(source_representation, source_representation))
    c = np.sum(np.multiply(test_representation, test_representation))
    return 1 - (a / (np.sqrt(b) * np.sqrt(c)))

def mark_attendance(name, skip_sync=False, recognition_metadata=None):
    """Atomically persist attendance, keeping the CSV as a best-effort mirror."""
    now = get_ist_now()  # Use IST timezone
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    if not os.path.exists(ATTENDANCE_FILE):
        df = pd.DataFrame(columns=["Name", "Date", "Time"])
        df.to_csv(ATTENDANCE_FILE, index=False)
    
    try:
        from services.firestore_db import check_attendance_exists, save_attendance_log, bump_sync_version

        saved = save_attendance_log(
            name,
            date_str,
            time_str,
            recognition_metadata=recognition_metadata,
        )
        if not saved:
            if check_attendance_exists(name, date_str):
                return False, "Already marked present"
            return False, "Attendance could not be saved"

        try:
            df = pd.read_csv(ATTENDANCE_FILE)
        except pd.errors.EmptyDataError:
            df = pd.DataFrame(columns=["Name", "Date", "Time"])
        new_entry = pd.DataFrame({"Name": [name], "Date": [date_str], "Time": [time_str]})
        df = pd.concat([df, new_entry], ignore_index=True)
        df.to_csv(ATTENDANCE_FILE, index=False)

        if not skip_sync:
            bump_sync_version("attendance")
        return True, "Marked present"
    except Exception as e:
        print(f"Firestore attendance save error: {e}")
        return False, "Attendance could not be saved"

def mark_attendance_firestore(name):
    """Save attendance directly to Firestore (for use in cloud deployments)."""
    now = get_ist_now()  # Use IST timezone
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    try:
        from services.firestore_db import save_attendance_log, check_attendance_exists, bump_sync_version

        saved = save_attendance_log(name, date_str, time_str)
        if saved:
            bump_sync_version("attendance")
            return True, "Marked present"
        if check_attendance_exists(name, date_str):
            return False, "Already marked present"
        return False, "Attendance could not be saved"
    except Exception as e:
        print(f"Firestore error: {e}")
        return False, "Attendance could not be saved"

def recognize_face(image_path, save=True, role="student"):
    """Run face recognition on a single image path."""
    known_embeddings = load_embeddings(role=role)
    
    try:
        faces = DeepFace.represent(
            img_path=image_path,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True
        )
        
        results = []
        
        for face_obj in faces:
            embedding = face_obj["embedding"]
            quality = assess_face_quality(image_path, face_obj)

            if not quality.get("passed"):
                results.append({
                    "name": "Unknown",
                    "distance": None,
                    "status": "rejected",
                    "message": quality.get("reason", "Face quality was insufficient"),
                    "all_matches": [],
                    "quality": quality,
                })
                continue
            
            min_dist = 100
            best_match = "Unknown"
            valid_matches = []
            
            for name, known_embed in known_embeddings.items():
                distance = find_cosine_distance(known_embed, embedding)
                if distance <= THRESHOLD:
                    valid_matches.append((name, distance))
                if distance < min_dist:
                    min_dist = distance
                    best_match = name
            
            status = "unknown"
            message = "Face not recognized"
            all_match_names = [m[0] for m in sorted(valid_matches, key=lambda x: x[1])]
            
            if min_dist <= THRESHOLD:
                if save:
                    recognition_metadata = {
                        "distance": float(min_dist),
                        "threshold": THRESHOLD,
                        "quality": quality,
                        "model": MODEL_NAME,
                        "detector": DETECTOR_BACKEND,
                    }
                    is_new, msg = mark_attendance(
                        best_match,
                        recognition_metadata=recognition_metadata,
                    )
                    status = "present" if is_new else "marked"
                    message = msg
                else:
                    status = "detected"
                    message = "Face matched but not saved"
                
                results.append({
                    "name": best_match,
                    "distance": float(min_dist),
                    "status": status,
                    "message": message,
                    "all_matches": all_match_names,
                    "quality": quality,
                })
            else:
                results.append({
                    "name": "Unknown",
                    "distance": float(min_dist),
                    "status": "unknown",
                    "message": "Face not recognized",
                    "all_matches": [],
                    "quality": quality,
                })
                
        return results

    except Exception as e:
        print(f"Error in recognition: {e}")
        return []
