import os
import numpy as np
from deepface import DeepFace

# Configuration
MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "retinaface"

def generate_embeddings_for_person(person_name, images_dir, embeddings_dir):
    """
    Generate embedding for a single person from their images.
    
    Args:
        person_name: Name of the person
        images_dir: Directory containing their images
        embeddings_dir: Directory to save the embedding file
    
    Returns:
        bool: True if successful, False otherwise
    """
    image_files = [f for f in os.listdir(images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    if not image_files:
        return False
        
    person_embeddings = []
    
    for image_file in image_files:
        image_path = os.path.join(images_dir, image_file)
        
        try:
            embedding_objs = DeepFace.represent(
                img_path=image_path,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True
            )
            
            if embedding_objs:
                embedding = embedding_objs[0]["embedding"]
                person_embeddings.append(embedding)
                
        except Exception as e:
            print(f"Warning: Could not process {image_file}. Error: {e}")
    
    if person_embeddings:
        # Average embeddings
        avg_embedding = np.mean(person_embeddings, axis=0)
        
        # Save to .npy file
        if not os.path.exists(embeddings_dir):
            os.makedirs(embeddings_dir)
            
        save_path = os.path.join(embeddings_dir, f"{person_name}.npy")
        np.save(save_path, avg_embedding)
        return True
    else:
        return False
