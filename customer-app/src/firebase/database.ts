import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { app, db } from './firebaseConfig';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { Platform } from 'react-native';
import { UserRole, MOCK_PRODUCTS } from '../utils/constants';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'customer' | 'admin' | 'super_admin' | 'rider';
  vehicleNumber?: string;
  drivingLicense?: string;
  aadharNumber?: string;
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Strips any undefined fields recursively before sending to Cloud Firestore.
 * Firestore strictly rejects documents containing undefined values.
 */
export const cleanFirestoreData = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => cleanFirestoreData(item))
      .filter((item) => item !== undefined);
  }
  const result: any = {};
  Object.entries(obj).forEach(([key, val]) => {
    if (val !== undefined) {
      result[key] = cleanFirestoreData(val);
    }
  });
  return result;
};

export interface OrderItem {
  id: string | number;
  cartItemId?: string;
  name: string;
  price: number;
  quantity: number;
  weight?: string;
  image?: string;
  cuttingType?: string;
}

export interface OrderData {
  id?: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  paymentId?: string;
  paymentStatus?: 'paid' | 'pending_cod' | 'failed';
  status: 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'dispatched' | 'delivered' | 'cancelled' | 'pending_review' | 'price_quoted';
  riderId?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  deliveryPin?: string;
  rating?: number;
  reviewText?: string;
  notes?: string;
  deliveryInstructions?: string;
  deliverySchedule?: string;
  scheduledDate?: string;
  scheduledSlot?: string;
  pincode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RiderStatusData {
  id: string;
  status: 'online' | 'offline' | 'busy';
  currentLatitude?: number;
  currentLongitude?: number;
  updatedAt?: string;
  drivingLicense?: string;
  aadharNumber?: string;
  vehicleNumber?: string;
  name?: string;
  phone?: string;
}

export interface OrderTrackingData {
  orderId: string;
  status: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  updatedAt?: string;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------- USERS ----------------
export const getUserProfileDb = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile;
      try {
        await AsyncStorage.setItem(`@captainbro_user_${uid}`, JSON.stringify(data));
        if (data.phone) {
          await AsyncStorage.setItem(`@captainbro_user_phone_${data.phone.replace(/\D/g, '').slice(-10)}`, JSON.stringify(data));
        }
      } catch (_) {}
      return data;
    }
    
    // Fallback search by uid field or phone match
    const q = query(collection(db, 'users'), where('uid', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data() as UserProfile;
      try {
        await AsyncStorage.setItem(`@captainbro_user_${uid}`, JSON.stringify(data));
      } catch (_) {}
      return data;
    }
  } catch (error) {
    console.warn('[Firestore] Error reading remote user profile:', error);
  }

  // Fallback to local storage if Firestore has permission restrictions
  try {
    const localCached = await AsyncStorage.getItem(`@captainbro_user_${uid}`);
    if (localCached) {
      return JSON.parse(localCached) as UserProfile;
    }
  } catch (_) {}

  return null;
};

export const getUsersDb = async (): Promise<UserProfile[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
    return users;
  } catch (error) {
    console.error('Error fetching users from Firestore:', error);
    return [];
  }
};

export const createUserProfileDb = async (uid: string, profileData: Partial<UserProfile>): Promise<UserProfile> => {
  const rawProfile: any = {
    uid,
    email: profileData.email || '',
    fullName: profileData.fullName || 'User',
    phone: profileData.phone || '',
    role: profileData.role || 'customer',
    createdAt: new Date().toISOString()
  };

  if (profileData.vehicleNumber) rawProfile.vehicleNumber = profileData.vehicleNumber;
  if (profileData.drivingLicense) rawProfile.drivingLicense = profileData.drivingLicense;
  if (profileData.aadharNumber) rawProfile.aadharNumber = profileData.aadharNumber;

  const profile = cleanFirestoreData(rawProfile);

  // Always save locally first so user data is never lost
  try {
    await AsyncStorage.setItem(`@captainbro_user_${uid}`, JSON.stringify(profile));
    if (profile.phone) {
      const cleanPhone = profile.phone.replace(/\D/g, '').slice(-10);
      await AsyncStorage.setItem(`@captainbro_user_phone_${cleanPhone}`, JSON.stringify(profile));
    }
  } catch (_) {}

  try {
    await setDoc(doc(db, 'users', uid), profile, { merge: true });
  } catch (error: any) {
    console.warn('[Firestore] Unable to save user profile in Firestore (check Firestore Rules):', error?.message || error);
  }
  return profile as UserProfile;
};

