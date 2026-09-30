import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { RiderAuthContext } from './RiderAuthContext';

export interface RiderOrder {
  id: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  items: { name: string; quantity: number; weight?: string; cuttingType?: string }[];
  total: number;
  paymentMethod: string;
  status: 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  deliveryPin?: string;
  notes?: string;
  deliverySchedule?: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  createdAt?: any;
}

interface RiderOrderContextType {
  activeOrders: RiderOrder[];
  completedOrders: RiderOrder[];
  shiftEarnings: number;
  codCollected: number;
  startDelivery: (orderId: string) => Promise<void>;
  completeDelivery: (orderId: string, pin: string) => Promise<{ success: boolean; message: string }>;
}

export const RiderOrderContext = createContext<RiderOrderContextType>({} as any);

export function RiderOrderProvider({ children }: { children: React.ReactNode }) {
  const { rider, updateRiderProfile } = useContext(RiderAuthContext);
  const [assignedOrders, setAssignedOrders] = useState<RiderOrder[]>([]);

  useEffect(() => {
    if (!rider) {
      setAssignedOrders([]);
      return;
    }

    const cleanPhone = (rider.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const riderIdentifiers = Array.from(
      new Set([
        rider.uid,
        cleanPhone,
        rider.phone,
        'rider_' + cleanPhone,
        '+91' + cleanPhone,
      ].filter(Boolean))
    );

    // Subscribe ONLY to orders assigned to this specific rider
    const q = query(
      collection(db, 'orders'),
      where('riderId', 'in', riderIdentifiers.slice(0, 10))
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: RiderOrder[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        } as RiderOrder));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setAssignedOrders(list);
      },
      (err) => {
        console.warn('Rider orders subscription notice:', err.message || err);
      }
    );

    return () => unsub();
  }, [rider]);

  const activeOrders = assignedOrders.filter(
    (o) => o.status === 'accepted' || o.status === 'preparing' || o.status === 'out_for_delivery'
  );

  const completedOrders = assignedOrders.filter((o) => o.status === 'delivered');

  // Base earnings: ₹50 per delivered order
  const shiftEarnings = completedOrders.length * 50;

  // Cash on delivery sum collected
  const codCollected = completedOrders
    .filter((o) => (o.paymentMethod || '').toLowerCase().includes('cash') || (o.paymentMethod || '').toLowerCase().includes('cod'))
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const startDelivery = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'out_for_delivery',
        dispatchedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err: any) {
      throw new Error(err.message || 'Failed to start delivery');
    }
  };

  const completeDelivery = async (orderId: string, enteredPin: string) => {
    const order = assignedOrders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found' };

    const expectedPin = order.deliveryPin;
    if (!expectedPin || enteredPin.trim() !== String(expectedPin).trim()) {
      return { success: false, message: 'Invalid 4-digit customer delivery PIN! Please ask the customer for their secret PIN.' };
    }

    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'delivered',
        deliveredAt: new Date(),
        updatedAt: new Date(),
      });

      if (rider) {
        await updateRiderProfile({ totalDeliveries: (rider.totalDeliveries || 0) + 1 });
      }

      return { success: true, message: 'Delivery completed successfully!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to mark delivery complete' };
    }
  };

  return (
    <RiderOrderContext.Provider
      value={{
        activeOrders,
        completedOrders,
        shiftEarnings,
        codCollected,
        startDelivery,
        completeDelivery,
      }}
    >
      {children}
    </RiderOrderContext.Provider>
  );
}
