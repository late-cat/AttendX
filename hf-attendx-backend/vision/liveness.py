"""Responsive blink liveness with face/eye tracking metadata.

MediaPipe Face Mesh is the primary detector because eyelid landmarks allow a
real eye-aspect-ratio (EAR) blink signal. A RetinaFace/texture fallback keeps
local development usable when the optional mesh package is not installed.
"""

import math
import threading
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from deepface import DeepFace

try:  # Optional accelerator when a compatible Face Mesh distribution is present.
    import mediapipe as mp
except ImportError:  # pragma: no cover - exercised only on minimal installs
    mp = None


MODEL_NAME = "ArcFace"
DETECTOR_BACKEND = "retinaface"

LEFT_EYE = (33, 160, 158, 133, 153, 144)
RIGHT_EYE = (362, 385, 387, 263, 373, 380)
_mesh = None
_mesh_lock = threading.Lock()


def _point(value: Any) -> Optional[Tuple[float, float]]:
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        try:
            return float(value[0]), float(value[1])
        except (TypeError, ValueError):
            return None
    return None


def _get_mesh():
    global _mesh
    if mp is None or not hasattr(mp, "solutions"):
        return None
    if _mesh is None:
        _mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.45,
            min_tracking_confidence=0.45,
        )
    return _mesh


def _distance(first: Tuple[float, float], second: Tuple[float, float]) -> float:
    return math.hypot(first[0] - second[0], first[1] - second[1])


def _ear(points: List[Tuple[float, float]]) -> float:
    horizontal = _distance(points[0], points[3])
    if horizontal <= 0:
        return 0.0
    return (_distance(points[1], points[5]) + _distance(points[2], points[4])) / (2 * horizontal)


def _eye_texture_score(gray: np.ndarray, center: Tuple[float, float], eye_distance: float) -> float:
    radius_x = max(3, int(eye_distance * 0.30))
    radius_y = max(2, int(eye_distance * 0.16))
    cx, cy = int(center[0]), int(center[1])
    x1, x2 = max(0, cx - radius_x), min(gray.shape[1], cx + radius_x)
    y1, y2 = max(0, cy - radius_y), min(gray.shape[0], cy + radius_y)
    patch = gray[y1:y2, x1:x2]
    if patch.size == 0:
        return 0.0
    patch = cv2.equalizeHist(patch)
    laplacian = float(cv2.Laplacian(patch, cv2.CV_64F).var())
    vertical_edges = cv2.Sobel(patch, cv2.CV_64F, 0, 1, ksize=3)
    return laplacian + float(np.mean(np.abs(vertical_edges)))


def _mesh_frame_state(image: np.ndarray) -> Optional[Dict[str, Any]]:
    mesh = _get_mesh()
    if mesh is None:
        return None

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    with _mesh_lock:
        result = mesh.process(rgb)
    if not result.multi_face_landmarks:
        return {
            "face_detected": False,
            "eyes_visible": False,
            "ear": None,
            "face_box": None,
            "eye_points": [],
        }

    landmarks = result.multi_face_landmarks[0].landmark

    def xy(index: int) -> Tuple[float, float]:
        return float(landmarks[index].x), float(landmarks[index].y)

    left = [xy(index) for index in LEFT_EYE]
    right = [xy(index) for index in RIGHT_EYE]
    selected = left + right
    eyes_visible = all(
        0.0 <= x <= 1.0 and 0.0 <= y <= 1.0
        for x, y in selected
    )
    ear = (_ear(left) + _ear(right)) / 2 if eyes_visible else None
    all_points = [(float(point.x), float(point.y)) for point in landmarks]
    min_x = max(0.0, min(point[0] for point in all_points))
    max_x = min(1.0, max(point[0] for point in all_points))
    min_y = max(0.0, min(point[1] for point in all_points))
    max_y = min(1.0, max(point[1] for point in all_points))
    return {
        "face_detected": True,
        "eyes_visible": eyes_visible,
        "ear": round(float(ear), 4) if ear is not None else None,
        "face_box": {"x": min_x, "y": min_y, "w": max_x - min_x, "h": max_y - min_y},
        "eye_points": [
            {"x": round(sum(point[0] for point in left) / len(left), 4), "y": round(sum(point[1] for point in left) / len(left), 4)},
            {"x": round(sum(point[0] for point in right) / len(right), 4), "y": round(sum(point[1] for point in right) / len(right), 4)},
        ],
    }


