
import logging
from firebase_admin import firestore
from datetime import timedelta
import random
from config.firebase_admin import get_firestore_db, get_ist_now

logger = logging.getLogger(__name__)

# ==================== ATTENDANCE LOGS ====================

def save_attendance_log(name: str, date: str, time: str, class_name: str = "", section: str = "", subject: str = "", source: str = "AI_Camera") -> bool:
    """Save attendance log to Firestore"""
    try:
        db = get_firestore_db()
        db.collection('attendance_logs').document().set({
            'name': name,
            'date': date,
            'time': time,
            'class_name': class_name,
            'section': section,
            'subject': subject,
            'source': source,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'created_at': get_ist_now().isoformat()
        })
        logger.info(f"✅ Saved attendance log: {name} on {date}")
        
        # Occasional cleanup
        if random.random() < 0.05:
            cleanup_old_logs(days=15)
        return True
    except Exception as e:
        logger.error(f"❌ Failed to save log: {e}")
        return False

def get_attendance_logs(days: int = None) -> list:
    """Fetch attendance logs"""
    try:
        db = get_firestore_db()
        query = db.collection('attendance_logs').order_by('date', direction=firestore.Query.DESCENDING)
        
        if days:
            cutoff_date = (get_ist_now() - timedelta(days=days)).strftime('%Y-%m-%d')
            query = query.where('date', '>=', cutoff_date)
        
        docs = query.stream()
        return [{'Name': d.get('name'), 'Date': d.get('date'), 'Time': d.get('time'), 'Class': d.get('class_name', ''), 'Section': d.get('section', ''), 'Subject': d.get('subject', ''), 'Source': d.get('source', 'AI_Camera')} for d in [doc.to_dict() for doc in docs]]
    except Exception as e:
        logger.error(f"❌ Failed to fetch logs: {e}")
        return []

def get_attendance_logs_by_date(date: str) -> list:
    """Fetch logs for specific date"""
    try:
        db = get_firestore_db()
        docs = db.collection('attendance_logs').where('date', '==', date).order_by('time', direction=firestore.Query.DESCENDING).stream()
        return [{'Name': d.get('name'), 'Date': d.get('date'), 'Time': d.get('time'), 'Class': d.get('class_name', ''), 'Section': d.get('section', ''), 'Subject': d.get('subject', ''), 'Source': d.get('source', 'AI_Camera')} for d in [doc.to_dict() for doc in docs]]
    except Exception as e:
        logger.error(f"❌ Failed to fetch logs for {date}: {e}")
        return []

def check_attendance_exists(name: str, date: str) -> bool:
    """Check if attendance already exists for name and date"""
    try:
        db = get_firestore_db()
        docs = db.collection('attendance_logs').where('name', '==', name).where('date', '==', date).limit(1).stream()
        return any(docs)
    except Exception as e:
        logger.error(f"❌ Failed to check attendance: {e}")
        return False

def get_today_attendance() -> dict:
    """Fetch today's attendance stats"""
    try:
        db = get_firestore_db()
        today_str = get_ist_now().strftime('%Y-%m-%d')
        docs = db.collection('attendance_logs').where('date', '==', today_str).stream()
        
        logs = []
        names_seen = set()
        for doc in docs:
            data = doc.to_dict()
            name = data.get('name', '')
            names_seen.add(name)
            logs.append({
                'Name': name, 
                'Date': data.get('date'), 
                'Time': data.get('time'),
                'Class': data.get('class_name', ''),
                'Section': data.get('section', ''),
                'Subject': data.get('subject', ''),
                'Source': data.get('source', 'AI_Camera')
            })
            
        return {
            'logs': logs,
            'stats': {'present': len(names_seen), 'total_entries': len(logs)}
        }
    except Exception as e:
        logger.error(f"❌ Failed to fetch today's attendance: {e}")
        return {'logs': [], 'stats': {'present': 0, 'total_entries': 0}}

def cleanup_old_logs(days: int = 15) -> int:
    """Delete old logs"""
    try:
        db = get_firestore_db()
        cutoff_date = (get_ist_now() - timedelta(days=days)).strftime('%Y-%m-%d')
        old_docs = db.collection('attendance_logs').where('date', '<', cutoff_date).stream()
        
        deleted = 0
        for doc in old_docs:
            doc.reference.delete()
            deleted += 1
        return deleted
    except Exception as e:
        logger.error(f"❌ Failed to cleanup: {e}")
        return 0

def clear_today_attendance_firestore() -> int:
    """Clear today's logs"""
    try:
        db = get_firestore_db()
        today_str = get_ist_now().strftime('%Y-%m-%d')
        docs = db.collection('attendance_logs').where('date', '==', today_str).stream()
        
        deleted = 0
        for doc in docs:
            doc.reference.delete()
            deleted += 1
        return deleted
    except Exception as e:
        logger.error(f"❌ Failed to clear today: {e}")
        return 0

# ==================== METADATA & SYNC ====================

def update_student_metadata(name: str, photo_count: int, class_name: str = "", section: str = "", roll_number: str = ""):
    try:
        db = get_firestore_db()
        doc_data = {
            'name': name, 'photo_count': photo_count, 'last_updated': firestore.SERVER_TIMESTAMP,
        }
        # Only write class/section/roll if non-empty, to prevent overwriting existing values
        if class_name and class_name.strip():
            doc_data['class_name'] = class_name.strip()
        if section and section.strip():
            doc_data['section'] = section.strip().upper()
        if roll_number and roll_number.strip():
            doc_data['roll_number'] = roll_number.strip()
        db.collection('students').document(name).set(doc_data, merge=True)
    except Exception as e:
        logger.error(f"❌ Failed to update metadata: {e}")

def delete_student_metadata(name: str):
    try:
        db = get_firestore_db()
        db.collection('students').document(name).delete()
    except Exception as e:
        logger.error(f"❌ Failed to delete metadata: {e}")

def get_all_students_from_metadata() -> list:
    try:
        db = get_firestore_db()
        docs = db.collection('students').order_by('name').stream()
        return [{"name": d.get('name', doc.id), "image_count": d.get('photo_count', 0), "has_embedding": True, "class_name": d.get('class_name', ''), "section": d.get('section', ''), "roll_number": d.get('roll_number', '')} for doc, d in [(doc, doc.to_dict()) for doc in docs]]
    except Exception as e:
        logger.error(f"❌ Failed to get students: {e}")
        return []

def bump_sync_version(action: str = "update") -> int:
    try:
        db = get_firestore_db()
        doc_ref = db.collection('metadata').document('sync')
        doc_ref.set({
            'version': firestore.Increment(1),
            'lastAction': action,
            'timestamp': firestore.SERVER_TIMESTAMP
        }, merge=True)
        return doc_ref.get().to_dict().get('version', 1)
    except Exception as e:
        logger.error(f"❌ Failed to bump version: {e}")
        return -1

def get_sync_version() -> dict:
    try:
        db = get_firestore_db()
        doc = db.collection('metadata').document('sync').get()
        if doc.exists:
            data = doc.to_dict()
            return {'version': data.get('version', 0), 'lastAction': data.get('lastAction', 'none'), 'timestamp': data.get('timestamp')}
        return {'version': 0, 'lastAction': 'none'}
    except Exception as e:
        logger.error(f"❌ Failed to get sync version: {e}")
        return {'version': 0, 'error': str(e)}
