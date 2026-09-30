import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginUser,
  registerUser,
  logoutUser,
  resetPassword,
  subscribeToAuth,
  loginRiderWithPhoneAndPassword,
  loginUserWithPhoneAndPassword,
  requestPhoneOtp,
  verifyPhoneOtp
} from '../firebase/auth';
import { UserProfile, updateUserProfileDb, deleteUserAccountCompleteDb } from '../firebase/database';
import { auth } from '../firebase/firebaseConfig';
import { UserRole } from '../utils/constants';

const USER_SESSION_KEY = '@captainbro_current_user';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (email: string, password: string, fullName: string, phone: string, role?: UserRole) => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPass: (email: string) => Promise<void>;
  loginRider: (phone: string, password: string) => Promise<UserProfile>;
  loginPhoneAndPassword: (phone: string, password: string) => Promise<UserProfile>;
  sendPhoneOtp: (phone: string, appVerifier?: any) => Promise<{ confirmationResult?: any; isFallback?: boolean }>;
  confirmPhoneOtp: (otpCode: string, confirmationResult?: any, phone?: string, isFallback?: boolean, fullName?: string) => Promise<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveUserSession = async (user: UserProfile | null) => {
    setCurrentUser(user);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        if (user) {
          window.localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
        } else {
          window.localStorage.removeItem(USER_SESSION_KEY);
        }
        return;
      }
      if (user) {
        await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(USER_SESSION_KEY);
      }
    } catch (_) {}
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuthSession = async () => {
      try {
        let savedSession: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          savedSession = window.localStorage.getItem(USER_SESSION_KEY);
        } else {
          savedSession = await AsyncStorage.getItem(USER_SESSION_KEY);
        }
        if (savedSession && isMounted) {
          const parsedUser = JSON.parse(savedSession);
          setCurrentUser(parsedUser);
          setLoading(false);
          return;
        }
      } catch (_) {}

      const unsubscribe = subscribeToAuth((firebaseUser) => {
        if (isMounted) {
          if (firebaseUser) {
            saveUserSession(firebaseUser);
          }
          setLoading(false);
        }
      });

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    };

    initializeAuthSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userProfile = await loginUser(email, password);
      await saveUserSession(userProfile);
      return userProfile;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string, phone: string, role: UserRole = 'customer') => {
    setLoading(true);
    setError(null);
    try {
      const userProfile = await registerUser(email, password, fullName, phone, role);
      await saveUserSession(userProfile);
      return userProfile;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await saveUserSession(null);
      logoutUser().catch((err) => console.warn('Background Firebase signOut warning:', err));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPass = async (email: string) => {
    setError(null);
    try {
      await resetPassword(email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const loginRider = async (phone: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userProfile = await loginRiderWithPhoneAndPassword(phone, password);
      await saveUserSession(userProfile);
      return userProfile;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginPhoneAndPassword = async (phone: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userProfile = await loginUserWithPhoneAndPassword(phone, password);
      await saveUserSession(userProfile);
      return userProfile;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOtp = async (phone: string, appVerifier?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestPhoneOtp(phone, appVerifier);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmPhoneOtp = async (
    otpCode: string,
    confirmationResult?: any,
    phone?: string,
    isFallback?: boolean,
    fullName?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const userProfile = await verifyPhoneOtp(otpCode, confirmationResult, phone, isFallback, fullName);
      await saveUserSession(userProfile);
      return userProfile;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser?.uid) return false;
    setLoading(true);
    try {
      const updatedUser = { ...currentUser, ...updates };
      await saveUserSession(updatedUser);
      await updateUserProfileDb(currentUser.uid, updates);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    if (!currentUser?.uid) return false;
    setLoading(true);
    try {
      await deleteUserAccountCompleteDb(currentUser.uid);
      try {
        if (auth.currentUser) {
          await auth.currentUser.delete();
        }
      } catch (authErr) {
        console.warn('Firebase auth user delete notice:', authErr);
      }
      await saveUserSession(null);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      error,
      login,
      register,
      logout,
      resetPass,
      loginRider,
      loginPhoneAndPassword,
      sendPhoneOtp,
      confirmPhoneOtp,
      updateProfile,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
