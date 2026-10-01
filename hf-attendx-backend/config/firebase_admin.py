
"""
Firebase Admin SDK Configuration
Only handles initialization and client retrieval.
"""

import firebase_admin
from firebase_admin import credentials, storage, firestore
import os
import json
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    return datetime.now(IST)

_bucket = None
_db = None

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    global _bucket, _db
    
    if _bucket is not None:
        return _bucket
    
    try:
        service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
        runtime_environment = os.environ.get(
            "APP_ENV", os.environ.get("ENVIRONMENT", "local")
        ).strip().lower()
        is_production = runtime_environment in {"production", "prod"} or bool(
            os.environ.get("SPACE_ID") or os.environ.get("HF_SPACE_ID")
        )
        
        if service_account_json:
            service_account_info = json.loads(service_account_json)
            cred = credentials.Certificate(service_account_info)
            logger.info("✅ Using Firebase credentials from environment")
        else:
            if is_production:
                raise RuntimeError(
                    "FIREBASE_SERVICE_ACCOUNT is required in production"
                )

            service_account_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
            if not os.path.exists(service_account_path):
                raise FileNotFoundError(
                    "No Firebase credentials found; set FIREBASE_SERVICE_ACCOUNT"
                )
            cred = credentials.Certificate(service_account_path)
            logger.info("✅ Using Firebase credentials from local file")
        
        FIREBASE_BUCKET = os.environ.get("FIREBASE_STORAGE_BUCKET", "attendx-572c8.firebasestorage.app")
        
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {'storageBucket': FIREBASE_BUCKET})
        
        _bucket = storage.bucket()
        _db = firestore.client()
        logger.info("✅ Firebase Admin SDK initialized")
        return _bucket
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Firebase: {e}")
        raise

def get_bucket():
    global _bucket
    if _bucket is None: initialize_firebase()
    return _bucket

def get_firestore_db():
    global _db
    if _db is None: initialize_firebase()
    return _db
