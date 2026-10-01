
import logging
import hashlib
from firebase_admin import firestore
from google.api_core.exceptions import AlreadyExists
from datetime import timedelta
import random
from typing import Optional
from config.firebase_admin import get_firestore_db, get_ist_now

logger = logging.getLogger(__name__)


def attendance_document_id(
    name: str,
    date: str,
    kind: str = "student",
    class_name: str = "",
    section: str = "",
    subject: str = "",
) -> str:
    """Return a stable Firestore-safe ID for one person's attendance/day.

    Names are user supplied and may contain characters that are not suitable for
    a Firestore path (notably ``/``), so use a digest rather than interpolating
    the name directly into the document ID.  The ID is stable across retries
    and application instances.
    """
    value = f"{kind}\x00{name}\x00{date}\x00{class_name}\x00{section}\x00{subject}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()


def save_attendance_log(
    name: str,
    date: str,
    time: str,
    class_name: str = "",
    section: str = "",
    subject: str = "",
    source: str = "AI_Camera",
    recognition_metadata: Optional[dict] = None,
) -> bool:
    """Atomically save one attendance log per student and date.

    ``create`` is intentionally used instead of ``set``: Firestore makes the
    create conditional on the deterministic document not already existing, so
    concurrent retries cannot create duplicate records.
    """
    try:
        db = get_firestore_db()
        doc_ref = db.collection('attendance_logs').document(
            attendance_document_id(name, date, class_name=class_name, section=section, subject=subject)
        )

        if doc_ref.get().exists:
            return False
        legacy_query = db.collection('attendance_logs').where('name', '==', name).where('date', '==', date)
        if class_name:
            legacy_query = legacy_query.where('class_name', '==', class_name)
        if section:
            legacy_query = legacy_query.where('section', '==', section)
        if subject:
            legacy_query = legacy_query.where('subject', '==', subject)
        legacy_docs = legacy_query.limit(1).stream()
        if any(legacy_docs):
            return False

        payload = {
            'name': name,
            'date': date,
            'time': time,
            'class_name': class_name,
            'section': section,
            'subject': subject,
            'source': source,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'created_at': get_ist_now().isoformat()
        }
        if recognition_metadata:
            payload['recognition'] = recognition_metadata
        doc_ref.create(payload)
        logger.info(f"✅ Saved attendance log: {name} on {date}")
        
        if random.random() < 0.05:
            cleanup_old_logs(days=15)
        return True
    except AlreadyExists:
        logger.info(f"ℹ️ Attendance already exists: {name} on {date}")
        return False
    except Exception as e:
        logger.error(f"❌ Failed to save log: {e}")
        raise

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

def check_attendance_exists(
    name: str,
    date: str,
    class_name: str = "",
    section: str = "",
    subject: str = "",
) -> bool:
    """Check if attendance already exists for name and date"""
    try:
        db = get_firestore_db()
        deterministic_ref = db.collection('attendance_logs').document(
            attendance_document_id(name, date, class_name=class_name, section=section, subject=subject)
        )
        if deterministic_ref.get().exists:
            return True

        query = db.collection('attendance_logs').where('name', '==', name).where('date', '==', date)
        if class_name:
            query = query.where('class_name', '==', class_name)
        if section:
            query = query.where('section', '==', section)
        if subject:
            query = query.where('subject', '==', subject)
        docs = query.limit(1).stream()
        return any(docs)
    except Exception as e:
        logger.error(f"❌ Failed to check attendance: {e}")
        return False


def _legacy_teacher_attendance_refs(db, name: str, date: str):
    """Find pre-deterministic teacher records, if any.

    This is only a compatibility path for data written before atomic teacher
    attendance was introduced.  New writes always use the deterministic ref.
    """
    return list(
        db.collection('teacher_attendance')
        .where('name', '==', name)
        .where('date', '==', date)
        .limit(10)
        .stream()
    )


def save_teacher_check_in(
    name: str,
    date: str,
    time: str,
    lat: float,
    lng: float,
    distance: float,
    recognition_metadata: Optional[dict] = None,
):
    """Atomically transition a teacher/day into the checked-in state.

    Returns ``(True, message)`` on success and ``(False, message)`` when the
    state already contains a check-in.  The transaction also protects legacy
    records selected during the compatibility lookup.
    """
    db = get_firestore_db()
    deterministic_ref = db.collection('teacher_attendance').document(
        attendance_document_id(name, date, kind="teacher")
    )
    legacy_snapshots = _legacy_teacher_attendance_refs(db, name, date)
    legacy_refs = [snapshot.reference for snapshot in legacy_snapshots]

    check_in_data = {
        'name': name,
        'date': date,
        'check_in_time': time,
        'check_in_lat': lat,
        'check_in_lng': lng,
        'check_in_distance_m': distance,
        'timestamp': firestore.SERVER_TIMESTAMP,
    }
    if recognition_metadata:
        check_in_data['recognition'] = recognition_metadata

    transaction = db.transaction()

    @firestore.transactional
    def transition(transaction):
        current = deterministic_ref.get(transaction=transaction)
        if current.exists:
            data = current.to_dict()
            if data.get('check_in_time'):
                return False, f"You have already checked in today at {data.get('check_in_time')}."
            transaction.update(deterministic_ref, check_in_data)
            return True, None

        legacy_to_update = None
        for legacy_ref in legacy_refs:
            legacy = legacy_ref.get(transaction=transaction)
            if legacy.exists:
                data = legacy.to_dict()
                if data.get('check_in_time'):
                    return False, f"You have already checked in today at {data.get('check_in_time')}."
                if legacy_to_update is None:
                    legacy_to_update = legacy_ref

        if legacy_to_update is not None:
            transaction.update(legacy_to_update, check_in_data)
            return True, None

        transaction.create(deterministic_ref, check_in_data)
        return True, None

    return transition(transaction)


def save_teacher_check_out(
    name: str,
    date: str,
    time: str,
    lat: float,
    lng: float,
    distance: float,
    recognition_metadata: Optional[dict] = None,
):
    """Atomically transition a checked-in teacher/day into checked out."""
    db = get_firestore_db()
    deterministic_ref = db.collection('teacher_attendance').document(
        attendance_document_id(name, date, kind="teacher")
    )
    deterministic_snapshot = deterministic_ref.get()
    candidate_ref = deterministic_ref

    if not deterministic_snapshot.exists:
        legacy_snapshots = _legacy_teacher_attendance_refs(db, name, date)
        if legacy_snapshots:
            candidate_ref = legacy_snapshots[0].reference

    transaction = db.transaction()

    @firestore.transactional
    def transition(transaction):
        current = candidate_ref.get(transaction=transaction)
        if not current.exists:
            return False, "You must check in before checking out."

        data = current.to_dict()
        if not data.get('check_in_time'):
            return False, "You must check in before checking out."
        if data.get('check_out_time'):
            return False, f"You have already checked out today at {data.get('check_out_time')}."

        update_data = {
            'check_out_time': time,
            'check_out_lat': lat,
            'check_out_lng': lng,
            'check_out_distance_m': distance,
        }
        if recognition_metadata:
            update_data['check_out_recognition'] = recognition_metadata
        transaction.update(candidate_ref, update_data)
        return True, None

    return transition(transaction)

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


def update_student_metadata(name: str, photo_count: int, class_name: str = "", section: str = "", roll_number: str = ""):
    try:
        db = get_firestore_db()
        doc_data = {
            'name': name, 'photo_count': photo_count, 'last_updated': firestore.SERVER_TIMESTAMP,
        }
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
