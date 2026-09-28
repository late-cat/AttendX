import os
import numpy as np
from deepface import DeepFace

# Configuration
KNOWN_FACES_DIR = "../../data/known_faces"
EMBEDDINGS_DIR = "../../data/embeddings"
MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "retinaface"

def generate_embeddings():
    """
    Generates embeddings for each person in data/known_faces
    and saves them as .npy files in data/embeddings.
    """
    
    # Ensure directories exist
    if not os.path.exists(KNOWN_FACES_DIR):
        print(f"Error: {KNOWN_FACES_DIR} does not exist.")
        return

    if not os.path.exists(EMBEDDINGS_DIR):
        os.makedirs(EMBEDDINGS_DIR)

    # List all subfolders (each subfolder represents a person)
    persons = [p for p in os.listdir(KNOWN_FACES_DIR) if os.path.isdir(os.path.join(KNOWN_FACES_DIR, p))]

    if not persons:
        print(f"No subfolders found in {KNOWN_FACES_DIR}. Please add images first.")
        return

    print(f"Found {len(persons)} people to process.")

    for person_name in persons:
        person_dir = os.path.join(KNOWN_FACES_DIR, person_name)
        image_files = [f for f in os.listdir(person_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        if not image_files:
            continue
            
        print(f"Processing {person_name}...")
        
        person_embeddings = []
        
        for image_file in image_files:
            image_path = os.path.join(person_dir, image_file)
            
            try:
                # Generate embedding
                # DeepFace.represent returns a list of dictionaries (one for each face detected)
                # We assume 1 face per image for registration
                embedding_objs = DeepFace.represent(
                    img_path=image_path,
                    model_name=MODEL_NAME,
                    detector_backend=DETECTOR_BACKEND,
                    enforce_detection=True
                )
                
                # Take the first face found
                if embedding_objs:
                    embedding = embedding_objs[0]["embedding"]
                    person_embeddings.append(embedding)
                    
            except Exception as e:
                print(f"  Warning: Could not process {image_file}. Error: {e}")
        
        if person_embeddings:
            # Average embeddings for better robustness
            avg_embedding = np.mean(person_embeddings, axis=0)
            
            # Save to .npy file
            save_path = os.path.join(EMBEDDINGS_DIR, f"{person_name}.npy")
            np.save(save_path, avg_embedding)
            print(f"  Saved embedding for {person_name}")
        else:
            print(f"  No valid faces found for {person_name}")

    print("Embedding generation complete.")

if __name__ == "__main__":
    generate_embeddings()