def _fallback_frame_state(image_path: str, image: np.ndarray) -> Dict[str, Any]:
    """Fallback eye-appearance signal when MediaPipe is unavailable."""
    faces = DeepFace.represent(
        img_path=image_path,
        model_name=MODEL_NAME,
        detector_backend=DETECTOR_BACKEND,
        enforce_detection=True,
    )
    if len(faces) != 1:
        return {"face_detected": False, "eyes_visible": False, "ear": None, "face_box": None, "eye_points": []}
    area = faces[0].get("facial_area") or {}
    left = _point(area.get("left_eye"))
    right = _point(area.get("right_eye"))
    if not left or not right:
        return {"face_detected": True, "eyes_visible": False, "ear": None, "face_box": None, "eye_points": []}
    height, width = image.shape[:2]
    eye_distance = _distance(left, right)
    x, y, w, h = (float(area.get(key, 0)) for key in ("x", "y", "w", "h"))
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    score = (_eye_texture_score(gray, left, eye_distance) + _eye_texture_score(gray, right, eye_distance)) / 2
    return {
        "face_detected": True,
        "eyes_visible": True,
        "ear": round(score, 4),
        "face_box": {"x": x / width, "y": y / height, "w": w / width, "h": h / height},
        "eye_points": [{"x": left[0] / width, "y": left[1] / height}, {"x": right[0] / width, "y": right[1] / height}],
    }


def _frame_state(image_path: str) -> Dict[str, Any]:
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Invalid liveness frame")
    mesh_state = _mesh_frame_state(image)
    return mesh_state if mesh_state is not None else _fallback_frame_state(image_path, image)


def assess_blink(image_paths: List[str]) -> Dict[str, Any]:
    """Detect a natural open -> closed -> open transition."""
    if len(image_paths) < 3:
        return {
            "passed": False,
            "blink_detected": False,
            "state": "waiting_blink",
            "reason": "At least three liveness frames are required",
            "frames": len(image_paths),
        }

    try:
        states = [_frame_state(path) for path in image_paths]
    except Exception as exc:
        return {
            "passed": False,
            "blink_detected": False,
            "state": "tracking_error",
            "reason": str(exc),
            "frames": len(image_paths),
        }

    latest = states[-1]
    face_states = [state for state in states if state.get("face_detected")]
    if not face_states:
        return {
            "passed": False,
            "blink_detected": False,
            "state": "align_face",
            "reason": "Please align your face",
            "frames": len(image_paths),
            "face_detected": False,
        }
    if not latest.get("face_detected"):
        return {
            "passed": False,
            "blink_detected": False,
            "state": "align_face",
            "reason": "Please align your face",
            "frames": len(image_paths),
            **latest,
        }
    if not latest.get("eyes_visible"):
        return {
            "passed": False,
            "blink_detected": False,
            "state": "eyes_not_visible",
            "reason": "Make sure your eyes are visible",
            "frames": len(image_paths),
            **latest,
        }

    scores = [state.get("ear") for state in states if state.get("eyes_visible") and state.get("ear") is not None]
    baseline = max(scores) if scores else 0.0
    closed_threshold = max(0.105, min(0.22, baseline * 0.72)) if baseline else 0.0
    open_flags = [state.get("ear") is not None and state["ear"] > closed_threshold for state in states]
    closed_flags = [state.get("ear") is not None and state["ear"] <= closed_threshold for state in states]

    blink_index = None
    for index in range(1, len(states) - 1):
        if closed_flags[index] and any(open_flags[:index]) and any(open_flags[index + 1:]):
            blink_index = index
            break

    blink_detected = blink_index is not None
    waiting_state = "ready_to_blink" if len(scores) < 8 else "waiting_blink"
    return {
        "passed": blink_detected,
        "blink_detected": blink_detected,
        "state": "blink_detected" if blink_detected else waiting_state,
        "reason": "Blink detected" if blink_detected else ("Blink to verify" if waiting_state == "ready_to_blink" else "Waiting for a natural blink..."),
        "frames": len(image_paths),
        "ear_scores": [round(float(score), 4) for score in scores],
        "closed_threshold": round(float(closed_threshold), 4),
        "blink_frame": blink_index,
        **latest,
    }


def assess_head_movement(image_paths: List[str]) -> Dict[str, Any]:
    """Compatibility alias for older callers."""
    return assess_blink(image_paths)
