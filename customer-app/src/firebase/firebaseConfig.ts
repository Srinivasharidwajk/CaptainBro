import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBSBWFpsOxdnZEPU0Xxw575IiLZLXUHm1E",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "captain-bro-app.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "captain-bro-app",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "captain-bro-app.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1097889464780",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1097889464780:android:0aebf07dca2b21e0c8dd69",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: any;
try {
  if (Platform.OS === 'web') {
    auth = FirebaseAuth.getAuth(app);
  } else {
    const getPersistence = (FirebaseAuth as any).getReactNativePersistence;
    if (typeof getPersistence === 'function') {
      auth = (FirebaseAuth as any).initializeAuth?.(app, {
        persistence: getPersistence(AsyncStorage)
      }) || FirebaseAuth.getAuth(app);
    } else {
      auth = FirebaseAuth.getAuth(app);
    }
  }
} catch (e) {
  auth = FirebaseAuth.getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

