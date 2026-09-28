import sys
import os

# Add the backend directory to python path so we can import from core/config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.firebase_admin import get_firestore_db

def migrate_students():
    db = get_firestore_db()
    students_ref = db.collection('students')
    docs = students_ref.stream()

    migrated_count = 0
    for doc in docs:
        data = doc.to_dict()
        
        # Check if they are missing class_name or section
        needs_update = False
        updates = {}
        
        if 'class_name' not in data or not data['class_name']:
            updates['class_name'] = "5"
            needs_update = True
        
        if 'section' not in data or not data['section']:
            updates['section'] = "A"
            needs_update = True
            
        if needs_update:
            print(f"Updating {data.get('name', doc.id)}...")
            students_ref.document(doc.id).update(updates)
            migrated_count += 1
            
    print(f"Successfully migrated {migrated_count} old student records to Class 5, Section A.")

if __name__ == "__main__":
    migrate_students()
