# 🎓 AttendX - AI-Powered Smart Attendance System

A modern **Face Recognition Attendance System** that uses AI to detect and identify faces in real-time. Built with **Next.js** frontend, **FastAPI** backend, and **DeepFace** AI engine.

![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15-orange?logo=tensorflow)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- **🔍 Real-time Face Recognition** - Identify registered students instantly via webcam or photo upload
- **📱 Mobile Responsive** - Works seamlessly on desktop, tablet, and mobile devices
- **🔐 Google Sign-In** - Secure authentication via Firebase
- **☁️ Cloud Sync** - Student data and embeddings stored in Firebase Storage
- **📊 Dashboard** - View attendance stats, logs, and manage students
- **⚡ Fast & Accurate** - Uses ArcFace model for 99%+ accuracy

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 15, React, Tailwind CSS |
| **Backend** | Python, FastAPI, Uvicorn |
| **AI Engine** | DeepFace (ArcFace + RetinaFace) |
| **Database** | Firebase (Auth, Storage) + Local CSV |
| **Deployment** | Local + ngrok for demos |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Firebase project (for auth & storage)

### 1. Clone the Repository

```bash
git clone https://github.com/late-cat/AttendX.git
cd AttendX
```

### 2. Setup Backend

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Setup Frontend

```bash
cd frontend
npm install
```

### 4. Configure Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Google Sign-In) and **Storage**
3. Download your service account key and save it to:
   ```
   backend/config/serviceAccountKey.json
   ```
4. Create `frontend/.env.local` with your Firebase config:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

---

## 🖥️ Running Locally

Open **3 terminal tabs**:

### Terminal 1: Backend
```bash
cd AttendX
source .venv/bin/activate
python backend/app.py
```
✅ Should see: `Uvicorn running on http://0.0.0.0:8000`

### Terminal 2: Frontend
```bash
cd AttendX/frontend
npm run dev
```
✅ Should see: `Ready in ... ms`

### Terminal 3: ngrok (Optional - for public access)
```bash
ngrok http 3000 --domain=your-domain.ngrok-free.dev
```

### 🌐 Access the App
- **Local**: http://localhost:3000
- **Public (via ngrok)**: https://your-domain.ngrok-free.dev

---

## 📁 Project Structure

```
AttendX/
├── backend/
│   ├── app.py                 # FastAPI server
│   ├── config/
│   │   ├── firebase_admin.py  # Firebase utilities
│   │   └── serviceAccountKey.json  # (gitignored)
│   ├── vision/
│   │   ├── recognizer.py      # Face recognition logic
│   │   └── embedding_utils.py # Embedding generation
│   └── temp_uploads/          # Temporary file storage
│
├── frontend/
│   ├── app/
│   │   ├── page.js            # Main dashboard
│   │   ├── login/page.js      # Login page
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── AuthContext.js     # Auth provider
│   │   └── WebcamCapture.js   # Camera component
│   └── lib/
│       ├── api.js             # API configuration
│       └── firebase.js        # Firebase client config
│
├── data/
│   ├── known_faces/           # Registered student photos
│   ├── embeddings/            # Face embeddings (.npy files)
│   └── attendance.csv         # Attendance records
│
├── requirements.txt           # Python dependencies
├── README.md                  # This file
└── .gitignore
```

---

## 📱 Usage

### 1. Sign In
Open the app and sign in with your Google account.

### 2. Register Students
Go to **Student Mgmt** tab → Enter student name → Upload 3-5 photos → Click "Register"

### 3. Mark Attendance
- **Upload Photo**: Take a photo and upload it
- **Live Camera**: Use webcam for real-time recognition

### 4. View Attendance
- **Today's Attendance**: See who's present today
- **Attendance Logs**: View full history with export to CSV

---

## 🔧 Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client configuration |
| `NEXT_PUBLIC_API_URL` | Backend API URL (optional, defaults to localhost:8000) |

### Recognition Threshold

The face matching threshold can be adjusted in `backend/vision/recognizer.py`:
```python
THRESHOLD = 0.50  # Lower = stricter matching
```

---

## 🎪 Demo with ngrok

For hackathon demos or sharing with others:

1. **Get a free static domain** at [dashboard.ngrok.com/domains](https://dashboard.ngrok.com/domains)

2. **Add your authtoken**:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

3. **Add domain to Firebase** (one-time):
   - Firebase Console → Authentication → Settings → Authorized domains
   - Add: `your-domain.ngrok-free.dev`

4. **Run ngrok**:
   ```bash
   ngrok http 3000 --domain=your-domain.ngrok-free.dev
   ```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [DeepFace](https://github.com/serengil/deepface) - Face recognition library
- [Firebase](https://firebase.google.com/) - Backend services
- [Next.js](https://nextjs.org/) - React framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python API framework

---

<p align="center">
  Made with ❤️ for Hackathons
</p>