export const updateUserProfileDb = async (uid: string, updates: Partial<UserProfile>): Promise<boolean> => {
  const cleanUpdates = cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString()
  });

  // Always save locally first so user data is never lost
  try {
    const existing = await AsyncStorage.getItem(`@captainbro_user_${uid}`);
    const merged = existing ? { ...JSON.parse(existing), ...cleanUpdates } : { uid, ...cleanUpdates };
    await AsyncStorage.setItem(`@captainbro_user_${uid}`, JSON.stringify(merged));
    if (merged.phone) {
      const cleanPhone = merged.phone.replace(/\D/g, '').slice(-10);
      await AsyncStorage.setItem(`@captainbro_user_phone_${cleanPhone}`, JSON.stringify(merged));
    }
  } catch (_) {}

  try {
    await setDoc(doc(db, 'users', uid), cleanUpdates, { merge: true });
    return true;
  } catch (error: any) {
    console.warn('[Firestore] Unable to update user profile in Firestore (check Firestore Rules):', error?.message || error);
    return true; // Return true because profile was safely preserved locally
  }
};

export const deleteUserDb = async (uid: string): Promise<boolean> => {
  return deleteUserAccountCompleteDb(uid);
};

export const deleteUserAccountCompleteDb = async (uid: string): Promise<boolean> => {
  try {
    // 1. Delete all saved addresses under /users/{uid}/addresses
    try {
      const addressesSnap = await getDocs(collection(db, 'users', uid, 'addresses'));
      const addrDeletes = addressesSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(addrDeletes);
    } catch (_) {}

    // 2. Delete user profile document and any rider document
    await deleteDoc(doc(db, 'users', uid)).catch(() => {});
    await deleteDoc(doc(db, 'riders', uid)).catch(() => {});

    // 3. Delete any auxiliary documents with matching uid
    try {
      const q = query(collection(db, 'users'), where('uid', '==', uid));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        deleteDoc(d.ref).catch(() => {});
      });
    } catch (_) {}

    // 4. Wipe all local device storage keys
    try {
      await AsyncStorage.removeItem(`@captainbro_user_${uid}`);
      await AsyncStorage.removeItem(`@captain_bro_orders_cache_${uid}`);
      await AsyncStorage.removeItem('@captainbro_current_user');
      await AsyncStorage.removeItem('@captain_bro_orders_cache');
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('@captainbro_current_user');
        localStorage.removeItem('@captain_bro_orders_cache');
      }
    } catch (_) {}

    return true;
  } catch (error) {
    console.error('Error during full account deletion:', error);
    return false;
  }
};

export const updateUserRoleDb = async (uid: string, newRole: UserRole): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'users', uid), { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (_) {}

  try {
    const q = query(collection(db, 'users'), where('uid', '==', uid));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      setDoc(d.ref, { role: newRole, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    });
  } catch (_) {}
  return true;
};

