import React, { useState, useEffect, useRef, useMemo } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import Navbar from './components/Navbar';
import OrdersDashboard, { Order } from './components/OrdersDashboard';
import ProductManager, { Product } from './components/ProductManager';
import RidersManager from './components/RidersManager';
import AnalyticsView from './components/AnalyticsView';
import ServiceableAreasManager from './components/ServiceableAreasManager';
import LoginModal from './components/LoginModal';
import { playNewOrderChime, startOrderAlarmLoop, stopOrderAlarmLoop } from './utils/sound';
import { VolumeX, ShoppingBag } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'riders' | 'analytics' | 'zones'>('orders');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Live Database States
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [riders, setRiders] = useState<any[]>([]);

  // Alarm and acknowledgment state
  const [acknowledgedOrderIds, setAcknowledgedOrderIds] = useState<Set<string>>(new Set());
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);

  // Listen to Auth State
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
    });
    return () => unsubAuth();
  }, []);

  // Realtime Orders Subscription
  useEffect(() => {
    if (!currentUser) return;

    const q = collection(db, 'orders');
    const unsubOrders = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Order));

        list.sort((a, b) => {
          const getTimestamp = (val: any) => {
            if (!val) return 0;
            if (val.seconds) return val.seconds * 1000;
            const parsed = new Date(val).getTime();
            return isNaN(parsed) ? 0 : parsed;
          };
          return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
        });

        setOrders(list);
      },
      (err) => {
        console.warn('Orders snapshot notice:', err);
      }
    );

    return () => unsubOrders();
  }, [currentUser]);

  // Compute pending orders that have not been silenced yet
  const unacknowledgedPending = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'pending' && !acknowledgedOrderIds.has(o.id)
    );
  }, [orders, acknowledgedOrderIds]);

  // Continuous Sound Alarm Controller
  useEffect(() => {
    if (!currentUser) {
      stopOrderAlarmLoop();
      setIsAlarmRinging(false);
      return;
    }

    if (unacknowledgedPending.length > 0 && soundEnabled) {
      startOrderAlarmLoop();
      setIsAlarmRinging(true);
    } else {
      stopOrderAlarmLoop();
      setIsAlarmRinging(false);
    }

    return () => {
      stopOrderAlarmLoop();
    };
  }, [unacknowledgedPending.length, soundEnabled, currentUser]);

  // Realtime Products Subscription
  useEffect(() => {
    if (!currentUser) return;

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list: Product[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Product));
        setProducts(list);
      },
      (err) => {
        console.warn('Products snapshot notice:', err);
      }
    );

    return () => unsubProducts();
  }, [currentUser]);

  // Realtime Riders Subscription
  useEffect(() => {
    if (!currentUser) return;

    const qRiders = query(collection(db, 'users'), where('role', '==', 'rider'));
    const unsubRiders = onSnapshot(
      qRiders,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRiders(list);
      },
      (err) => {
        console.warn('Riders snapshot notice:', err);
      }
    );

    return () => unsubRiders();
  }, [currentUser]);

  const handleSilenceAlarm = () => {
    stopOrderAlarmLoop();
    setIsAlarmRinging(false);
    setAcknowledgedOrderIds((prev) => {
      const updated = new Set(prev);
      orders.filter((o) => o.status === 'pending').forEach((o) => updated.add(o.id));
      return updated;
    });
  };

  const handleTestSound = () => {
    playNewOrderChime();
  };

  const handleLogout = async () => {
    stopOrderAlarmLoop();
    setIsAlarmRinging(false);
    await signOut(auth);
    setCurrentUser(null);
  };

  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="live-pulse" style={{ width: '16px', height: '16px', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading Captain Bro Admin Operations...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginModal onSuccess={(user) => setCurrentUser(user)} />;
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const latestPendingOrder = unacknowledgedPending[0];

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingOrderCount={pendingCount}
        soundEnabled={soundEnabled}
        setSoundEnabled={(enabled) => {
          setSoundEnabled(enabled);
          if (!enabled) {
            stopOrderAlarmLoop();
            setIsAlarmRinging(false);
          }
        }}
        isAlarmRinging={isAlarmRinging}
        onSilenceAlarm={handleSilenceAlarm}
        onTestSound={handleTestSound}
        onLogout={handleLogout}
      />

      {/* High-Visibility Real-Time Incoming Order Alert Banner */}
      {unacknowledgedPending.length > 0 && latestPendingOrder && (
        <div className="new-order-alert-banner">
          <div className="alert-content">
            <div className="alert-badge">
              <span className="pulsing-dot" />
              NEW ORDER WAITING ({unacknowledgedPending.length})
            </div>
            <div className="alert-text">
              <strong>#{latestPendingOrder.id.slice(-6)}</strong> • ₹{latestPendingOrder.total} • {latestPendingOrder.customerName || 'Customer'} {latestPendingOrder.customerPhone ? `(${latestPendingOrder.customerPhone})` : ''} • {latestPendingOrder.deliverySchedule || 'Instant Delivery'}
            </div>
          </div>
          <div className="alert-actions">
            <button className="banner-silence-btn" onClick={handleSilenceAlarm}>
              <VolumeX size={15} /> Silence Sound
            </button>
            <button
              className="banner-accept-btn"
              onClick={() => {
                handleSilenceAlarm();
                setActiveTab('orders');
              }}
            >
              <ShoppingBag size={15} /> Review & Accept Order
            </button>
          </div>
        </div>
      )}

      <main className="content-area">
        {activeTab === 'orders' && <OrdersDashboard orders={orders} riders={riders} />}
        {activeTab === 'products' && <ProductManager products={products} />}
        {activeTab === 'riders' && <RidersManager riders={riders} />}
        {activeTab === 'analytics' && <AnalyticsView orders={orders} products={products} />}
        {activeTab === 'zones' && <ServiceableAreasManager />}
      </main>
    </div>
  );
}
