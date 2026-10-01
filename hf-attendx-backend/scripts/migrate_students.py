import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.firebase_admin import get_firestore_db, initialize_firebase

def migrate_students():
    """Fix all students with empty class_name/section in Firebase."""
    initialize_firebase()
    db = get_firestore_db()
    students_ref = db.collection('students')
    docs = list(students_ref.stream())

    print(f"Found {len(docs)} student documents in Firebase.")
    
    migrated_count = 0
    already_ok = 0
    
    for doc in docs:
        data = doc.to_dict()
        name = data.get('name', doc.id)
        
        needs_update = False
        updates = {}
        
        current_class = data.get('class_name', '')
        current_section = data.get('section', '')
        current_roll = data.get('roll_number', '')
        
        if not current_class or current_class.strip() == '':
            updates['class_name'] = "5"
            needs_update = True
        
        if not current_section or current_section.strip() == '':
            updates['section'] = "A"
            needs_update = True
            
        if needs_update:
            print(f"  FIXING: {name} (class='{current_class}', section='{current_section}') -> class='5', section='A'")
            students_ref.document(doc.id).update(updates)
            migrated_count += 1
        else:
            print(f"  OK: {name} (class='{current_class}', section='{current_section}')")
            already_ok += 1
            
    print(f"\n{'='*50}")
    print(f"MIGRATION COMPLETE:")
    print(f"  Fixed: {migrated_count} students")
    print(f"  Already OK: {already_ok} students")
    print(f"  Total: {len(docs)} students")
    print(f"{'='*50}")

if __name__ == "__main__":
    migrate_students()
