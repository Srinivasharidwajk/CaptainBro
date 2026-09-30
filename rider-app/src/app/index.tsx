import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Switch,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { RiderAuthContext } from '../context/RiderAuthContext';
import { RiderOrderContext, RiderOrder } from '../context/RiderOrderContext';

// Audible tone synthesis for web / mobile
const playChime = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'AudioContext' in window) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  }
};

export default function RiderDashboardScreen() {
  const router = useRouter();
  const { rider, isOnline, toggleOnlineStatus, logoutRider } = useContext(RiderAuthContext);
  const { activeOrders, completedOrders, shiftEarnings, codCollected, startDelivery, completeDelivery } =
    useContext(RiderOrderContext);

  const [selectedOrderForPin, setSelectedOrderForPin] = useState<RiderOrder | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [handoverChecked, setHandoverChecked] = useState(false);
  const [submittingPin, setSubmittingPin] = useState(false);

  const prevOrderCountRef = useRef<number>(activeOrders.length);

  // Audible / Vibration Notification when a new order is assigned to this rider
  useEffect(() => {
    if (activeOrders.length > prevOrderCountRef.current) {
      playChime();
      if (Platform.OS !== 'web') {
        try {
          Vibration.vibrate([0, 600, 250, 600]);
        } catch (_) {}
      }
      Alert.alert(
        'New Order Assigned',
        'You have received a new delivery assignment from Captain Bro store. Please check the order details.'
      );
    }
    prevOrderCountRef.current = activeOrders.length;
  }, [activeOrders.length]);

  // Live GPS Location Broadcaster: Streams rider coordinates to Firestore during delivery
  useEffect(() => {
    if (!isOnline || !rider?.uid) return;
    const deliveringOrder = activeOrders.find((o) => o.status === 'out_for_delivery');
    if (!deliveringOrder) return;

    const streamGpsPosition = () => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              // Update order tracking
              await setDoc(
                doc(db, 'tracking', deliveringOrder.id),
                {
                  orderId: deliveringOrder.id,
                  status: 'out_for_delivery',
                  coordinates: { latitude, longitude },
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
              // Update rider live location
              await setDoc(
                doc(db, 'riders', rider.uid),
                {
                  currentLatitude: latitude,
                  currentLongitude: longitude,
                  status: 'busy',
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
            } catch (err) {
              console.warn('GPS location stream note:', err);
            }
          },
          (err) => {
            console.warn('Geolocation capture note:', err);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
      }
    };

    streamGpsPosition();
    const interval = setInterval(streamGpsPosition, 12000);
    return () => clearInterval(interval);
  }, [isOnline, rider?.uid, activeOrders]);

  // If not logged in, redirect to login
  if (!rider) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loggedOutContainer}>
          <Ionicons name="bicycle" size={64} color="#8B0000" />
          <Text style={styles.loggedOutTitle}>Captain Bro Partner</Text>
          <Text style={styles.loggedOutSub}>Sign in to start receiving delivery assignments</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/auth/login' as any)}
          >
            <Text style={styles.primaryBtnText}>Rider Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleOpenMaps = (address?: string) => {
    if (!address) {
      Alert.alert('No Address', 'Address details not provided for this order.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to launch Google Maps.'));
  };

  const handleCallCustomer = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'Customer phone number is unavailable.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Unable to open phone dialer.'));
  };

  const handleWhatsAppCustomer = (phone?: string, name?: string, orderId?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'Customer phone number is unavailable.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    const msg = `Hello ${name || ''}, I am your Captain Bro delivery partner en route with your fresh order #${(orderId || '').slice(-6)}.`;
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open WhatsApp.'));
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrderForPin) return;
    if (pinInput.trim().length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter the 4-digit customer delivery PIN.');
      return;
    }
    if (!handoverChecked) {
      Alert.alert('Handover Unchecked', 'Please confirm that the items have been handed to the customer.');
      return;
    }

    setSubmittingPin(true);
    const res = await completeDelivery(selectedOrderForPin.id, pinInput.trim());
    setSubmittingPin(false);

    if (res.success) {
      Alert.alert('Great Job', res.message);
      setSelectedOrderForPin(null);
      setPinInput('');
      setHandoverChecked(false);
    } else {
      Alert.alert('Verification Failed', res.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Top Rider Header Bar */}
      <View style={styles.topHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.avatarCircle}>
            <Ionicons name="bicycle" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.riderName}>{rider.fullName}</Text>
            <Text style={styles.vehicleTag}>{rider.vehicleNumber || 'TS-03-EB-9876'}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push('/history' as any)}
          >
            <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIconBtn} onPress={logoutRider}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Availability Toggle Bar */}
        <View style={[styles.dutyCard, isOnline ? styles.dutyCardOnline : styles.dutyCardOffline]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
              <Text style={styles.dutyTitle}>{isOnline ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}</Text>
            </View>
            <Text style={styles.dutySub}>
              {isOnline ? 'Ready to receive instant delivery orders' : 'Go online to receive store assignments'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#374151', true: '#059669' }}
            thumbColor={isOnline ? '#10B981' : '#9CA3AF'}
          />
        </View>

        {/* Shift Metrics Bar */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Shift Earning</Text>
            <Text style={[styles.metricVal, { color: '#10B981' }]}>₹{shiftEarnings}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Active Orders</Text>
            <Text style={[styles.metricVal, { color: '#0EA5E9' }]}>{activeOrders.length}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Cash in Hand</Text>
            <Text style={[styles.metricVal, { color: '#F59E0B' }]}>₹{codCollected}</Text>
          </View>
        </View>

        {/* Active Delivery Assignments */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionHeader}>
            {activeOrders.length > 0
              ? `ASSIGNED DELIVERIES (${activeOrders.length})`
              : 'LIVE DISPATCH STATUS'}
          </Text>

          {activeOrders.length === 0 ? (
            <View style={styles.noOrdersCard}>
              <Ionicons
                name={isOnline ? 'radio-outline' : 'moon-outline'}
                size={48}
                color={isOnline ? '#10B981' : '#6B7280'}
              />
              <Text style={styles.noOrdersTitle}>
                {isOnline ? 'Waiting for Next Order...' : 'You are Currently Offline'}
              </Text>
              <Text style={styles.noOrdersSub}>
                {isOnline
                  ? 'Keep this app open. New orders assigned by the admin will ring and appear here instantly.'
                  : 'Toggle the switch above to go online and receive deliveries.'}
              </Text>
            </View>
          ) : (
            activeOrders.map((order) => (
              <View key={order.id} style={styles.activeOrderCard}>
                <View style={styles.orderTop}>
                  <View>
                    <Text style={styles.orderIdText}>Order #{order.id.slice(-6)}</Text>
                    <Text style={styles.deliveryBadge}>
                      {order.status === 'out_for_delivery' ? 'OUT FOR DELIVERY' : 'PREPARING AT STORE'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderAmountText}>₹{order.total}</Text>
                    <Text style={styles.paymentMethodText}>{order.paymentMethod}</Text>
                  </View>
                </View>

                {/* Customer Info & Actions */}
                <View style={styles.customerBox}>
                  <Text style={styles.customerName}>{order.customerName || 'Customer'}</Text>
                  <Text style={styles.addressText} numberOfLines={3}>
                    {order.address || 'Address provided at checkout'}
                  </Text>

                  {Boolean(order.deliverySchedule) && (
                    <View style={styles.riderScheduleBox}>
                      <Ionicons name="time-outline" size={13} color="#38BDF8" />
                      <Text style={styles.riderScheduleText}>{order.deliverySchedule}</Text>
                    </View>
                  )}

                  {Boolean(order.notes) && (
                    <View style={styles.riderNotesBox}>
                      <Ionicons name="information-circle-outline" size={14} color="#FBBF24" />
                      <Text style={styles.riderNotesText}>Note: "{order.notes}"</Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenMaps(order.address)}
                    >
                      <Ionicons name="navigate" size={16} color="#0EA5E9" />
                      <Text style={[styles.actionBtnText, { color: '#0EA5E9' }]}>Maps</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleCallCustomer(order.customerPhone)}
                    >
                      <Ionicons name="call" size={16} color="#10B981" />
                      <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#064E3B' }]}
                      onPress={() => handleWhatsAppCustomer(order.customerPhone, order.customerName, order.id)}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#34D399" />
                      <Text style={[styles.actionBtnText, { color: '#34D399' }]}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Items Summary */}
                <View style={styles.itemsSummaryBox}>
                  <Text style={styles.itemsTitle}>Items to Handover:</Text>
                  {order.items?.map((item, i) => (
                    <View key={i} style={styles.itemRowCol}>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemName}>• {item.name} ({item.weight || '500g'})</Text>
                        <Text style={styles.itemQty}>×{item.quantity}</Text>
                      </View>
                      {Boolean(item.cuttingType) && (
                        <Text style={styles.cuttingStyleRiderTag}>
                          Cut: {item.cuttingType}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>

                {/* Primary Delivery Action */}
                {order.status === 'out_for_delivery' ? (
                  <TouchableOpacity
                    style={styles.deliverBtn}
                    onPress={() => {
                      setSelectedOrderForPin(order);
                      setPinInput('');
                      setHandoverChecked(false);
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.deliverBtnText}>Handover & Complete Delivery</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.deliverBtn, { backgroundColor: '#0284C7' }]}
                    onPress={() => startDelivery(order.id)}
                  >
                    <Ionicons name="bicycle" size={20} color="#FFFFFF" />
                    <Text style={styles.deliverBtnText}>Pick Up & Start Delivery</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Handover & Delivery PIN Modal */}
      {selectedOrderForPin && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delivery Verification</Text>
                <TouchableOpacity onPress={() => setSelectedOrderForPin(null)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSub}>
                Collect cash (if COD) and ask customer for the 4-digit PIN to complete:
              </Text>

              {(selectedOrderForPin.paymentMethod || '').toLowerCase().includes('cash') ||
              (selectedOrderForPin.paymentMethod || '').toLowerCase().includes('cod') ? (
                <View style={styles.codAlertBox}>
                  <Ionicons name="cash" size={20} color="#F59E0B" />
                  <Text style={styles.codAlertText}>
                    COLLECT CASH: ₹{selectedOrderForPin.total}
                  </Text>
                </View>
              ) : null}

              <View style={styles.pinInputWrapper}>
                <Text style={styles.pinLabel}>Customer 4-Digit Order PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  placeholder="1 2 3 4"
                  placeholderTextColor="#4B5563"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={pinInput}
                  onChangeText={setPinInput}
                />
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setHandoverChecked(!handoverChecked)}
              >
                <Ionicons
                  name={handoverChecked ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={handoverChecked ? '#10B981' : '#9CA3AF'}
                />
                <Text style={styles.checkboxText}>
                  I confirm all packed meats & items are safely handed over to the customer.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmDelivery}
                disabled={submittingPin}
              >
                {submittingPin ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Delivery & Earn ₹50</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0F19' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#8B0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderName: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  vehicleTag: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 16, flexGrow: 1 },
  dutyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  dutyCardOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  dutyCardOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dutyTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  dutySub: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  metricVal: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginTop: 4 },
  metricDivider: { width: 1, backgroundColor: '#1F2937' },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', marginBottom: 12, letterSpacing: 0.5 },
  noOrdersCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderStyle: 'dashed',
  },
  noOrdersTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 12 },
  noOrdersSub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  activeOrderCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 16,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderIdText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  deliveryBadge: { fontSize: 11, fontWeight: '700', color: '#F59E0B', marginTop: 2 },
  orderAmountText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  paymentMethodText: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  customerBox: {
    backgroundColor: '#0B0F19',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  customerName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  addressText: { fontSize: 12, color: '#9CA3AF', marginTop: 4, lineHeight: 16 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  itemsSummaryBox: {
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    paddingTop: 10,
    marginBottom: 14,
  },
  itemsTitle: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  itemName: { fontSize: 12, color: '#E5E7EB' },
  itemQty: { fontSize: 12, color: '#9CA3AF', fontWeight: '700' },
  deliverBtn: {
    backgroundColor: '#10B981',
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deliverBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  loggedOutContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loggedOutTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginTop: 14 },
  loggedOutSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  primaryBtn: {
    backgroundColor: '#8B0000',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#374151',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  modalSub: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  codAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  codAlertText: { color: '#F59E0B', fontWeight: '800', fontSize: 14 },
  pinInputWrapper: { marginBottom: 16 },
  pinLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 6 },
  pinInput: {
    backgroundColor: '#0B0F19',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
    paddingVertical: 10,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  checkboxText: { flex: 1, fontSize: 12, color: '#E5E7EB', lineHeight: 16 },
  confirmBtn: {
    backgroundColor: '#10B981',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  riderScheduleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  riderScheduleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#38BDF8',
  },
  riderNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  riderNotesText: {
    fontSize: 11.5,
    color: '#FBBF24',
    flex: 1,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  itemRowCol: {
    paddingVertical: 3,
  },
  cuttingStyleRiderTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F87171',
    marginLeft: 12,
    marginTop: 1,
  },
});
