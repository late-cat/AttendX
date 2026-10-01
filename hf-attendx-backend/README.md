---
title: AttendX Backend
emoji: 🎯
colorFrom: purple
colorTo: blue
sdk: docker
pinned: false
license: mit
---

# AttendX Backend - Face Recognition Attendance API

A FastAPI backend for face recognition-based attendance system powered by DeepFace and ArcFace.

## Features

- 🔍 Face recognition using ArcFace model
- 📸 Student registration with multiple photos
- ✅ Automatic attendance marking
- ☁️ Firebase Storage integration for cloud backup
- 🚀 Fast inference with embedding caching

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/system/status` | GET | System status |
| `/stats` | GET | Student statistics |
| `/recognize` | POST | Recognize one face image and optionally mark attendance |
| `/recognize/batch` | POST | Recognize 2-3 classroom images and aggregate unique students for review |
| `/register-student` | POST | Register new student |
| `/students` | GET | List all students |
| `/attendance/today` | GET | Today's attendance |
| `/attendance/logs` | GET | All attendance logs |

## Environment Variables

Set these in HF Space Settings → Variables and Secrets:

- `FIREBASE_STORAGE_BUCKET` - Your Firebase Storage bucket name
- `FIREBASE_SERVICE_ACCOUNT` - Firebase Admin service-account JSON (required in production)
- `APP_ENV` - Set to `local` for local development; production deployments do not use the local key fallback
- `SCHOOL_LAT`, `SCHOOL_LNG`, `ALLOWED_RADIUS_METERS` - Institution geofence configuration
- `FACE_MATCH_THRESHOLD` - ArcFace cosine-distance threshold; calibrate with labeled institutional samples
- `MIN_FACE_SIZE`, `MIN_FACE_BLUR_SCORE`, `MIN_FACE_BRIGHTNESS`, `MAX_FACE_BRIGHTNESS` - Advisory classroom face-quality thresholds
- `ENFORCE_FACE_QUALITY` - Optional strict mode; keep `false` for group/classroom photos

## Firebase Setup

1. Create a Firebase project
2. Generate a service account key
3. Add the service-account JSON as the `FIREBASE_SERVICE_ACCOUNT` secret in HF Space Settings

For local development only, the key may be saved as `config/serviceAccountKey.json`.

Teacher check-in/out uses a hybrid blink-to-verify liveness challenge. The
browser passively probes short webcam sequences and automatically submits after
an open/closed/open blink transition. A manual capture button is also
available; it locks a reference frame and then waits for the same blink before
submitting. The final check-in/out request repeats liveness and verifies the
teacher face and GPS together.

Blink detection uses adaptive temporal eye-region signals and, when a
compatible MediaPipe Face Mesh installation is available, eye-aspect-ratio
landmarks. The backend falls back safely to the RetinaFace eye-region signal
without making MediaPipe a mandatory deployment dependency.

## Built With

- FastAPI + Uvicorn
- DeepFace + ArcFace
- TensorFlow
- Firebase Admin SDK
