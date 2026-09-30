import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const loadState = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    }
    const serializedState = await AsyncStorage.getItem(key);
    if (serializedState === null) {
      return fallback;
    }
    return JSON.parse(serializedState);
  } catch (_) {
    return fallback;
  }
};

export const saveState = async (key: string, state: any): Promise<void> => {
  try {
    const serializedState = JSON.stringify(state);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, serializedState);
      return;
    }
    await AsyncStorage.setItem(key, serializedState);
  } catch (_) {
    // Graceful fallback
  }
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return dateString;
  }
};

export const formatPrice = (price: number): string => {
  return `₹${Number(price || 0).toLocaleString('en-IN')}`;
};

export const formatWeight = (baseWeight?: string, quantity: number = 1): string => {
  if (!baseWeight) return '';
  if (quantity <= 1) return baseWeight;

  const trimmed = baseWeight.trim().toLowerCase();

  // Match grams (e.g. "500g", "500 g", "1000g")
  const gMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*g$/);
  if (gMatch) {
    const baseG = parseFloat(gMatch[1]);
    const totalG = baseG * quantity;
    if (totalG >= 1000) {
      const kg = totalG / 1000;
      return `${kg % 1 === 0 ? kg : kg.toFixed(1).replace(/\.0$/, '')}kg`;
    }
    return `${totalG}g`;
  }

  // Match kilograms (e.g. "1kg", "0.5kg", "2 kg")
  const kgMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*kg$/);
  if (kgMatch) {
    const baseKg = parseFloat(kgMatch[1]);
    const totalKg = baseKg * quantity;
    return `${totalKg % 1 === 0 ? totalKg : totalKg.toFixed(1).replace(/\.0$/, '')}kg`;
  }

  // Match ml (e.g. "500ml")
  const mlMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*ml$/);
  if (mlMatch) {
    const baseMl = parseFloat(mlMatch[1]);
    const totalMl = baseMl * quantity;
    if (totalMl >= 1000) {
      const l = totalMl / 1000;
      return `${l % 1 === 0 ? l : l.toFixed(1).replace(/\.0$/, '')}L`;
    }
    return `${totalMl}ml`;
  }

  // Match pcs / count (e.g. "4 pcs", "1 pc", "1 bunch", "1 dozen")
  const pcsMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(pcs|pc|bunch|dozen)$/);
  if (pcsMatch) {
    const count = parseFloat(pcsMatch[1]) * quantity;
    const unit = pcsMatch[2];
    return `${count} ${unit}`;
  }

  return `${quantity} x ${baseWeight}`;
};
