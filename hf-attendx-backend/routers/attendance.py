
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
