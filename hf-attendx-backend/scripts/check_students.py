import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.firebase_admin import get_firestore_db

db = get_firestore_db()
for doc in db.collection('students').stream():
    print(f"ID: {doc.id} => {doc.to_dict()}")
