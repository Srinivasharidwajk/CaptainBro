import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBSBWFpsOxdnZEPU0Xxw575IiLZLXUHm1E",
  authDomain: "captain-bro-app.firebaseapp.com",
  projectId: "captain-bro-app",
  storageBucket: "captain-bro-app.firebasestorage.app",
  messagingSenderId: "1097889464780",
  appId: "1:1097889464780:android:0aebf07dca2b21e0c8dd69",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