export const createAdminUserDb = async (userData: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role?: UserRole;
  vehicleNumber?: string;
  drivingLicense?: string;
  aadharNumber?: string;
}) => {
  const role = userData.role || 'rider';
  const cleanPhone = (userData.phone || '').replace(/\D/g, '').slice(-10);
  const targetEmail = userData.email?.trim() || `${cleanPhone || Date.now()}@captainbro.com`;
  const targetPass = userData.password?.trim() || (role === 'rider' ? 'rider123' : 'admin123');

  let authUid: string = '';

  // Try creating in Firebase Auth via isolated temp app
  try {
    const tempAppName = `tempApp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const tempApp = initializeApp(app.options, tempAppName);
    const tempAuth = getAuth(tempApp);
    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, targetEmail, targetPass);
      authUid = userCredential.user.uid;
    } finally {
      try {
        await deleteApp(tempApp);
      } catch (_) {}
    }
  } catch (authErr: any) {
    console.warn('Firebase Auth creation notice (falling back to Firestore user):', authErr?.message || authErr);
    // If email already exists in Auth or Firestore, check for existing document
    try {
      const qEmail = query(collection(db, 'users'), where('email', '==', targetEmail));
      const snap = await getDocs(qEmail);
      if (!snap.empty) {
        authUid = snap.docs[0].id;
      }
    } catch (_) {}

    if (!authUid && cleanPhone) {
      try {
        const qPhone = query(collection(db, 'users'), where('phone', '==', cleanPhone));
        const snap = await getDocs(qPhone);
        if (!snap.empty) {
          authUid = snap.docs[0].id;
        }
      } catch (_) {}
    }

    if (!authUid) {
      authUid = `${role}_${cleanPhone || Date.now()}`;
    }
  }

  if (!authUid) {
    authUid = `${role}_${cleanPhone || Date.now()}`;
  }

  // Create or update User profile in Firestore
  const profile = await createUserProfileDb(authUid, {
    email: targetEmail,
    fullName: userData.fullName.trim(),
    phone: cleanPhone,
    role: role as any,
    vehicleNumber: userData.vehicleNumber,
    drivingLicense: userData.drivingLicense,
    aadharNumber: userData.aadharNumber,
  });

  // If role is rider, also ensure a tracking record in 'riders' collection exists
  if (role === 'rider') {
    try {
      await setDoc(doc(db, 'riders', authUid), {
        id: authUid,
        name: userData.fullName.trim(),
        phone: cleanPhone,
        vehicleNumber: userData.vehicleNumber || 'Electric Scooter • TS-03-9999',
        drivingLicense: userData.drivingLicense || 'DL-AP-2024-XXXX',
        aadharNumber: userData.aadharNumber || 'XXXX-XXXX-1234',
        status: 'offline',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Error creating rider tracking record:', err);
    }
  }

  return profile;
};

// ---------------- ORDERS ----------------
export const createOrderDb = async (orderData: OrderData): Promise<OrderData> => {
  const id = orderData.id || ('ORD-' + Math.floor(10000 + Math.random() * 90000));
  const pin = orderData.deliveryPin || String(Math.floor(1000 + Math.random() * 9000));
  const newOrder: OrderData = {
    ...orderData,
    id,
    deliveryPin: pin,
    status: orderData.status || 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const cleanedPayload = cleanFirestoreData(newOrder);

  try {
    // Write cleaned order directly to Firestore
    await setDoc(doc(db, 'orders', id), cleanedPayload);
    console.log('[Firestore] Order placed successfully in Firestore:', id);
  } catch (err) {
    console.warn('[Firestore] Order creation network warning (will continue with local session):', err);
    // Even if offline/network error, still attempt background write
    setDoc(doc(db, 'orders', id), cleanedPayload).catch(() => {});
  }

  return newOrder;
};

export const deleteAllOrdersDb = async (): Promise<void> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    const deletePromises = querySnapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('deleteAllOrdersDb error:', err);
  }
};

export const getOrdersDb = async (userId?: string): Promise<OrderData[]> => {
  if (userId) {
    return getOrdersByUserDb(userId);
  }
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    const orders: OrderData[] = [];
    querySnapshot.forEach((doc) => orders.push(doc.data() as OrderData));
    orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return orders;
  } catch (err: any) {
    if (err?.code !== 'permission-denied' && !err?.message?.includes('insufficient permissions')) {
      console.warn('getOrdersDb notice:', err);
    }
    return [];
  }
};

export const getOrdersByUserDb = async (userId: string): Promise<OrderData[]> => {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const orders: OrderData[] = [];
    querySnapshot.forEach((doc) => orders.push(doc.data() as OrderData));
    orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return orders;
  } catch (err: any) {
    if (err?.code !== 'permission-denied' && !err?.message?.includes('insufficient permissions')) {
      console.warn('getOrdersByUserDb notice:', err);
    }
    return [];
  }
};

export const getOrderByIdDb = async (orderId: string): Promise<OrderData | null> => {
  if (!orderId) return null;
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (orderDoc.exists()) {
      return orderDoc.data() as OrderData;
    }
    return null;
  } catch (err: any) {
    if (err?.code !== 'permission-denied' && !err?.message?.includes('insufficient permissions')) {
      console.warn('getOrderByIdDb notice:', err);
    }
    return null;
  }
};

export const updateOrderStatusDb = async (id: string, status: string, riderId: string | null = null): Promise<Partial<OrderData>> => {
  const updatePayload: any = { status, updatedAt: new Date().toISOString() };
  if (riderId) updatePayload.riderId = riderId;
  await setDoc(doc(db, 'orders', id), updatePayload, { merge: true });
  return updatePayload;
};

export const updateOrderFieldsDb = async (id: string, fields: Partial<OrderData>): Promise<Partial<OrderData>> => {
  const updatePayload = { ...fields, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, 'orders', id), updatePayload, { merge: true });
  return updatePayload;
};

export const cancelOrderDb = async (id: string): Promise<boolean> => {
  if (!id) return false;
  const updatePayload = {
    status: 'cancelled',
    updatedAt: new Date().toISOString()
  };

  // 1. Try direct primary ID
  try {
    const primaryRef = doc(db, 'orders', id);
    const primarySnap = await getDoc(primaryRef);
    if (primarySnap.exists()) {
      await setDoc(primaryRef, updatePayload, { merge: true });
      return true;
    }
  } catch (err) {
    console.warn('cancelOrderDb primary lookup notice:', err);
  }

  // 2. Try alternate ID format (handles ORD-xxx vs xxx)
  const alternateId = id.startsWith('ORD-') ? id.replace('ORD-', '') : `ORD-${id}`;
  try {
    const altRef = doc(db, 'orders', alternateId);
    const altSnap = await getDoc(altRef);
    if (altSnap.exists()) {
      await setDoc(altRef, updatePayload, { merge: true });
      return true;
    }
  } catch (err) {
    console.warn('cancelOrderDb alternate lookup notice:', err);
  }

  // 3. Fallback: Write cancellation to Firestore with setDoc merge so it never throws "No document to update"
  try {
    const primaryRef = doc(db, 'orders', id);
    await setDoc(primaryRef, {
      id,
      ...updatePayload
    }, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('cancelOrderDb fallback write notice:', err);
    return true;
  }
};

export const subscribeToOrdersDb = (callback: (orders: OrderData[]) => void, userId?: string) => {
  if (userId) {
    return subscribeToOrdersByUserDb(userId, callback);
  }
  try {
    return onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const orders: OrderData[] = [];
        snapshot.forEach((doc) => orders.push(doc.data() as OrderData));
        orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(orders);
      },
      (error) => {
        if (error.code !== 'permission-denied' && !error.message?.includes('insufficient permissions')) {
          console.warn('Firestore orders snapshot notice:', error.message);
        }
      }
    );
  } catch (err) {
    console.warn('subscribeToOrdersDb exception:', err);
    return () => {};
  }
};

export const subscribeToOrdersByUserDb = (userId: string, callback: (orders: OrderData[]) => void) => {
  if (!userId) {
    callback([]);
    return () => {};
  }
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const orders: OrderData[] = [];
        snapshot.forEach((doc) => orders.push(doc.data() as OrderData));
        orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(orders);
      },
      (error) => {
        if (error.code !== 'permission-denied' && !error.message?.includes('insufficient permissions')) {
          console.warn('Firestore user orders snapshot notice:', error.message);
        }
      }
    );
  } catch (err) {
    console.warn('subscribeToOrdersByUserDb exception:', err);
    return () => {};
  }
};

export const subscribeToOrderByIdDb = (orderId: string, callback: (order: OrderData | null) => void) => {
  if (!orderId) {
    callback(null);
    return () => {};
  }
  try {
    return onSnapshot(
      doc(db, 'orders', orderId),
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as OrderData);
        } else {
          callback(null);
        }
      },
      (error) => {
        if (error.code !== 'permission-denied' && !error.message?.includes('insufficient permissions')) {
          console.warn('Firestore order by ID snapshot notice:', error.message);
        }
      }
    );
  } catch (err) {
    console.warn('subscribeToOrderByIdDb exception:', err);
    return () => {};
  }
};

// ---------------- TRACKING ----------------
export const updateOrderTrackingDb = async (orderId: string, lat: number, lng: number, status: string): Promise<OrderTrackingData> => {
  const trackingData: OrderTrackingData = {
    orderId,
    status,
    coordinates: { latitude: lat, longitude: lng },
    updatedAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'tracking', orderId), trackingData, { merge: true });
  return trackingData;
};

export const subscribeToOrderTrackingDb = (orderId: string, callback: (data: OrderTrackingData) => void) => {
  return onSnapshot(
    doc(db, 'tracking', orderId),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as OrderTrackingData);
      }
    },
    (error) => {
      console.warn('Firestore tracking snapshot permission notice:', error.message);
    }
  );
};

// ---------------- RIDERS ----------------
export const getRidersDb = async (): Promise<RiderStatusData[]> => {
  const querySnapshot = await getDocs(collection(db, 'riders'));
  const riders: RiderStatusData[] = [];
  querySnapshot.forEach((doc) => riders.push(doc.data() as RiderStatusData));
  return riders;
};

export const getRiderStatusDb = async (riderId: string): Promise<RiderStatusData | null> => {
  const rDoc = await getDoc(doc(db, 'riders', riderId));
  if (!rDoc.exists()) return { id: riderId, status: 'online' };
  return rDoc.data() as RiderStatusData;
};

export const updateRiderStatusDb = async (riderId: string, status: 'online' | 'offline' | 'busy'): Promise<RiderStatusData> => {
  const data: RiderStatusData = {
    id: riderId,
    status,
    updatedAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'riders', riderId), data, { merge: true });
  return data;
};

// ---------------- ADDRESSES ----------------
export interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  addressLine: string;
  pincode: string;
  type?: string;
  isDefault?: boolean;
}

export const getAddressesDb = async (userId: string): Promise<SavedAddress[]> => {
  try {
    const q = query(collection(db, 'users', userId, 'addresses'));
    const snapshot = await getDocs(q);
    const list: SavedAddress[] = [];
    snapshot.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() } as SavedAddress));
    return list;
  } catch {
    return [];
  }
};

export const saveAddressDb = async (userId: string, addressData: SavedAddress): Promise<SavedAddress> => {
  await setDoc(doc(db, 'users', userId, 'addresses', addressData.id), addressData);
  return addressData;
};

export const deleteAddressDb = async (userId: string, addressId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'addresses', addressId));
    return true;
  } catch {
    return false;
  }
};

export const setDefaultAddressDb = async (userId: string, addressId: string): Promise<boolean> => {
  try {
    const list = await getAddressesDb(userId);
    const updates = list.map((a) =>
      setDoc(doc(db, 'users', userId, 'addresses', a.id), { ...a, isDefault: a.id === addressId }, { merge: true })
    );
    await Promise.all(updates);
    return true;
  } catch {
    return false;
  }
};

// ---------------- SERVICEABLE PINCODES & DELIVERY AREAS ----------------
export const DEFAULT_SERVICEABLE_PINCODES = [
  '506001', // Warangal Station / City
  '506002', // Hanamkonda
  '506003', // Kazipet
  '506004', // Subedari
  '506005', // Narsampet Rd
  '506006', // Hunter Rd
  '506009', // Kakatiya University
  '506015', // Waddepally
  '506142', // Hasanparthy
  '506370', // Madikonda
];

export const getServiceablePincodesDb = async (): Promise<string[]> => {
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'serviceable_areas'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data?.pincodes) && data.pincodes.length > 0) {
        const cleaned = data.pincodes
          .map((p: any) => String(p).replace(/\D/g, '').trim())
          .filter((p: string) => p.length === 6);
        if (cleaned.length > 0) return cleaned;
      }
    }
  } catch (err: any) {
    if (err?.code !== 'permission-denied' && !err?.message?.includes('insufficient permissions') && !err?.message?.includes('Missing or insufficient permissions')) {
      console.warn('getServiceablePincodesDb notice (using default Warangal areas):', err);
    }
  }
  return DEFAULT_SERVICEABLE_PINCODES;
};

export const subscribeToServiceablePincodesDb = (callback: (pincodes: string[]) => void) => {
  try {
    return onSnapshot(
      doc(db, 'settings', 'serviceable_areas'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.pincodes) && data.pincodes.length > 0) {
            const cleaned = data.pincodes
              .map((p: any) => String(p).replace(/\D/g, '').trim())
              .filter((p: string) => p.length === 6);
            if (cleaned.length > 0) {
              callback(cleaned);
              return;
            }
          }
        }
        callback(DEFAULT_SERVICEABLE_PINCODES);
      },
      (err: any) => {
        if (err?.code !== 'permission-denied' && !err?.message?.includes('insufficient permissions') && !err?.message?.includes('Missing or insufficient permissions')) {
          console.warn('subscribeToServiceablePincodesDb notice:', err);
        }
        callback(DEFAULT_SERVICEABLE_PINCODES);
      }
    );
  } catch (_) {
    callback(DEFAULT_SERVICEABLE_PINCODES);
    return () => {};
  }
};

// ---------------- PRODUCTS PERSISTENCE ----------------
export interface ProductData {
  id: string;
  name: string;
  price: number;
  category: string;
  weight?: string;
  image?: string;
  additionalImages?: string[];
  videoUrl?: string;
  recipeVideos?: any[];
  frequentlyBought?: any[];
  description?: string;
  sub?: string;
  rating?: number;
  inStock?: boolean;
  cuttingOptions?: string[];
  updatedAt?: string;
}

export const seedInitialProductsDb = async (): Promise<ProductData[]> => {
  try {
    for (const prod of MOCK_PRODUCTS) {
      await setDoc(doc(db, 'products', prod.id), {
        ...prod,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    const snap = await getDocs(collection(db, 'products'));
    const list: ProductData[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ProductData));
    return list;
  } catch (err) {
    console.error('Error seeding initial products to Firestore:', err);
    return MOCK_PRODUCTS as any;
  }
};


import cloudProductsData from '../utils/cloudProducts.json';

const cloudProductMap = new Map<string, any>();
(cloudProductsData as any[]).forEach((p) => {
  cloudProductMap.set(p.id, p);
  if (p.name) cloudProductMap.set(p.name.trim().toLowerCase(), p);
});

export const enrichProductWithCloudImage = (product: ProductData): ProductData => {
  if (product.image && (product.image.startsWith('http') || product.image.startsWith('data:image'))) {
    return product;
  }
  const matchById = cloudProductMap.get(product.id);
  if (matchById?.image && matchById.image.startsWith('http')) {
    return {
      ...product,
      image: matchById.image,
      additionalImages: matchById.additionalImages && matchById.additionalImages.length > 0 ? matchById.additionalImages : product.additionalImages,
      recipeVideos: matchById.recipeVideos || (product as any).recipeVideos,
      frequentlyBought: matchById.frequentlyBought || (product as any).frequentlyBought
    };
  }
  const matchByName = product.name ? cloudProductMap.get(product.name.trim().toLowerCase()) : null;
  if (matchByName?.image && matchByName.image.startsWith('http')) {
    return {
      ...product,
      image: matchByName.image,
      additionalImages: matchByName.additionalImages && matchByName.additionalImages.length > 0 ? matchByName.additionalImages : product.additionalImages,
      recipeVideos: matchByName.recipeVideos || (product as any).recipeVideos,
      frequentlyBought: matchByName.frequentlyBought || (product as any).frequentlyBought
    };
  }
  return product;
};

export const getProductByIdDb = async (productId: string): Promise<ProductData | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'products', productId));
    if (docSnap.exists()) {
      const liveData = { id: docSnap.id, ...docSnap.data() } as ProductData;
      return enrichProductWithCloudImage(liveData);
    }
  } catch (_) {}
  const fallback = cloudProductMap.get(productId);
  return (fallback as ProductData) || null;
};

export const subscribeToProductByIdDb = (productId: string, onUpdate: (prod: ProductData | null) => void) => {
  const productDoc = doc(db, 'products', productId);
  return onSnapshot(
    productDoc,
    (docSnap) => {
      if (docSnap.exists()) {
        const liveData = { id: docSnap.id, ...docSnap.data() } as ProductData;
        onUpdate(enrichProductWithCloudImage(liveData));
      } else {
        const fallback = cloudProductMap.get(productId);
        onUpdate((fallback as ProductData) || null);
      }
    },
    (err) => {
      console.warn('Error subscribing to product by id:', err);
    }
  );
};

export const saveProductDb = async (product: Partial<ProductData> & { name: string; price: number; category: string }): Promise<ProductData> => {
  const id = product.id || ('prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
  const newProd: any = {
    id,
    name: product.name,
    price: product.price,
    category: product.category,
    weight: product.weight || '500g',
    image: product.image || 'fooditems.png',
    additionalImages: Array.isArray(product.additionalImages) ? product.additionalImages : [],
    description: product.description || '',
    sub: product.sub || `${product.name} • ${product.category}`,
    rating: typeof product.rating === 'number' ? product.rating : 4.8,
    inStock: product.inStock !== false,
    updatedAt: new Date().toISOString()
  };

  if (product.videoUrl && typeof product.videoUrl === 'string' && product.videoUrl.trim()) {
    newProd.videoUrl = product.videoUrl.trim();
  }

  if (Array.isArray((product as any).recipeVideos)) {
    newProd.recipeVideos = (product as any).recipeVideos;
  }

  if (Array.isArray((product as any).frequentlyBought)) {
    newProd.frequentlyBought = (product as any).frequentlyBought;
  }

  // Remove any remaining undefined fields to ensure strict Firestore compliance
  const cleanPayload = Object.fromEntries(
    Object.entries(newProd).filter(([_, v]) => v !== undefined)
  );

  await setDoc(doc(db, 'products', id), cleanPayload, { merge: true });
  return cleanPayload as unknown as ProductData;
};

export const updateProductPriceDb = async (id: string, price: number): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'products', id), { price, updatedAt: new Date().toISOString() });
  } catch (err) {
    await setDoc(doc(db, 'products', id), { price, updatedAt: new Date().toISOString() }, { merge: true });
  }
  return true;
};

export const deleteProductDb = async (id: string): Promise<boolean> => {
  await deleteDoc(doc(db, 'products', id));
  return true;
};

export const getProductsDb = async (): Promise<ProductData[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const productsMap = new Map<string, ProductData>();

    // 1. Seed base catalog from cloudProductsData so every image is restored
    (cloudProductsData as any[]).forEach((cp) => {
      productsMap.set(cp.id, cp as ProductData);
    });

    // 2. Overlay with live Firestore products and enrich missing images
    querySnapshot.forEach((docSnap) => {
      const liveData = { id: docSnap.id, ...docSnap.data() } as ProductData;
      const enriched = enrichProductWithCloudImage(liveData);
      productsMap.set(docSnap.id, enriched);
    });

    const products = Array.from(productsMap.values());
    products.sort((a, b) => {
      const isCustomA = String(a.id).startsWith('prod_');
      const isCustomB = String(b.id).startsWith('prod_');
      if (isCustomA && !isCustomB) return -1;
      if (!isCustomA && isCustomB) return 1;
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });
    return products;
  } catch (error) {
    console.error('Error fetching products from Firestore:', error);
    return (cloudProductsData as unknown as ProductData[]) || [];
  }
};

export const subscribeToProductsDb = (callback: (products: ProductData[]) => void) => {
  return onSnapshot(
    collection(db, 'products'),
    (snapshot) => {
      const productsMap = new Map<string, ProductData>();

      (cloudProductsData as any[]).forEach((cp) => {
        productsMap.set(cp.id, cp as ProductData);
      });

      snapshot.forEach((docSnap) => {
        const liveData = { id: docSnap.id, ...docSnap.data() } as ProductData;
        const enriched = enrichProductWithCloudImage(liveData);
        productsMap.set(docSnap.id, enriched);
      });

      const products = Array.from(productsMap.values());
      products.sort((a, b) => {
        const isCustomA = String(a.id).startsWith('prod_');
        const isCustomB = String(b.id).startsWith('prod_');
        if (isCustomA && !isCustomB) return -1;
        if (!isCustomA && isCustomB) return 1;
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
      callback(products);
    },
    (error) => {
      console.warn('Firestore products snapshot notice:', error.message);
      callback(cloudProductsData as unknown as ProductData[]);
    }
  );
};

export const subscribeToUsersDb = (callback: (users: UserProfile[]) => void) => {
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        users.push(docSnap.data() as UserProfile);
      });
      callback(users);
    },
    (error) => {
      console.warn('Firestore users snapshot notice:', error.message);
    }
  );
};
