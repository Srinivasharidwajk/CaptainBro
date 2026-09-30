import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBSBWFpsOxdnZEPU0Xxw575IiLZLXUHm1E",
  authDomain: "captain-bro-app.firebaseapp.com",
  projectId: "captain-bro-app",
  storageBucket: "captain-bro-app.firebasestorage.app",
  messagingSenderId: "1097889464780",
  appId: "1:1097889464780:android:0aebf07dca2b21e0c8dd69",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: any;
try {
  const getPersistence = (FirebaseAuth as any).getReactNativePersistence;
  if (typeof getPersistence === 'function') {
    auth = FirebaseAuth.initializeAuth(app, {
      persistence: getPersistence(AsyncStorage)
    });
  } else {
    auth = FirebaseAuth.getAuth(app);
  }
} catch (e) {
  auth = FirebaseAuth.getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
