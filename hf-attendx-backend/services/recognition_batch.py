"""Helpers for combining recognition results from classroom photos."""

import math
from typing import Any, Dict, Iterable, List, Tuple


RECOGNIZED_STATUSES = {"present", "marked", "detected"}


def _distance_value(value: Any) -> float:
    """Return a sortable distance, putting missing/invalid values last."""
    try:
        distance = float(value)
    except (TypeError, ValueError):
        return math.inf
    return distance if math.isfinite(distance) else math.inf


def _is_recognized(result: Dict[str, Any]) -> bool:
    name = result.get("name")
    return (
        result.get("status") in RECOGNIZED_STATUSES
        and isinstance(name, str)
        and bool(name.strip())
        and name.strip().lower() != "unknown"
    )


def _observation_metadata(image_index: int, filename: str, face_index: int) -> Dict[str, Any]:
    return {
        "image_index": image_index,
        "filename": filename,
        "face_index": face_index,
    }


def _new_aggregate(
    result: Dict[str, Any],
    image_index: int,
    filename: str,
    face_index: int,
) -> Dict[str, Any]:
    """Create the review record for the first observation of a student."""
    metadata = _observation_metadata(image_index, filename, face_index)
    quality = result.get("quality")
    aggregate = dict(result)
    aggregate.update(
        {
            "occurrences": 1,
            "image_indices": [image_index],
            "image_filenames": [filename],
            "best_image_index": image_index,
            "best_image_filename": filename,
            "best_distance": result.get("distance"),
            "quality_observations": [
                {**metadata, "quality": quality}
            ],
        }
    )
    return aggregate


def aggregate_recognition_results(
    image_results: Iterable[Tuple[int, str, List[Dict[str, Any]]]]
) -> Dict[str, Any]:
    """Aggregate recognized students while retaining non-match observations.

    ``image_results`` contains one-based image indexes, original filenames, and
    the list returned by ``recognize_face`` for that image. A student's review
    record is represented once and always uses the lowest available distance.
    Unknown/rejected faces stay as individual observations so the UI can show
    an accurate "needs review" count.
    """
    recognized: Dict[str, Dict[str, Any]] = {}
    non_matches: List[Dict[str, Any]] = []
    total_detections = 0
    quality_rejected_count = 0

    for image_index, filename, results in image_results:
        for face_index, raw_result in enumerate(results or []):
            if not isinstance(raw_result, dict):
                continue

            total_detections += 1
            metadata = _observation_metadata(image_index, filename, face_index)
            if raw_result.get("status") == "rejected":
                quality_rejected_count += 1

            if not _is_recognized(raw_result):
                non_matches.append({**raw_result, **metadata})
                continue

            name = raw_result["name"]
            aggregate = recognized.get(name)
            if aggregate is None:
                recognized[name] = _new_aggregate(
                    raw_result, image_index, filename, face_index
                )
                continue

            aggregate["occurrences"] += 1
            aggregate["image_indices"].append(image_index)
            aggregate["image_filenames"].append(filename)
            aggregate["quality_observations"].append(
                {**metadata, "quality": raw_result.get("quality")}
            )

            if _distance_value(raw_result.get("distance")) < _distance_value(
                aggregate.get("distance")
            ):
                # Keep the best recognition's distance, status, message,
                # matches, and quality fields as the canonical UI result.
                best_fields = dict(raw_result)
                aggregate.update(best_fields)
                aggregate.update(
                    {
                        "occurrences": aggregate["occurrences"],
                        "image_indices": aggregate["image_indices"],
                        "image_filenames": aggregate["image_filenames"],
                        "quality_observations": aggregate["quality_observations"],
                        "best_image_index": image_index,
                        "best_image_filename": filename,
                        "best_distance": raw_result.get("distance"),
                    }
                )

    recognized_faces = list(recognized.values())
    return {
        "details": recognized_faces + non_matches,
        "recognized_faces": recognized_faces,
        "unrecognized_faces": non_matches,
        "detected_count": total_detections,
        "recognized_count": len(recognized_faces),
        "unrecognized_count": len(non_matches),
        "quality_rejected_count": quality_rejected_count,
    }
