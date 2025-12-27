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
        tuple: (success: bool, message: str)
    """
    image_files = [f for f in os.listdir(images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    if not image_files:
        return False, "No images provided"
        
    person_embeddings = []
    skipped_files = []
    multi_face_files = []
    
    for image_file in image_files:
        image_path = os.path.join(images_dir, image_file)
        
        try:
            embedding_objs = DeepFace.represent(
                img_path=image_path,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True
            )
            
            if not embedding_objs:
                skipped_files.append(image_file)
            elif len(embedding_objs) > 1:
                # Multiple faces detected - skip this image
                multi_face_files.append(image_file)
            else:
                # Single face - use it
                embedding = embedding_objs[0]["embedding"]
                person_embeddings.append(embedding)
                
        except Exception as e:
            print(f"Warning: Could not process {image_file}. Error: {e}")
            skipped_files.append(image_file)
    
    # Check if any images had multiple faces
    if multi_face_files and not person_embeddings:
        return False, "Photos contain multiple faces. Please upload clean single-face photos."
    
    if person_embeddings:
        # Average embeddings
        avg_embedding = np.mean(person_embeddings, axis=0)
        
        # Save to .npy file
        if not os.path.exists(embeddings_dir):
            os.makedirs(embeddings_dir)
            
        save_path = os.path.join(embeddings_dir, f"{person_name}.npy")
        np.save(save_path, avg_embedding)
        
        # Build success message
        msg = f"Registered with {len(person_embeddings)} valid photo(s)"
        if multi_face_files:
            msg += f". Skipped {len(multi_face_files)} photo(s) with multiple faces"
        if skipped_files:
            msg += f". Skipped {len(skipped_files)} photo(s) with no face detected"
        
        return True, msg
    else:
        return False, "No valid faces found in any uploaded images. Please upload clear face photos."

