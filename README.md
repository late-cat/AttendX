<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/DeepFace-AI-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="DeepFace"/>
  <img src="https://img.shields.io/badge/Firebase-Cloud-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase"/>
</p>

<h1 align="center">🎓 AttendX</h1>
<h3 align="center">AI-Powered Smart Attendance System</h3>

<p align="center">
  <em>No more roll calls. No more sign-in sheets. Just look at the camera.</em><br/><br/>
  A production-ready face recognition system that makes attendance<br/>
  <strong>instant, accurate, and effortless</strong>.
</p>

---

## 🧠 What Makes It Smart?

### 🎯 State-of-the-Art AI Pipeline
- **ArcFace Model** - Industry-leading face recognition with 99.5%+ accuracy on LFW benchmark
- **RetinaFace Detector** - Robust face detection that works with angles, lighting, and partial occlusion
- **Cosine Distance Matching** - Precise similarity scoring for reliable identification

### ⚡ Heavily Optimized for Speed
- **Embedding Cache** - Pre-computed face embeddings stored as `.npy` files = instant matching
- **Smart Reload** - Embeddings cached in memory, reloaded only when students are added/removed
- **Lazy Loading** - AI models initialized once at startup, not per-request
- **Minimal Overhead** - Recognition completes in <500ms on average hardware

### ☁️ Intelligent Cloud Sync
- **Differential Sync** - Only uploads what's changed (new students, modified photos)
- **Auto-Detection** - Detects added, deleted, or modified students automatically
- **Bidirectional** - Local is source of truth, Firebase stays perfectly in sync
- **Zero Redundancy** - Unchanged data is skipped, saving bandwidth and time

### 🔒 Production-Grade Security
- **Path Traversal Protection** - Sanitized inputs prevent directory attacks
- **CORS Configured** - Proper origin whitelisting for secure cross-origin requests
- **Environment Variables** - No hardcoded secrets, all configs externalized
- **Firebase Auth** - Secure Google OAuth, no custom auth vulnerabilities

---

## ✨ Features at a Glance

| Feature | Description |
|---------|-------------|
| 🔍 **Real-time Recognition** | Identify faces via webcam or photo upload |
| 👥 **Multi-face Detection** | Recognize multiple students in one frame |
| 📱 **Fully Responsive** | Works beautifully on desktop, tablet, mobile |
| 🔐 **One-click Login** | Google Sign-In via Firebase Auth |
| 📊 **Smart Dashboard** | Stats, logs, student management in one place |
| 🗂️ **Attendance History** | Full logs with date/time, sortable & exportable |
| ➕ **Easy Registration** | Just enter name + upload 3-5 photos |
| 🗑️ **Clean Deletion** | Remove students from local + cloud in one click |

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Python 3.9+ & Node.js 18+
- Firebase Project ([create one free](https://console.firebase.google.com))

### 1. Clone & Install

```bash
git clone https://github.com/late-cat/AttendX.git
cd AttendX

# Backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend && npm install && cd ..
```

### 2. Firebase Setup

**Backend** - Save your service account key to:
```
backend/config/serviceAccountKey.json
```

**Frontend** - Create `frontend/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run!

**Terminal 1:**
```bash
source .venv/bin/activate && python backend/app.py
```

**Terminal 2:**
```bash
cd frontend && npm run dev
```

🎉 **Open [localhost:3000](http://localhost:3000)**

---

## 🎪 Demo Mode (ngrok)

Share your local app with judges/classmates instantly:

```bash

```ngrok http 3000 --domain=unflowering-unexplicitly-scarlet.ngrok-free.dev

> 💡 Add your ngrok domain to Firebase → Authentication → Authorized domains
```bash
source .venv/bin/activate

pkill -f "next dev"
npm run dev
```
---

## 📁 Project Structure

```
AttendX/
├── backend/
│   ├── app.py              # FastAPI server (10+ endpoints)
│   ├── vision/
│   │   ├── recognizer.py   # Face matching + attendance logic
│   │   └── embedding_utils.py  # Embedding generation
│   └── scripts/
│       └── sync_to_firebase.py  # Smart cloud sync
├── frontend/               # Next.js 15 + React 19 dashboard
├── data/
│   ├── known_faces/        # Student photos (organized by name)
│   ├── embeddings/         # Pre-computed face vectors (.npy)
│   └── attendance.csv      # Local attendance records
└── requirements.txt
```

---

## 🔧 Commands

| Command | What it does |
|---------|--------------|
| `python backend/app.py` | Start backend API (port 8000) |
| `cd frontend && npm run dev` | Start dashboard (port 3000) |
| `python backend/scripts/sync_to_firebase.py` | Sync local → cloud |

---

## 📱 Usage Flow

```
1. 🔐 Login → Google Sign-In
2. 👤 Register → Add student name + 3-5 face photos
3. 📸 Capture → Webcam or upload photo
4. ✅ Done → Attendance marked automatically!
```

---

## ⚙️ Fine-Tuning

Adjust recognition strictness in `backend/vision/recognizer.py`:
```python
THRESHOLD = 0.50  # Lower = stricter matching
                  # 0.40 = very strict (may miss some)
                  # 0.50 = balanced (recommended)
                  # 0.60 = lenient (may have false positives)
```

---

## �️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4 |
| **Backend** | Python, FastAPI, Uvicorn |
| **AI** | DeepFace, TensorFlow 2.15, OpenCV |
| **Cloud** | Firebase Auth + Storage |

---

## 🙏 Built With

- [DeepFace](https://github.com/serengil/deepface) - Face recognition library
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python API
- [Next.js](https://nextjs.org/) - React framework
- [Firebase](https://firebase.google.com/) - Auth & cloud storage

---

<p align="center">
  <strong>🏆 Made with ❤️ for Hackathons</strong><br/>
  <sub>Production-ready • Optimized • Intelligent</sub><br/><br/>
  <sub>MIT License</sub>
</p>
