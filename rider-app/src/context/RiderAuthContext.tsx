import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
} from 'firebase/auth';

export interface RiderProfile {
  uid: string;
  fullName: string;
  phone: string;
  role: 'rider';
  vehicleNumber?: string;
  isOnline: boolean;
  totalDeliveries: number;
}

interface RiderAuthContextType {
  rider: RiderProfile | null;
  loading: boolean;
  isOnline: boolean;
  toggleOnlineStatus: () => Promise<void>;
  updateRiderProfile: (data: Partial<RiderProfile>) => Promise<void>;
  loginRider: (phone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logoutRider: () => Promise<void>;
}

export const RiderAuthContext = createContext<RiderAuthContextType>({} as any);

const STORAGE_KEY = '@captainbro_rider_profile';

export function RiderAuthProvider({ children }: { children: React.ReactNode }) {
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCachedProfile();
  }, []);

  const loadCachedProfile = async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setRider(parsed);
        // Ensure Firebase Auth session is active
        await ensureFirebaseAuthSession(parsed.phone, '1234');
      }
    } catch (_) {}
    setLoading(false);
  };

  const ensureFirebaseAuthSession = async (phone: string, fallbackPass: string) => {
    if (auth.currentUser) return;
    const riderEmail = `rider_${phone}@captainbro.com`;
    const riderPass = `cap_rider_${phone}`;
    try {
      await signInWithEmailAndPassword(auth, riderEmail, riderPass);
    } catch (err: any) {
      try {
        await createUserWithEmailAndPassword(auth, riderEmail, riderPass);
      } catch (_) {
        try {
          await signInAnonymously(auth);
        } catch (_) {}
      }
    }
  };

  const loginRider = async (phone: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return { success: false, message: 'Please enter a valid 10-digit mobile number' };
    }
    if (!password.trim()) {
      return { success: false, message: 'Please enter your password / PIN' };
    }

    try {
      // First ensure Firebase Auth session is created to pass Firestore security rules
      await ensureFirebaseAuthSession(cleanPhone, password.trim());

      // Check document by UID rider_phone
      const directDocRef = doc(db, 'users', 'rider_' + cleanPhone);
      const directDocSnap = await getDoc(directDocRef);

      let riderData: any = null;
      let riderUid = 'rider_' + cleanPhone;

      if (directDocSnap.exists()) {
        riderData = directDocSnap.data();
      } else {
        // Query users by phone and role == rider
        const q = query(
          collection(db, 'users'),
          where('phone', '==', cleanPhone),
          where('role', '==', 'rider')
        );
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          riderData = qSnap.docs[0].data();
          riderUid = qSnap.docs[0].id;
        }
      }

      if (!riderData || riderData.role !== 'rider') {
        return {
          success: false,
          message:
            'Access Denied: Your phone number is not registered as an authorized delivery rider. Please contact store management to register you.',
        };
      }

      // Verify password
      const savedPassword = riderData.password ? String(riderData.password).trim() : '1234';
      if (password.trim() !== savedPassword) {
        return { success: false, message: 'Incorrect password / PIN. Please try again.' };
      }

      const profile: RiderProfile = {
        uid: riderUid,
        fullName: riderData.fullName || riderData.name || 'Delivery Partner',
        phone: cleanPhone,
        role: 'rider',
        vehicleNumber: riderData.vehicleNumber || 'TS-03-EB-1234',
        isOnline: true,
        totalDeliveries: riderData.totalDeliveries || 0,
      };

      // Set online in Firestore and sync auth.currentUser.uid profile document
      try {
        await updateDoc(doc(db, 'users', riderUid), {
          isOnline: true,
          updatedAt: new Date(),
        });
        if (auth.currentUser && auth.currentUser.uid !== riderUid) {
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            role: 'rider',
            phone: cleanPhone,
            fullName: riderData.fullName || riderData.name || 'Delivery Partner',
            isOnline: true,
            vehicleNumber: riderData.vehicleNumber || 'TS-03-EB-1234',
            updatedAt: new Date(),
          }, { merge: true });
        }
      } catch (_) {}

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      setRider(profile);

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Login verification failed' };
    }
  };

  const toggleOnlineStatus = async () => {
    if (!rider) return;
    const nextStatus = !rider.isOnline;
    const updated = { ...rider, isOnline: nextStatus };
    setRider(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      await updateDoc(doc(db, 'users', rider.uid), {
        isOnline: nextStatus,
        updatedAt: new Date(),
      });
    } catch (_) {}
  };

  const updateRiderProfile = async (data: Partial<RiderProfile>) => {
    if (!rider) return;
    const updated = { ...rider, ...data };
    setRider(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      await updateDoc(doc(db, 'users', rider.uid), {
        ...data,
        updatedAt: new Date(),
      });
    } catch (_) {}
  };

  const logoutRider = async () => {
    try {
      if (rider) {
        await updateDoc(doc(db, 'users', rider.uid), { isOnline: false });
      }
      await signOut(auth);
    } catch (_) {}
    await AsyncStorage.removeItem(STORAGE_KEY);
    setRider(null);
  };

  return (
    <RiderAuthContext.Provider
      value={{
        rider,
        loading,
        isOnline: rider?.isOnline ?? false,
        toggleOnlineStatus,
        updateRiderProfile,
        loginRider,
        logoutRider,
      }}
    >
      {children}
    </RiderAuthContext.Provider>
  );
}
