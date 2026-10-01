
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import base64
import binascii
import math
import os
import uuid
from services.firestore_db import (
    get_attendance_logs, get_attendance_logs_by_date, 
    get_today_attendance, clear_today_attendance_firestore, bump_sync_version
)
from core.cache import cache
from core.config import settings
from config.firebase_admin import get_firestore_db
from vision.liveness import assess_blink
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

class AttendanceRecord(BaseModel):
    name: str
    source: str = "AI_Camera"
    distance: Optional[float] = None
    quality: Optional[dict] = None

class FinalizeAttendanceRequest(BaseModel):
    class_name: str = ""
    section: str = ""
    subject: str = ""
    records: List[AttendanceRecord]

class TeacherCheckInRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    image: Optional[str] = None # base64 image string
    images: Optional[List[str]] = None
    blink_detected: bool = False
    liveness_state: Optional[str] = None


class TeacherLivenessRequest(BaseModel):
    images: List[str]

def _validate_coordinates(lat: float, lng: float) -> None:
    if not math.isfinite(lat) or not math.isfinite(lng):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    if not -90 <= lat <= 90 or not -180 <= lng <= 180:
        raise HTTPException(status_code=400, detail="Coordinates are outside valid ranges")


def _write_teacher_frames(encoded_frames: List[str], minimum_frames: int = 3):
    """Decode a bounded frame sequence into temporary files."""
    if len(encoded_frames) < minimum_frames:
        raise HTTPException(status_code=400, detail="At least three liveness frames are required")

    temp_paths = []
    try:
        for encoded in encoded_frames[:18]:
            if not encoded or not isinstance(encoded, str):
                raise HTTPException(status_code=400, detail="Invalid liveness frame")
            payload = encoded.split(",", 1)[1] if "," in encoded else encoded
            try:
                img_data = base64.b64decode(payload, validate=True)
            except (binascii.Error, ValueError):
                raise HTTPException(status_code=400, detail="Invalid image encoding")
            if len(img_data) > 5 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="Liveness frame is too large")
            temp_path = os.path.join(settings.TEMP_DIR, f"teacher_{uuid.uuid4()}.jpg")
            with open(temp_path, "wb") as handle:
                handle.write(img_data)
            temp_paths.append(temp_path)

        return temp_paths
    except Exception:
        for temp_path in temp_paths:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        raise


def _decode_teacher_frames(request: "TeacherCheckInRequest"):
    """Verify blink liveness and teacher identity for the final submission."""
    from vision.recognizer import recognize_face

    encoded_frames = request.images or ([request.image] if request.image else [])
    if len(encoded_frames) == 1 and (request.blink_detected or request.liveness_state == "manual_fallback"):
        temp_paths = _write_teacher_frames(encoded_frames, minimum_frames=1)
        try:
            db = get_firestore_db()
            results = recognize_face(temp_paths[-1], save=False, role="teacher")
            for result in results:
                if result.get("status") not in {"present", "marked", "detected"}:
                    continue
                for possible_name in result.get("all_matches", [result.get("name")]):
                    if not possible_name:
                        continue
                    teacher_doc = db.collection("teachers").document(possible_name).get()
                    if teacher_doc.exists:
                        return possible_name, {
                            "distance": result.get("distance"),
                            "quality": result.get("quality"),
                            "model": "ArcFace",
                            "detector": "retinaface",
                            "liveness": {
                                "passed": request.blink_detected,
                                "blink_detected": request.blink_detected,
                                "state": request.liveness_state or "client_blink",
                                "source": "client_edge_tracker",
                            },
                        }
            raise HTTPException(status_code=403, detail="Face not recognized or you are not registered as a teacher.")
        finally:
            for temp_path in temp_paths:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

    temp_paths = _write_teacher_frames(encoded_frames[:18])
    try:
        liveness = assess_blink(temp_paths)
        if not liveness.get("passed"):
            raise HTTPException(status_code=403, detail=liveness.get("reason", "Liveness check failed"))

        db = get_firestore_db()
        results = recognize_face(temp_paths[-1], save=False, role="teacher")
        for result in results:
            if result.get("status") not in {"present", "marked", "detected"}:
                continue
            for possible_name in result.get("all_matches", [result.get("name")]):
                if not possible_name:
                    continue
                teacher_doc = db.collection("teachers").document(possible_name).get()
                if teacher_doc.exists:
                    metadata = {
                        "distance": result.get("distance"),
                        "quality": result.get("quality"),
                        "model": "ArcFace",
                        "detector": "retinaface",
                        "liveness": liveness,
                    }
                    return possible_name, metadata
        raise HTTPException(status_code=403, detail="Face not recognized or you are not registered as a teacher.")
    finally:
        for temp_path in temp_paths:
            if os.path.exists(temp_path):
                os.remove(temp_path)


