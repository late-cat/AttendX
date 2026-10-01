"""Helpers for safely replacing a person's local registration."""

import os
import shutil
import uuid


def create_registration_staging(
    faces_root: str, embeddings_root: str, person_name: str
) -> tuple[str, str, str]:
    """Create versioned staging paths on the same filesystems as active data."""
    version = uuid.uuid4().hex
    faces_dir = os.path.join(faces_root, f".{person_name}.staging-{version}")
    embeddings_dir = os.path.join(
        embeddings_root, f".{person_name}.staging-{version}"
    )
    os.makedirs(faces_dir)
    os.makedirs(embeddings_dir)
    return version, faces_dir, embeddings_dir


def _remove_path(path: str) -> None:
    if os.path.isdir(path) and not os.path.islink(path):
        shutil.rmtree(path)
    elif os.path.exists(path):
        os.remove(path)


def activate_registration(
    staging_faces_dir: str,
    staging_embedding_path: str,
    active_faces_dir: str,
    active_embedding_path: str,
) -> None:
    """Atomically promote staged face files and embedding, with rollback."""
    backup_faces_dir = f"{active_faces_dir}.backup-{uuid.uuid4().hex}"
    backup_embedding_path = f"{active_embedding_path}.backup-{uuid.uuid4().hex}"
    backed_up_faces = False
    backed_up_embedding = False
    promoted_faces = False
    promoted_embedding = False

    try:
        if os.path.exists(active_faces_dir):
            os.replace(active_faces_dir, backup_faces_dir)
            backed_up_faces = True
        if os.path.exists(active_embedding_path):
            os.replace(active_embedding_path, backup_embedding_path)
            backed_up_embedding = True

        os.replace(staging_faces_dir, active_faces_dir)
        promoted_faces = True
        os.replace(staging_embedding_path, active_embedding_path)
        promoted_embedding = True
    except Exception:
        if promoted_faces:
            _remove_path(active_faces_dir)
        if promoted_embedding:
            _remove_path(active_embedding_path)
        if backed_up_faces:
            os.replace(backup_faces_dir, active_faces_dir)
        if backed_up_embedding:
            os.replace(backup_embedding_path, active_embedding_path)
        raise
    finally:
        if os.path.exists(backup_faces_dir):
            _remove_path(backup_faces_dir)
        if os.path.exists(backup_embedding_path):
            _remove_path(backup_embedding_path)


def cleanup_registration_staging(*paths: str) -> None:
    """Remove any unpromoted staging paths."""
    for path in paths:
        if os.path.exists(path):
            _remove_path(path)
