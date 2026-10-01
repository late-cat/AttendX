"""Lightweight, explainable face-quality checks for recognition inputs."""

import math
from typing import Any, Dict

import cv2
import numpy as np

from core.config import settings


def _point(value: Any):
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        try:
            return float(value[0]), float(value[1])
        except (TypeError, ValueError):
            return None
    return None


def _finalize_quality(metrics: Dict[str, Any]) -> Dict[str, Any]:
    warnings = metrics.get("warnings", [])
    metrics["warnings"] = warnings
    if settings.ENFORCE_FACE_QUALITY and warnings:
        metrics.update({
            "passed": False,
            "usable_for_matching": False,
            "reason": warnings[0],
        })
    return metrics


def assess_face_quality(image_path: str, face_obj: Dict[str, Any]) -> Dict[str, Any]:
    """Return quality metrics without rejecting normal classroom faces.

    RetinaFace supplies landmarks in ``facial_area``. The checks intentionally
    remain deterministic and explainable. Classroom images commonly contain
    small, slightly blurred, angled, or unevenly lit faces, so these signals
    are warnings by default. Hard rejection is limited to an unreadable image
    or an invalid/empty detected crop. Strict gating is opt-in through
    ``ENFORCE_FACE_QUALITY=true``.
    """
    image = cv2.imread(image_path)
    area = face_obj.get("facial_area") or {}
    if image is None or not all(key in area for key in ("x", "y", "w", "h")):
        return {"passed": False, "reason": "Face landmarks were unavailable"}

    height, width = image.shape[:2]
    x = max(0, int(area.get("x", 0)))
    y = max(0, int(area.get("y", 0)))
    w = int(area.get("w", 0))
    h = int(area.get("h", 0))
    x2 = min(width, x + max(0, w))
    y2 = min(height, y + max(0, h))
    crop = image[y:y2, x:x2]

    metrics: Dict[str, Any] = {
        "passed": True,
        "usable_for_matching": True,
        "warnings": [],
        "face_width": w,
        "face_height": h,
        "image_width": width,
        "image_height": height,
    }

    if crop.size == 0 or w <= 0 or h <= 0:
        metrics.update({"passed": False, "reason": "Face is too small"})
        return metrics

    warnings = metrics["warnings"]
    if min(w, h) < settings.MIN_FACE_SIZE:
        warnings.append("Face is small; recognition confidence may be lower")

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    metrics.update({
        "blur_score": round(blur_score, 2),
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
    })

    if blur_score < settings.MIN_FACE_BLUR_SCORE:
        warnings.append("Face is slightly blurry")
    if brightness < settings.MIN_FACE_BRIGHTNESS or brightness > settings.MAX_FACE_BRIGHTNESS:
        warnings.append("Lighting is outside the preferred range")

    # Missing landmarks are reported as a warning. RetinaFace can still produce
    # a useful embedding for a partially occluded or distant face.
    left_eye = _point(area.get("left_eye"))
    right_eye = _point(area.get("right_eye"))
    nose = _point(area.get("nose"))
    if not left_eye or not right_eye or not nose:
        warnings.append("Some facial landmarks were unavailable")
        return _finalize_quality(metrics)

    eye_dx = right_eye[0] - left_eye[0]
    eye_dy = right_eye[1] - left_eye[1]
    eye_distance = math.hypot(eye_dx, eye_dy)
    if eye_distance <= 0:
        warnings.append("Eye landmarks were invalid")
        return _finalize_quality(metrics)

    roll = abs(math.degrees(math.atan2(eye_dy, eye_dx)))
    eye_mid_x = (left_eye[0] + right_eye[0]) / 2
    nose_offset = abs(nose[0] - eye_mid_x) / eye_distance
    metrics.update({
        "roll_degrees": round(roll, 2),
        "nose_offset": round(nose_offset, 3),
    })

    if roll > settings.MAX_FACE_ROLL_DEGREES:
        warnings.append("Head angle is outside the preferred range")
    if nose_offset > settings.MAX_FACE_NOSE_OFFSET:
        warnings.append("Face angle is outside the preferred range")

    return _finalize_quality(metrics)
