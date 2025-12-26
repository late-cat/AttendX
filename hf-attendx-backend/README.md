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
| `/recognize` | POST | Recognize face and mark attendance |
| `/register-student` | POST | Register new student |
| `/students` | GET | List all students |
| `/attendance/today` | GET | Today's attendance |
| `/attendance/logs` | GET | All attendance logs |

## Environment Variables

Set these in HF Space Settings → Variables and Secrets:

- `FIREBASE_STORAGE_BUCKET` - Your Firebase Storage bucket name

## Firebase Setup

1. Create a Firebase project
2. Generate a service account key
3. Add the key as a secret file in HF Space Settings

## Built With

- FastAPI + Uvicorn
- DeepFace + ArcFace
- TensorFlow
- Firebase Admin SDK