@router.post("/teacher/liveness")
def teacher_liveness_probe(request: TeacherLivenessRequest):
    """Probe a short webcam sequence without performing attendance writes.

    This endpoint powers passive blink monitoring. The check-in/out endpoint
    repeats the blink check and performs identity/GPS verification together,
    so a probe response alone can never create attendance.
    """
    temp_paths = _write_teacher_frames(request.images[:18])
    try:
        result = assess_blink(temp_paths)
        return {
            "status": "passed" if result.get("passed") else "waiting",
            "blink_detected": bool(result.get("blink_detected")),
            "liveness": result,
        }
    finally:
        for temp_path in temp_paths:
            if os.path.exists(temp_path):
                os.remove(temp_path)

@router.post("/finalize")
def finalize_attendance(request: FinalizeAttendanceRequest):
    """Save finalized attendance (after review) to Firestore."""
    from services.firestore_db import save_attendance_log
    from config.firebase_admin import get_ist_now
    
    now = get_ist_now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    saved_count = 0
    duplicate_count = 0
    try:
        for record in request.records:
            if save_attendance_log(
                record.name,
                date_str,
                time_str,
                request.class_name,
                request.section,
                request.subject,
                record.source,
                recognition_metadata={
                    "distance": record.distance,
                    "quality": record.quality,
                    "model": "ArcFace",
                    "detector": "retinaface",
                } if record.distance is not None or record.quality is not None else None,
            ):
                saved_count += 1
            else:
                duplicate_count += 1
                
        if saved_count > 0:
            bump_sync_version("attendance")
            cache.invalidate_all()
            
        if saved_count == 0 and duplicate_count > 0:
            return {"status": "duplicate", "message": "Attendance already marked for this class today."}
            
        return {"status": "success", "message": f"Saved {saved_count} new attendance records."}
    except Exception as e:
        logger.error(f"❌ Failed to finalize attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/teacher/check-in")
def teacher_check_in(request: TeacherCheckInRequest):
    """Check in a teacher if they are within the geofence and their face matches."""
    from core.utils import calculate_distance
    from config.firebase_admin import get_ist_now
    from services.firestore_db import save_teacher_check_in
    _validate_coordinates(request.lat, request.lng)
    distance = calculate_distance(
        request.lat, request.lng, settings.SCHOOL_LAT, settings.SCHOOL_LNG
    )
    
    if distance > settings.ALLOWED_RADIUS_METERS:
        raise HTTPException(status_code=403, detail=f"You are outside the school premises. (Distance: {int(distance)}m)")
    teacher_name, recognition_metadata = _decode_teacher_frames(request)

    now = get_ist_now()
    date_str = now.strftime("%Y-%m-%d")
    
    try:
        success, detail = save_teacher_check_in(
            teacher_name,
            date_str,
            now.strftime("%H:%M:%S"),
            request.lat,
            request.lng,
            distance,
            recognition_metadata=recognition_metadata,
        )
        if not success:
            raise HTTPException(status_code=400, detail=detail)
        return {"status": "success", "message": f"Checked in successfully as {teacher_name}."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to check in teacher: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/teacher/check-out")
def teacher_check_out(request: TeacherCheckInRequest):
    """Check out a teacher if they are within the geofence and their face matches."""
    from core.utils import calculate_distance
    from config.firebase_admin import get_ist_now
    from services.firestore_db import save_teacher_check_out
    _validate_coordinates(request.lat, request.lng)
    distance = calculate_distance(
        request.lat, request.lng, settings.SCHOOL_LAT, settings.SCHOOL_LNG
    )
    if distance > settings.ALLOWED_RADIUS_METERS:
        raise HTTPException(status_code=403, detail=f"You are outside the school premises. (Distance: {int(distance)}m)")
    teacher_name, recognition_metadata = _decode_teacher_frames(request)

    now = get_ist_now()
    date_str = now.strftime("%Y-%m-%d")
    
    try:
        success, detail = save_teacher_check_out(
            teacher_name,
            date_str,
            now.strftime("%H:%M:%S"),
            request.lat,
            request.lng,
            distance,
            recognition_metadata=recognition_metadata,
        )
        if not success:
            raise HTTPException(status_code=400, detail=detail)
        return {"status": "success", "message": f"Checked out successfully as {teacher_name}."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to check out teacher: {e}")
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
                'Check In': data.get('check_in_time', '-'),
                'Check Out': data.get('check_out_time', '-')
            })
        return {"logs": logs}
    except Exception as e:
        return {"logs": [], "error": str(e)}

@router.get("/teacher/logs")
def get_teacher_all_logs():
    try:
        from config.firebase_admin import get_firestore_db
        from firebase_admin import firestore
        db = get_firestore_db()
        docs = db.collection('teacher_attendance').order_by('date', direction=firestore.Query.DESCENDING).stream()
        
        logs = []
        for doc in docs:
            data = doc.to_dict()
            logs.append({
                'Name': data.get('name', 'Unknown'),
                'Date': data.get('date'),
                'Check In': data.get('check_in_time', '-'),
                'Check Out': data.get('check_out_time', '-')
            })
        return {"logs": logs}
    except Exception as e:
        return {"logs": [], "error": str(e)}
