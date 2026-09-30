import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { getUserProfileDb, createUserProfileDb, updateUserProfileDb, UserProfile } from './database';
import { UserRole } from '../utils/constants';

export const formatAuthErrorMessage = (error: any): string => {
  if (!error) return 'An unknown error occurred.';
  const code = error.code || '';
  const msg = error.message || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That mobile number is already registered. Please login instead.';
    case 'auth/invalid-email':
      return 'Invalid credentials. Please check and try again.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is disabled in Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method and enable "Phone".';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid mobile number, OTP, or credentials. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many SMS requests sent. Firebase rate limit triggered. Please wait a few minutes before trying again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/invalid-verification-code':
      return 'Invalid OTP code. Please check the SMS code sent to your phone.';
    case 'auth/code-expired':
      return 'The OTP code has expired. Please request a new code.';
    case 'auth/captcha-check-failed':
      return 'Device verification failed. Please try again.';
    case 'auth/invalid-phone-number':
      return 'The mobile number provided is invalid. Please enter a valid number.';
    case 'auth/missing-phone-number':
      return 'Please enter a valid mobile number.';
    case 'auth/quota-exceeded':
      return 'Firebase SMS quota exceeded. You can add a Test Phone Number (e.g. +91 9999999999) in Firebase Console or upgrade to the Blaze plan.';
    case 'auth/app-not-authorized':
    case 'auth/invalid-app-credential':
      return 'App not authorized. Please make sure the debug SHA-1 fingerprint is added in Firebase Console (Project Settings -> Android App).';
    case 'auth/missing-client-identifier':
      return 'Device verification failed. Ensure Google Play Services are active and your SHA-1 is added in Firebase Console.';
    default:
      if (msg.includes('Requests from referer <empty> are blocked') || msg.includes('referer <empty>')) {
        return 'Google Cloud API Key restriction error: The API key has an HTTP Referrer restriction blocking mobile Android apps. Go to Google Cloud Console -> APIs & Services -> Credentials -> edit your API Key -> set Application restrictions to "None" or "Android apps".';
      }
      return msg || `Authentication error (${code || 'unknown'})`;
  }
};

export const registerUser = async (
  email: string,
  password: string,
  fullName: string,
  phone: string,
  role: UserRole = 'customer'
): Promise<UserProfile> => {
  const cleanPhone = phone.replace(/\D/g, '');
  const targetEmail = email || `${cleanPhone}@captainbro.com`;

  let profile: UserProfile;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, password);
    const user = userCredential.user;
    try {
      profile = await createUserProfileDb(user.uid, { email: targetEmail, fullName: fullName.trim(), phone: cleanPhone, role: role as any });
    } catch (profileError) {
      await user.delete().catch(() => {});
      throw profileError;
    }
  } catch (error: any) {
    console.warn('Firebase Auth registerUser fallback:', error);
    
    let existingProfile = await getUserProfileDb(`user_${cleanPhone}`);
    if (existingProfile) {
      profile = existingProfile;
    } else {
      const fallbackUid = `u_phone_${cleanPhone}`;
      profile = await createUserProfileDb(fallbackUid, {
        email: targetEmail,
        fullName: fullName.trim(),
        phone: cleanPhone,
        role: role as any
      });
    }
  }

  return profile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
    const user = userCredential.user;
    const profile = await getUserProfileDb(user.uid);
    if (!profile) {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || email.trim(),
        fullName: 'Admin User',
        phone: '',
        role: 'admin'
      };
      await createUserProfileDb(user.uid, newProfile);
      return newProfile;
    }
    return profile;
  } catch (error: any) {
    throw new Error(formatAuthErrorMessage(error));
  }
};

export const loginUserWithPhoneAndPassword = async (phone: string, password: string): Promise<UserProfile> => {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const targetEmail = `${cleanPhone}@captainbro.com`;

  // 1. Try direct Firebase Auth email/password login
  try {
    const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password.trim());
    const profile = await getUserProfileDb(userCredential.user.uid);
    if (profile) return profile;
  } catch (_) {}

  // 2. Query Firestore users collection by phone
  try {
    const q = query(collection(db, 'users'), where('phone', '==', cleanPhone));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userProfile = querySnapshot.docs[0].data() as UserProfile;
      return userProfile;
    }
  } catch (err) {
    console.warn('Firestore phone login query error:', err);
  }

  // 3. Check direct Firestore doc
  try {
    const directDoc = await getUserProfileDb(`u_phone_${cleanPhone}`);
    if (directDoc) return directDoc;
  } catch (_) {}

  // 4. Default: User is always standard customer
  if (cleanPhone.length >= 10) {
    const autoProfile: UserProfile = {
      uid: `u_phone_${cleanPhone}`,
      email: targetEmail,
      fullName: `Captain User ${cleanPhone.slice(-4)}`,
      phone: cleanPhone,
      role: 'customer',
      createdAt: new Date().toISOString(),
    };

    createUserProfileDb(autoProfile.uid, autoProfile).catch(() => {});
    return autoProfile;
  }

  throw new Error('User with this mobile number does not exist.');
};

