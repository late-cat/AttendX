<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Firebase-Cloud-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase"/>
</p>

<h1 align="center">🎓 AttendX</h1>
<h3 align="center">Next-Generation AI-Powered Smart Attendance System</h3>

<p align="center">
  <em>No more roll calls. No more sign-in sheets. Just look at the camera.</em><br/><br/>
  A production-ready face recognition system that makes attendance<br/>
  <strong>instant, accurate, and completely effortless</strong>.
</p>

---

## 🌟 The AttendX Difference

AttendX isn't just an attendance logger; it's a comprehensive, intelligent ecosystem designed for modern educational institutions. Built with an uncompromising focus on speed, accuracy, and user experience.

### 🧠 State-of-the-Art AI Pipeline
- **ArcFace Model**: Industry-leading facial recognition achieving 99.5%+ accuracy on LFW benchmarks.
- **RetinaFace Detector**: Highly robust multi-face detection handling varying angles, lighting, and occlusions in a single frame.
- **Sub-Second Processing**: Embeddings are generated, cached (as `.npy` files), and evaluated using cosine distance for near-instant identification.

### 🏫 Complete Institutional Management
- **Smart Student Roster**: Granular attendance processing strictly filtered by Class and Section. Prevents accidental attendance logging for out-of-class students.
- **Teacher Geo-Fencing**: Dedicated Teacher Check-in and Check-out workflows with GPS location enforcement (requires teachers to be within school premises).
- **Dual Dashboard Logs**: Distinct, sortable logs separating Student attendance from Teacher timestamps.

### 🎨 Premium "Tactile Paper" Interface
- **Engraved Aesthetics**: The frontend features a stunning, bespoke "engraved paper" UI. Utilizing advanced CSS inset shadows, gradients, and custom SVG filters for a truly premium tactile feel.
- **Responsive & Dynamic**: Beautifully smooth animations, glassmorphism overlays, and interactive 3D buttons that respond to every interaction.
- **Intelligent Feedback**: Real-time sync banners, active system status LEDs, and clear visual indicators for detected/unrecognized faces.

---

## ✨ Features at a Glance

| Feature | Description |
|---------|-------------|
| 🔍 **Real-Time Recognition** | Identify faces via live webcam feed or batch photo upload. |
| 👥 **Multi-Face Detection** | Instantly recognize and process multiple students in one frame. |
| 📍 **GPS Teacher Check-In** | Geo-fenced teacher attendance (Check-in/Check-out functionality). |
| 🏫 **Class/Section Filtering** | Granular session selection preventing cross-class misidentification. |
| 📊 **Dynamic Dashboard** | Live stats, interactive charts, and real-time activity feeds. |
| 🗂️ **Exportable Logs** | Full historical attendance logs sortable by date and exportable to CSV. |
| ☁️ **Differential Cloud Sync** | Intelligent two-way Firebase sync pushing only new/modified data. |

---

## 🏗️ Architecture & Tech Stack

### Frontend (Next.js & React)
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS (Custom customized for tactile UI)
- **State Management**: React Hooks & Context API

### Backend (FastAPI & Python)
- **Framework**: FastAPI (Asynchronous, blazing fast)
- **AI/ML**: `deepface` library (ArcFace / RetinaFace backend)
- **Data Processing**: NumPy, OpenCV
- **Caching**: Local filesystem `.npy` caching for O(1) embedding lookups

### Database & Auth
- **Infrastructure**: Firebase (Cloud Firestore & Storage)
- **Authentication**: Firebase Auth (Google OAuth integration)

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Python 3.9+ & Node.js 18+
- A Firebase Project ([create one free](https://console.firebase.google.com))

### 1. Clone & Install

```bash
git clone https://github.com/late-cat/AttendX.git
cd AttendX

# Setup Backend Environment
cd hf-attendx-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Setup Frontend Environment
cd frontend
npm install
cd ..
```

### 2. Firebase Configuration

**Backend**: Save your Firebase Admin SDK service account key to:
```
hf-attendx-backend/config/serviceAccountKey.json
```

**Frontend**: Create a `.env.local` file in the `frontend/` directory:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run the System

**Terminal 1 (Backend):**
```bash
cd hf-attendx-backend
source venv/bin/activate
python app.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🔒 Security & Privacy

AttendX is built with a security-first mindset:
- **Zero Local Data Leakage**: Face embeddings are mathematically hashed arrays; raw biometric images can be easily decoupled from the database.
- **Path Traversal Protection**: Sanitized inputs and strictly validated file paths.
- **Environment Isolation**: No hardcoded secrets; API keys and Service Accounts are fully externalized.

---

## 🔮 Future Scalability
AttendX's modular architecture is designed to scale from a single classroom to an entire district. The database schema inherently supports partitioning by `School_ID`, enabling multi-tenant enterprise deployments without structural rewrites.

---
<p align="center">
  <br/>
  <b>AttendX — Redefining Smart Attendance</b><br/>
  <i>Built for Hackathon 2026</i>
</p>
