
from fastapi import APIRouter, HTTPException
from services.firestore_db import (
    get_attendance_logs, get_attendance_logs_by_date, 
    get_today_attendance, clear_today_attendance_firestore, bump_sync_version
)
from core.cache import cache
import time
import logging

router = APIRouter(prefix="/attendance", tags=["Attendance"])
logger = logging.getLogger(__name__)

@router.get("/logs")
def get_logs(date: str = None, days: int = None, refresh: bool = False):
    """
    Return attendance logs from Firestore with optional filtering.
    """
    cache_key = f"date_{date}" if date else f"days_{days or 7}"
    
    # Check cache
    if not refresh:
        cached_data = cache.logs["data"].get(cache_key)
        cached_time = cache.logs["timestamp"].get(cache_key, 0)
        if cached_data and (time.time() - cached_time < cache.logs["ttl"]):
            return {"logs": cached_data, "cached": True}
    
    try:
        if date:
            logs = get_attendance_logs_by_date(date)
        else:
            query_days = min(days or 7, 15)
            logs = get_attendance_logs(days=query_days)
        
        # Update cache
        cache.logs["data"][cache_key] = logs
        cache.logs["timestamp"][cache_key] = time.time()
        
        return {"logs": logs}
    except Exception as e:
        logger.error(f"❌ Failed to get logs: {e}")
        return {"logs": [], "error": str(e)}

@router.get("/today")
def get_today_logs_endpoint(refresh: bool = False):
    """Return only today's attendance."""
    cache_age = time.time() - cache.today["timestamp"]
    if not refresh and cache.today["data"] and cache_age < cache.today["ttl"]:
        return {**cache.today["data"], "cached": True}
    
    try:
        result = get_today_attendance()
        cache.today["data"] = result
        cache.today["timestamp"] = time.time()
        return result
    except Exception as e:
        return {"logs": [], "stats": {"present": 0, "total_entries": 0}, "error": str(e)}

@router.delete("/clear/today")
def clear_today_attendance_endpoint():
    """Clear only today's attendance records."""
    try:
        deleted = clear_today_attendance_firestore()
        cache.invalidate_all()
        bump_sync_version("clear")
        return {"status": "success", "deleted": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel
from typing import List

class AttendanceRecord(BaseModel):
    name: str
    source: str = "AI_Camera"

class FinalizeAttendanceRequest(BaseModel):
    class_name: str = ""
    section: str = ""
    subject: str = ""
    records: List[AttendanceRecord]

class TeacherCheckInRequest(BaseModel):
    teacher_id: str
    lat: float
    lng: float
    image: str = None # base64 image string

# Example School Location (Should be in environment variables in production)
SCHOOL_LAT = 22.621798 # Updated for testing
SCHOOL_LNG = 88.421795 # Updated for testing
ALLOWED_RADIUS_METERS = 200

@router.post("/finalize")
def finalize_attendance(request: FinalizeAttendanceRequest):
    """Save finalized attendance (after review) to Firestore."""
    from services.firestore_db import save_attendance_log, check_attendance_exists
    from config.firebase_admin import get_ist_now
    
    now = get_ist_now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    saved_count = 0
    try:
        for record in request.records:
            # Check if already marked
            if not check_attendance_exists(record.name, date_str):
                save_attendance_log(
                    record.name, 
                    date_str, 
                    time_str, 
                    request.class_name, 
                    request.section, 
                    request.subject, 
                    record.source
                )
                saved_count += 1
                
        if saved_count > 0:
            bump_sync_version("attendance")
            cache.invalidate_all()
            
        return {"status": "success", "message": f"Saved {saved_count} new attendance records."}
    except Exception as e:
        logger.error(f"❌ Failed to finalize attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/teacher/check-in")
def teacher_check_in(request: TeacherCheckInRequest):
    """Check in a teacher if they are within the geofence and their face matches."""
    from core.utils import calculate_distance
    from config.firebase_admin import get_ist_now, get_firestore_db
    from firebase_admin import firestore
    from vision.recognizer import recognize_face
    import base64
    import os
    import uuid
    
    distance = calculate_distance(request.lat, request.lng, SCHOOL_LAT, SCHOOL_LNG)
    
    if distance > ALLOWED_RADIUS_METERS:
        raise HTTPException(status_code=403, detail=f"You are outside the school premises. (Distance: {int(distance)}m)")
        
    db = get_firestore_db()
    teacher_name = request.teacher_id
    
    # Face verification if image provided
    if request.image:
        try:
            # Decode base64
            img_data = base64.b64decode(request.image.split(",")[1] if "," in request.image else request.image)
            temp_path = os.path.join(settings.TEMP_DIR, f"teacher_{uuid.uuid4()}.jpg")
            with open(temp_path, "wb") as f:
                f.write(img_data)
                
            results = recognize_face(temp_path, save=False)
            if os.path.exists(temp_path): os.remove(temp_path)
            
            face_matched = False
            for res in results:
                if res['status'] in ['present', 'marked', 'detected']:
                    # Verify it's a teacher in the database
                    teacher_doc = db.collection('teachers').document(res['name']).get()
                    if teacher_doc.exists:
                        face_matched = True
                        teacher_name = res['name']
                        break
            
            if not face_matched:
                raise HTTPException(status_code=403, detail="Face not recognized or you are not registered as a teacher.")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Face verification error: {e}")
            raise HTTPException(status_code=500, detail="Face verification failed")
            
    now = get_ist_now()
    
    try:
        db.collection('teacher_attendance').document().set({
            'name': teacher_name,
            'date': now.strftime("%Y-%m-%d"),
            'time': now.strftime("%H:%M:%S"),
            'lat': request.lat,
            'lng': request.lng,
            'distance_m': distance,
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        return {"status": "success", "message": f"Checked in successfully as {teacher_name}."}
    except Exception as e:
        logger.error(f"❌ Failed to check in teacher: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/teacher/today")
def get_teacher_today_logs():
    try:
        from config.firebase_admin import get_ist_now, get_firestore_db
        db = get_firestore_db()
        today_str = get_ist_now().strftime('%Y-%m-%d')
        docs = db.collection('teacher_attendance').where('date', '==', today_str).stream()
        
        logs = []
        for doc in docs:
            data = doc.to_dict()
            logs.append({
                'Name': data.get('name', 'Unknown'),
                'Date': data.get('date'),
                'Time': data.get('time'),
                'Distance': data.get('distance_m')
            })
        return {"logs": logs}
    except Exception as e:
        return {"logs": [], "error": str(e)}

@router.get("/teacher/logs")
def get_teacher_all_logs():
    try:
        from config.firebase_admin import get_firestore_db
        db = get_firestore_db()
        docs = db.collection('teacher_attendance').order_by('date', direction=firestore.Query.DESCENDING).stream()
        
        logs = []
        for doc in docs:
            data = doc.to_dict()
            logs.append({
                'Name': data.get('name', 'Unknown'),
                'Date': data.get('date'),
                'Time': data.get('time'),
                'Distance': data.get('distance_m')
            })
        return {"logs": logs}
    except Exception as e:
        return {"logs": [], "error": str(e)}