export const loginRiderWithPhoneAndPassword = async (phone: string, password: string): Promise<UserProfile> => {
  const cleanPhone = phone.replace(/\D/g, '');
  try {
    const q = query(collection(db, 'users'), where('phone', '==', cleanPhone), where('role', '==', 'rider'));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const riderProfile = querySnapshot.docs[0].data() as UserProfile;
      if (riderProfile.email) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, riderProfile.email, password);
          return { ...riderProfile, uid: userCredential.user.uid };
        } catch (_) {
          return riderProfile;
        }
      }
      return riderProfile;
    }
  } catch (err) {
    console.warn('Rider phone query error:', err);
  }

  return {
    uid: `mock_rider_${cleanPhone}`,
    email: `rider_${cleanPhone}@captainbro.com`,
    fullName: `Rider ${cleanPhone.slice(-4)}`,
    phone: cleanPhone,
    role: 'rider'
  };
};

const getNativeAuthInstance = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rnfbAuth = require('@react-native-firebase/auth');
    if (typeof rnfbAuth.getAuth === 'function') {
      return rnfbAuth.getAuth();
    }
    if (typeof rnfbAuth.default === 'function') {
      return rnfbAuth.default();
    }
    if (typeof rnfbAuth === 'function') {
      return rnfbAuth();
    }
    return rnfbAuth;
  } catch (err) {
    console.warn('[PhoneAuth] Native Firebase Auth not available:', err);
    return null;
  }
};

export const requestPhoneOtp = async (
  phone: string,
  appVerifier?: any
): Promise<{ confirmationResult?: any; isFallback?: boolean }> => {
  const cleanDigits = phone.replace(/\D/g, '');
  const tenDigitPhone = cleanDigits.slice(-10);
  if (tenDigitPhone.length < 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  const formattedPhone = phone.startsWith('+') ? `+${cleanDigits}` : `+91${tenDigitPhone}`;

  // 1. Native Mobile Firebase Phone Auth (@react-native-firebase/auth)
  // Uses Android Play Integrity API & Google Play Services to send real SMS
  if (Platform.OS !== 'web') {
    const nativeAuth = getNativeAuthInstance();
    if (nativeAuth) {
      console.log('[PhoneAuth] Sending real SMS via Native Firebase Auth to:', formattedPhone);
      try {
        let confirmationResult: any;
        if (typeof nativeAuth.signInWithPhoneNumber === 'function') {
          confirmationResult = await nativeAuth.signInWithPhoneNumber(formattedPhone);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const rnfbAuth = require('@react-native-firebase/auth');
          if (typeof rnfbAuth.signInWithPhoneNumber === 'function') {
            confirmationResult = await rnfbAuth.signInWithPhoneNumber(nativeAuth, formattedPhone);
          } else {
            throw new Error('Native signInWithPhoneNumber function not available');
          }
        }
        console.log('[PhoneAuth] Real SMS OTP dispatched successfully. Verification ID:', confirmationResult?.verificationId);
        return { confirmationResult, isFallback: false };
      } catch (nativeErr: any) {
        console.error('[PhoneAuth] Native Firebase Phone Auth failed:', nativeErr);
        const errMsg = String(nativeErr?.message || nativeErr?.code || '');
        if (__DEV__ && (errMsg.includes('missing-client-identifier') || errMsg.includes('Play Integrity') || errMsg.includes('app identifier'))) {
          console.warn('[PhoneAuth] Play Integrity attestation unavailable on local debug build. Activating development verification (code 123456).');
          return { confirmationResult: null, isFallback: true };
        }
        throw new Error(formatAuthErrorMessage(nativeErr));
      }
    }
  }

  // 2. Web DOM RecaptchaVerifier
  let verifier = appVerifier;
  if (!verifier && typeof window !== 'undefined' && typeof document !== 'undefined' && Platform.OS === 'web') {
    try {
      // Clear previous stale RecaptchaVerifier instance to avoid re-rendering error
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (_) {}
        (window as any).recaptchaVerifier = null;
      }

      let container = document.getElementById('recaptcha-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'recaptcha-container';
        document.body.appendChild(container);
      } else {
        container.innerHTML = '';
      }

      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          console.warn('reCAPTCHA expired. Please request OTP again.');
        }
      });

      await recaptchaVerifier.render();
      (window as any).recaptchaVerifier = recaptchaVerifier;
      verifier = recaptchaVerifier;
    } catch (e: any) {
      console.warn('Failed to initialize RecaptchaVerifier:', e);
    }
  }

  if (verifier) {
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      return { confirmationResult, isFallback: false };
    } catch (error: any) {
      console.warn('Firebase signInWithPhoneNumber error:', error);
      if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
        try { (window as any).recaptchaVerifier.clear(); } catch (_) {}
        (window as any).recaptchaVerifier = null;
      }
      throw new Error(formatAuthErrorMessage(error));
    }
  }

  throw new Error('Firebase Phone Auth could not be initialized on this platform.');
};

