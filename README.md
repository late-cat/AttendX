# AttendX - AI Smart Attendance System

A modern Face Recognition Attendance System built with **Next.js** (Frontend) and **FastAPI** (Backend).

## 🚀 Quick Start

You need **two terminal tabs** open to run the system.

### Terminal 1: Backend (Python API)
This handles the AI face recognition.
```bash
# Activate your environment (if not already active)
source .venv/bin/activate

# Start the server
python backend/app.py
```
*You should see: `Uvicorn running on http://0.0.0.0:8000`*

### Terminal 2: Frontend (Next.js Dashboard)
This runs the User Interface.
```bash
cd frontend
npm run dev
```
*You should see: `Ready in ... ms`*

## 📱 Usage
1.  Open your browser to: **[http://localhost:3000](http://localhost:3000)**
2.  Click **"Upload Photo"** or **"Start Live Camera"**.
3.  The system will instantly analyze the face and record attendance if it matches a known student.

## 🛠️ Tech Stack
-   **Frontend**: Next.js 14, React, Tailwind CSS
-   **Backend**: Python, FastAPI, Uvicorn
-   **AI Engine**: DeepFace (ArcFace Model) + RetinaFace
-   **Database**: Local CSV (`attendance.csv`) + Firebase Integration
