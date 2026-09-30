import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createOrder, 
  getOrders, 
  getOrdersByUser, 
  updateOrderStatus, 
  updateOrderFields, 
  subscribeToOrders, 
  subscribeToOrdersByUser, 
  deleteAllOrders,
  cancelOrder
} from '../services/orderService';
import { OrderData } from '../firebase/database';
import { AuthContext } from './AuthContext';

const ORDERS_CACHE_KEY = '@captain_bro_orders_cache';

interface OrderContextType {
  orders: OrderData[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  placeOrder: (orderData: OrderData) => Promise<OrderData>;
  changeStatus: (orderId: string, status: string, riderId?: string | null) => Promise<void>;
  updateFields: (orderId: string, fields: Partial<OrderData>) => Promise<void>;
  cancelUserOrder: (orderId: string) => Promise<boolean>;
  updateOrderLocally: (order: OrderData) => void;
  clearAllOrders: () => Promise<void>;
}

export const OrderContext = createContext<OrderContextType>({} as OrderContextType);

const mergeOrderLists = (primary: OrderData[], secondary: OrderData[]): OrderData[] => {
  const map = new Map<string, OrderData>();
  secondary.forEach((o) => { if (o && o.id) map.set(o.id, o); });
  primary.forEach((o) => { if (o && o.id) map.set(o.id, o); });
  const result = Array.from(map.values());
  result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return result;
};

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useContext(AuthContext);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save to AsyncStorage
  const saveToStorage = async (list: OrderData[]) => {
    try {
      const storageKey = currentUser?.uid ? `${ORDERS_CACHE_KEY}_${currentUser.uid}` : ORDERS_CACHE_KEY;
      await AsyncStorage.setItem(storageKey, JSON.stringify(list));
    } catch (_) {}
  };

  const clearAllOrders = async () => {
    setOrders([]);
    try {
      const storageKey = currentUser?.uid ? `${ORDERS_CACHE_KEY}_${currentUser.uid}` : ORDERS_CACHE_KEY;
      await AsyncStorage.removeItem(storageKey);
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
    } catch (_) {}
    try {
      await deleteAllOrders();
    } catch (_) {}
  };

  const fetchOrders = async () => {
    if (!currentUser?.uid) {
      setOrders([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const remoteData = await getOrdersByUser(currentUser.uid);
      setOrders((prev) => {
        const merged = mergeOrderLists(remoteData, prev);
        saveToStorage(merged);
        return merged;
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async (orderData: OrderData): Promise<OrderData> => {
    setLoading(true);
    setError(null);
    try {
      const newOrder = await createOrder(orderData);
      setOrders((prev) => {
        const merged = mergeOrderLists([newOrder], prev);
        saveToStorage(merged);
        return merged;
      });
      return newOrder;
    } catch (err: any) {
      // If network fails, still save order locally so user never loses order!
      const fallbackOrder: OrderData = {
        ...orderData,
        id: orderData.id || ('ORD-' + Math.floor(10000 + Math.random() * 90000)),
        deliveryPin: orderData.deliveryPin || String(Math.floor(1000 + Math.random() * 9000)),
        status: orderData.status || 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setOrders((prev) => {
        const merged = mergeOrderLists([fallbackOrder], prev);
        saveToStorage(merged);
        return merged;
      });
      return fallbackOrder;
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (orderId: string, status: string, riderId: string | null = null) => {
    setLoading(true);
    setError(null);
    const localUpdated: Partial<OrderData> = {
      status: status as any,
      ...(riderId ? { riderId } : {}),
      updatedAt: new Date().toISOString(),
    };

    // Immediate optimistic update to state and storage
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === orderId ? { ...o, ...localUpdated } : o));
      saveToStorage(updated);
      return updated;
    });

    try {
      const updatedFields = await updateOrderStatus(orderId, status, riderId);
      setOrders((prev) => {
        const updated = prev.map((o) => (o.id === orderId ? { ...o, ...updatedFields } : o));
        saveToStorage(updated);
        return updated;
      });
    } catch (err: any) {
      console.warn('Firebase status update warning (persisted locally):', err);
    } finally {
      setLoading(false);
    }
  };

  const updateFields = async (orderId: string, fields: Partial<OrderData>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedFields = await updateOrderFields(orderId, fields);
      setOrders((prev) => {
        const updated = prev.map((o) => (o.id === orderId ? { ...o, ...updatedFields } : o));
        saveToStorage(updated);
        return updated;
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelUserOrder = async (orderId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Optimistic local update in state and persistent storage
      setOrders((prev) => {
        const updated = prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' as const, updatedAt: new Date().toISOString() } : o));
        saveToStorage(updated);
        return updated;
      });
      await cancelOrder(orderId);
      return true;
    } catch (err: any) {
      console.warn('cancelUserOrder notice:', err);
      // If order document was local-only or unsynced, local cancellation is still a complete success
      if (err?.message?.includes('No document to update') || err?.code === 'not-found') {
        return true;
      }
      return true;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storageKey = currentUser?.uid ? `${ORDERS_CACHE_KEY}_${currentUser.uid}` : ORDERS_CACHE_KEY;

    // 1. Initial load from local storage
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(storageKey);
        if (cached) {
          const list: OrderData[] = JSON.parse(cached);
          if (Array.isArray(list) && list.length > 0) {
            setOrders(list);
          }
        } else {
          setOrders([]);
        }
      } catch (_) {}
    };
    loadCache();

    if (!currentUser?.uid) {
      setOrders([]);
      return;
    }

    // 2. Fetch from Firestore
    fetchOrders();

    // 3. Realtime Firestore listener scoped to current user
    const unsubscribe = subscribeToOrdersByUser(currentUser.uid, (remoteData) => {
      setOrders((prev) => {
        const merged = mergeOrderLists(remoteData, prev);
        saveToStorage(merged);
        return merged;
      });
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser?.uid]);

  const updateOrderLocally = (freshOrder: OrderData) => {
    if (!freshOrder || !freshOrder.id) return;
    setOrders((prev) => {
      const merged = mergeOrderLists([freshOrder], prev);
      saveToStorage(merged);
      return merged;
    });
  };

  return (
    <OrderContext.Provider value={{
      orders,
      loading,
      error,
      fetchOrders,
      placeOrder,
      changeStatus,
      updateFields,
      cancelUserOrder,
      updateOrderLocally,
      clearAllOrders
    }}>
      {children}
    </OrderContext.Provider>
  );
};