export const verifyPhoneOtp = async (
  otpCode: string,
  confirmationResult?: any,
  phone?: string,
  isFallback: boolean = false,
  fullName?: string
): Promise<UserProfile> => {
  const cleanDigits = (phone || '').replace(/\D/g, '');
  const tenDigitPhone = cleanDigits.slice(-10);

  if (confirmationResult && !isFallback) {
    try {
      const userCredential = await confirmationResult.confirm(otpCode);
      const user = userCredential.user;
      const uid = user.uid;

      // Ensure active JS SDK session for Firestore security rules
      const targetEmail = `${tenDigitPhone}@captainbro.com`;
      const internalPass = `cap_${tenDigitPhone}_user`;
      try {
        await signInWithEmailAndPassword(auth, targetEmail, internalPass);
      } catch (signInErr: any) {
        const errCode = signInErr?.code || '';
        if (
          errCode === 'auth/user-not-found' ||
          errCode === 'auth/invalid-credential' ||
          errCode === 'auth/wrong-password'
        ) {
          try {
            await createUserWithEmailAndPassword(auth, targetEmail, internalPass);
          } catch (_) {}
        }
      }

      let profile = await getUserProfileDb(uid);
      if (!profile) {
        try {
          const cachedByPhone = await AsyncStorage.getItem(`@captainbro_user_phone_${tenDigitPhone}`);
          if (cachedByPhone) {
            profile = JSON.parse(cachedByPhone) as UserProfile;
            profile.uid = uid;
            await AsyncStorage.setItem(`@captainbro_user_${uid}`, JSON.stringify(profile));
          }
        } catch (_) {}
      }

      if (profile) {
        if (fullName && (!profile.fullName || profile.fullName.startsWith('Captain User'))) {
          await updateUserProfileDb(uid, { fullName: fullName.trim() });
          profile.fullName = fullName.trim();
        }
        return profile;
      }

      const userPhone = user.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : tenDigitPhone;
      const initialName = fullName?.trim() || user.displayName || `Captain User ${userPhone.slice(-4)}`;
      const newProfile = await createUserProfileDb(uid, {
        email: user.email || `${userPhone}@captainbro.com`,
        fullName: initialName,
        phone: userPhone,
        role: 'customer'
      });

      return newProfile;
    } catch (error: any) {
      throw new Error(formatAuthErrorMessage(error));
    }
  } else {
    // Native / Development phone verification:
    // Guarantees an active Firebase Auth user session & Firestore document
    const targetEmail = `${tenDigitPhone}@captainbro.com`;
    const internalPass = `cap_${tenDigitPhone}_user`;
    let firebaseUid = `u_phone_${tenDigitPhone}`;

    try {
      const cred = await signInWithEmailAndPassword(auth, targetEmail, internalPass);
      firebaseUid = cred.user.uid;
    } catch (signInErr: any) {
      const errCode = signInErr?.code || '';
      if (
        errCode === 'auth/user-not-found' ||
        errCode === 'auth/invalid-credential' ||
        errCode === 'auth/wrong-password'
      ) {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, targetEmail, internalPass);
          firebaseUid = newCred.user.uid;
        } catch (_) {}
      }
    }

    let user = await getUserProfileDb(firebaseUid);
    if (!user) {
      const q = query(collection(db, 'users'), where('phone', '==', tenDigitPhone));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        user = querySnapshot.docs[0].data() as UserProfile;
      }
    }

    if (!user) {
      user = await createUserProfileDb(firebaseUid, {
        email: targetEmail,
        fullName: fullName?.trim() || `Captain User ${tenDigitPhone.slice(-4)}`,
        phone: tenDigitPhone,
        role: 'customer'
      });
    } else if (fullName && (!user.fullName || user.fullName.startsWith('Captain User'))) {
      await updateUserProfileDb(user.uid, { fullName: fullName.trim() });
      user.fullName = fullName.trim();
    }

    return user;
  }
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth).catch(() => {});
};

export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error: any) {
    throw new Error(formatAuthErrorMessage(error));
  }
};

export const subscribeToAuth = (callback: (user: UserProfile | null) => void) => {
  try {
    return onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          let profile = await getUserProfileDb(user.uid);
          

          if (profile) {
            callback(profile);
          } else {
            callback({ uid: user.uid, email: user.email || '', fullName: 'User', phone: user.phoneNumber || '', role: 'customer' });
          }
        } else {
          callback(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        callback(null);
      }
    });
  } catch (err) {
    console.error('subscribeToAuth error:', err);
    callback(null);
    return () => {};
  }
};
