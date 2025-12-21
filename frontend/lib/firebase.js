
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// TODO: Replace with your Firebase Project Config
// You can get this from the Firebase Console -> Project Settings -> General -> "Your apps"
const firebaseConfig = {
  apiKey: "AIzaSyB_l_NGdhJ-Cw-_4e6ORRZb3OxP1R-Cca0",
  authDomain: "attendx-572c8.firebaseapp.com",
  projectId: "attendx-572c8",
  storageBucket: "attendx-572c8.firebasestorage.app",
  messagingSenderId: "996116501320",
  appId: "1:996116501320:web:fccef0c302011b102fd97d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
