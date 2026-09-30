import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomNavbar from '@/components/BottomNavbar';
import { OrderContext } from '@/context/OrderContext';
import { getOrderById, subscribeToOrderById } from '@/services/orderService';
import { formatDate, formatPrice } from '@/utils/helpers';
import { OrderData, subscribeToOrderTrackingDb, OrderTrackingData } from '@/firebase/database';
import { triggerOrderNotification } from '@/utils/notifications';

const HORIZONTAL_STEPS = [
  { key: 'pending', label: 'Placed', icon: 'receipt-outline' },
  { key: 'accepted', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  { key: 'preparing', label: 'Preparing', icon: 'time-outline' },
  { key: 'out_for_delivery', label: 'On The Way', icon: 'bicycle-outline' },
  { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-circle' },
];

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, cancelUserOrder, updateOrderLocally } = useContext(OrderContext);

  const [order, setOrder] = useState<OrderData | null>(null);
  const [liveTracking, setLiveTracking] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showItems, setShowItems] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    if (!id) {
      setLoading(false);
      return;
    }

    const targetId = String(id).trim();

    // 1. Instant local render from context
    const match = orders.find(
      (o) =>
        o.id === targetId ||
        o.id?.toLowerCase() === targetId.toLowerCase() ||
        o.id === `ORD-${targetId}` ||
        `ORD-${o.id}` === targetId
    );

    if (match && isMounted) {
      setOrder(match);
      setLoading(false);
    }

    // 2. Fetch directly from DB by specific order ID
    getOrderById(targetId).then((singleOrder) => {
      if (!singleOrder && !targetId.startsWith('ORD-')) {
        return getOrderById(`ORD-${targetId}`);
      }
      return singleOrder;
    }).then((fresh) => {
      if (fresh && isMounted) {
        setOrder(fresh);
        if (updateOrderLocally) updateOrderLocally(fresh);
      }
    }).catch((err) => {
      console.warn('Notice fetching initial order details:', err);
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const prevStatusRef = React.useRef<string | undefined>(undefined);

  // Real-time subscription directly to this specific order's document
  useEffect(() => {
    const targetDocId = order?.id || (id ? String(id).trim() : null);
    if (!targetDocId) return;

    if (!prevStatusRef.current && order?.status) {
      prevStatusRef.current = order.status;
    }

    const unsubMain = subscribeToOrderById(targetDocId, (freshOrder) => {
      if (freshOrder) {
        if (prevStatusRef.current && prevStatusRef.current !== freshOrder.status) {
          triggerOrderNotification(freshOrder.status, freshOrder.id || '', freshOrder.riderName || undefined);
        }
        prevStatusRef.current = freshOrder.status;
        setOrder(freshOrder);
        if (updateOrderLocally) updateOrderLocally(freshOrder);
        setLoading(false);
      }
    });

    let unsubVariant: (() => void) | undefined;
    if (!targetDocId.startsWith('ORD-')) {
      unsubVariant = subscribeToOrderById(`ORD-${targetDocId}`, (freshOrder) => {
        if (freshOrder) {
          if (prevStatusRef.current && prevStatusRef.current !== freshOrder.status) {
            triggerOrderNotification(freshOrder.status, freshOrder.id || '', freshOrder.riderName || undefined);
          }
          prevStatusRef.current = freshOrder.status;
          setOrder(freshOrder);
          if (updateOrderLocally) updateOrderLocally(freshOrder);
          setLoading(false);
        }
      });
    }

    return () => {
      if (typeof unsubMain === 'function') unsubMain();
      if (typeof unsubVariant === 'function') unsubVariant();
    };
  }, [id, order?.id]);

  // Real-time live GPS tracking beacon from rider device
  useEffect(() => {
    if (!order?.id) return;
    const unsubTracking = subscribeToOrderTrackingDb(order.id, (trackingData) => {
      if (trackingData) {
        setLiveTracking(trackingData);
      }
    });
    return () => {
      if (typeof unsubTracking === 'function') unsubTracking();
    };
  }, [order?.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyBox}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Finding order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyBox}>
          <Ionicons name="alert-circle-outline" size={54} color="#9CA3AF" />
          <Text style={[styles.emptyText, { marginTop: 12, fontWeight: '700', color: '#111827' }]}>
            Order Not Found
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>
            Could not locate order #{id}. It may have been cleared or created in another session.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#8B0000',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              marginTop: 20,
            }}
            onPress={() => router.push('/orders' as any)}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>View My Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Cancelled Order View
  if (order.status === 'cancelled') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order #{order.id}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyBox}>
          <View style={styles.cancelledCircle}>
            <Ionicons name="close" size={36} color="#DC2626" />
          </View>
          <Text style={[styles.emptyText, { marginTop: 16, fontWeight: '800', color: '#111827' }]}>
            Order Cancelled
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
            We apologize, but this order was cancelled. Please browse our fresh cuts to place another order.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#8B0000',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 10,
              marginTop: 24,
            }}
            onPress={() => router.push('/' as any)}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const normalizeStatusKey = (st?: string) => {
    if (!st) return 'pending';
    const lower = st.toLowerCase().trim();
    if (lower === 'placed' || lower === 'pending') return 'pending';
    if (lower === 'confirmed' || lower === 'accepted') return 'accepted';
    if (lower === 'preparing' || lower === 'in_preparation' || lower === 'kitchen') return 'preparing';
    if (
      lower === 'dispatched' ||
      lower === 'out_for_delivery' ||
      lower === 'out for delivery' ||
      lower === 'on_the_way' ||
      lower === 'on the way'
    ) {
      return 'out_for_delivery';
    }
    if (lower === 'completed' || lower === 'delivered') return 'delivered';
    if (lower === 'cancelled') return 'cancelled';
    return lower;
  };

  const getEtaMessage = () => {
    switch (normalizeStatusKey(order?.status)) {
      case 'pending':
        return 'Order Placed • Waiting for store confirmation';
      case 'accepted':
        return 'Order Confirmed • Store is processing your cuts';
      case 'preparing':
        return 'Fresh Butchery & Packing in Progress';
      case 'out_for_delivery':
        return 'Rider is on the way to your doorstep!';
      case 'delivered':
        return 'Delivered Successfully • Enjoy your fresh cuts!';
      case 'cancelled':
        return 'Order Cancelled';
      default:
        return 'Tracking live updates...';
    }
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order?',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            if (!order?.id) return;
            const success = await cancelUserOrder(order.id);
            if (success) {
              Alert.alert('Order Cancelled', 'Your order has been cancelled.');
              setOrder({ ...order, status: 'cancelled' });
            } else {
              Alert.alert('Unable to Cancel', 'Could not cancel order. Please contact customer support.');
            }
          },
        },
      ]
    );
  };

  const getStepStatus = (stepKey: string) => {
    const normStatus = normalizeStatusKey(order?.status);
    if (normStatus === 'cancelled') return 'cancelled';

    const orderIdx = HORIZONTAL_STEPS.findIndex((s) => s.key === normStatus);
    const stepIdx = HORIZONTAL_STEPS.findIndex((s) => s.key === stepKey);

    if (normStatus === 'delivered') return 'completed';
    if (orderIdx !== -1 && stepIdx < orderIdx) return 'completed';
    if (orderIdx !== -1 && stepIdx === orderIdx) return 'current';
    return 'upcoming';
  };

  const callRider = () => {
    if (order.riderPhone) {
      Linking.openURL(`tel:${order.riderPhone}`);
    } else {
      Alert.alert('Rider Contact', 'Rider phone number: 9876543211');
    }
  };

  const deliveryPinCode =
    order.deliveryPin ||
    (order as any).delivery_pin ||
    (() => {
      const idStr = order.id || '';
      let hash = 0;
      for (let i = 0; i < idStr.length; i++) {
        hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      return (Math.abs(hash % 9000) + 1000).toString();
    })();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header matching screenshot: ← Orders • Ord_xxx [Cart Icon] */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBackBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders • {order.id}</Text>
        <TouchableOpacity style={styles.cartHeaderBtn} onPress={() => router.push('/cart' as any)}>
          <Ionicons name="cart" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Swiggy Style Live Map Canvas */}
        <SwiggyLiveMap order={order} etaText={getEtaMessage()} liveTracking={liveTracking} />

        {/* Delivery Verification PIN Card */}
        {(order.status as string) !== 'delivered' && (order.status as string) !== 'cancelled' && (
          <View style={styles.yellowPinCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pinCaptionText}>DELIVERY VERIFICATION PIN</Text>
              <Text style={styles.pinNoticeText}>Share this PIN with the rider when they arrive</Text>
            </View>
            <View style={styles.whitePinBadge}>
              <Text style={styles.whitePinBadgeText}>{deliveryPinCode}</Text>
            </View>
          </View>
        )}

        {/* Horizontal 5-Step Order Status Bar */}
        <View style={styles.horizontalStepsCard}>
          <View style={styles.stepsRow}>
            {HORIZONTAL_STEPS.map((step) => {
              const state = getStepStatus(step.key);
              const isCompleted = state === 'completed';
              const isCurrent = state === 'current';

              return (
                <View key={step.key} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepIconCircle,
                      isCompleted && styles.stepIconCircleCompleted,
                      isCurrent && styles.stepIconCircleCurrent,
                    ]}
                  >
                    <Ionicons
                      name={step.icon as any}
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text
                    style={[
                      styles.stepItemLabel,
                      isCurrent && styles.stepItemLabelCurrent,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Delivery Partner Card */}
        {order.riderId || order.riderName ? (
          <View style={styles.deliveryPartnerCard}>
            <View style={styles.riderAvatarCircle}>
              <Text style={styles.riderAvatarLetter}>
                {(order.riderName || 'R')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.deliveryPartnerTitle}>{order.riderName || 'Delivery Partner'}</Text>
                <View style={styles.starBadgeChip}>
                  <FontAwesome name="star" size={9} color="#D97706" />
                  <Text style={styles.starBadgeText}>4.9</Text>
                </View>
              </View>
              <Text style={styles.riderVehicleSub}>Captain Bro Delivery Fleet • Warangal</Text>
            </View>
            <TouchableOpacity style={styles.greenCallBtn} onPress={callRider}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.riderPendingCard}>
            <Ionicons name="bicycle-outline" size={22} color="#8B0000" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.riderPendingTitle}>Delivery Fleet Assignment</Text>
              <Text style={styles.riderPendingSub}>
                Rider will be dispatched as soon as your fresh cuts are packed.
              </Text>
            </View>
          </View>
        )}

        {/* Live GPS Beacon Indicator from Rider */}
        {Boolean(liveTracking?.coordinates) && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#ECFDF5',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#A7F3D0',
            marginBottom: 12,
            gap: 10,
          }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#065F46' }}>
                Live GPS Signal Active
              </Text>
              <Text style={{ fontSize: 11, color: '#047857', marginTop: 1 }}>
                Rider is en route to your location in Warangal
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Destination Card matching screenshot */}
        <View style={styles.destinationCard}>
          <Text style={styles.destinationCaption}>DELIVERY DESTINATION</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
            <Ionicons name="location-sharp" size={20} color="#DC2626" />
            <Text style={styles.destinationText}>{order.address}</Text>
          </View>
        </View>

        {/* Delivery Schedule Banner */}
        {Boolean(order.deliverySchedule) && (
          <View style={styles.scheduleTrackBanner}>
            <Ionicons name={order.scheduledDate ? 'calendar' : 'flash'} size={18} color="#8B0000" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.scheduleTrackTitle}>
                {order.scheduledDate ? 'Scheduled Delivery Slot' : 'Instant Express Delivery'}
              </Text>
              <Text style={styles.scheduleTrackValue}>{order.deliverySchedule}</Text>
            </View>
          </View>
        )}

        {/* Delivery Instructions / Order Notes */}
        {Boolean(order.notes) && (
          <View style={styles.notesTrackCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="document-text" size={16} color="#8B0000" />
              <Text style={styles.notesTrackTitle}>Delivery Instructions & Notes</Text>
            </View>
            <Text style={styles.notesTrackText}>"{order.notes}"</Text>
          </View>
        )}

        {/* Collapsible Order Items Accordion */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.accordionHeader}
            activeOpacity={0.7}
            onPress={() => setShowItems(!showItems)}
          >
            <Text style={styles.cardTitle}>Order Summary ({order.items.length} items)</Text>
            <Ionicons name={showItems ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
          </TouchableOpacity>

          {showItems && (
            <View style={styles.accordionBody}>
              {order.items.map((item, idx) => (
                <View key={idx} style={styles.itemRowCol}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name} <Text style={{ color: '#6B7280' }}>x {item.quantity}</Text>
                    </Text>
                    <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
                  </View>
                  {(item as any).cuttingType && (
                    <Text style={styles.cuttingTag}>Cut: {(item as any).cuttingType}</Text>
                  )}
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.itemRow}>
                <Text style={styles.grandLabel}>Total Collected</Text>
                <Text style={styles.grandVal}>{formatPrice(order.total)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Cancel Order Button (Active only when order is in pending stage) */}
        {order.status === 'pending' && (
          <View style={styles.cancelOrderBox}>
            <TouchableOpacity
              style={styles.cancelOrderBtn}
              activeOpacity={0.8}
              onPress={handleCancelOrder}
            >
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.cancelOrderBtnText}>Cancel Order</Text>
            </TouchableOpacity>
            <Text style={styles.cancelOrderHint}>
              You can cancel this order while the store has not yet started preparing your items.
            </Text>
          </View>
        )}
      </ScrollView>

      <BottomNavbar activeTab="orders" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 16, paddingBottom: 40 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280' },
  cancelledCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  mapCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  mapSimHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  livePulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', marginRight: 8 },
  liveMapText: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  mapMockRoute: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: 10 },
  dashLine: { flex: 1, height: 2, backgroundColor: '#475569', marginHorizontal: 8 },
  riderPinCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B0000', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  mapEtaContainer: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 14, marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  etaLabel: { color: '#94A3B8', fontSize: 13 },
  etaValue: { color: '#38BDF8', fontSize: 18, fontWeight: '800' },
  pinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  pinTitle: { fontSize: 14, fontWeight: '700', color: '#991B1B' },
  pinSub: { fontSize: 12, color: '#B91C1C', marginTop: 2 },
  pinBadge: { backgroundColor: '#8B0000', color: '#FFFFFF', fontSize: 18, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, letterSpacing: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  timelineContainer: { paddingLeft: 4, marginTop: 14 },
  timelineRow: { flexDirection: 'row', marginBottom: 20 },
  timelineLeft: { alignItems: 'center', width: 24, marginRight: 12 },
  stepDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  stepDotCompleted: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  stepDotCurrent: { borderColor: '#8B0000', backgroundColor: '#FEF2F2' },
  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B0000' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 2 },
  timelineLineCompleted: { backgroundColor: '#16A34A' },
  timelineRight: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  stepTitleCurrent: { color: '#8B0000', fontWeight: '800', fontSize: 15 },
  stepTitleCompleted: { color: '#111827' },
  stepDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  riderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  riderAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  riderName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ratingChipText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  riderSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  callBtn: { backgroundColor: '#16A34A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 },
  callBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  prepRow: { flexDirection: 'row', alignItems: 'center' },
  prepIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  prepTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  prepSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionBody: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  itemRowCol: { marginVertical: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  itemName: { fontSize: 14, color: '#374151', flex: 1, fontWeight: '600' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cuttingTag: { fontSize: 11, color: '#8B0000', fontWeight: '700', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  grandLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  grandVal: { fontSize: 16, fontWeight: '800', color: '#8B0000' },
  circleBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartHeaderBtn: { padding: 4 },
  yellowPinCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  pinCaptionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  pinNoticeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  whitePinBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  whitePinBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 1,
  },
  horizontalStepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepIconCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepIconCircleCurrent: {
    backgroundColor: '#8B0000',
  },
  stepItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepItemLabelCurrent: {
    fontWeight: '800',
    color: '#8B0000',
  },
  deliveryPartnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  riderAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderAvatarLetter: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D97706',
  },
  deliveryPartnerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  starBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  starBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  riderVehicleSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
  },
  greenCallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  destinationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  destinationCaption: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  destinationText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  scheduleTrackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  scheduleTrackTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#8B0000',
  },
  scheduleTrackValue: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
    fontWeight: '600',
  },
  notesTrackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesTrackTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B0000',
  },
  notesTrackText: {
    fontSize: 12.5,
    color: '#374151',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  liveMapContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapFrameContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#F8FAFC',
  },
  nativeMapBox: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  cancelOrderBox: {
    marginTop: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  cancelOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  cancelOrderBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14,
  },
  cancelOrderHint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  riderPendingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  riderPendingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  riderPendingSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
});

// Swiggy Style Light Grid Live Map Component
function SwiggyLiveMap({
  order,
  etaText,
  liveTracking,
}: {
  order: OrderData;
  etaText: string;
  liveTracking?: OrderTrackingData | null;
}) {
  const getProgress = (st?: string) => {
    switch (st?.toLowerCase()) {
      case 'pending': return 0.05;
      case 'accepted': return 0.15;
      case 'preparing': return 0.40;
      case 'out_for_delivery':
      case 'dispatched': return 0.75;
      case 'delivered': return 1.0;
      default: return 0.50;
    }
  };

  const progress = getProgress(order.status);

  // Coordinates
  const kitchenLat = 17.9700;
  const kitchenLng = 79.6000;
  const userLat = 17.9823;
  const userLng = 79.5989;

  // Use real rider coordinates if active, otherwise interpolate
  const currentLat = liveTracking?.coordinates?.latitude
    ?? (kitchenLat + (userLat - kitchenLat) * progress);
  const currentLng = liveTracking?.coordinates?.longitude
    ?? (kitchenLng + (userLng - kitchenLng) * progress);

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body { height: 100%; margin: 0; padding: 0; background: #f8fafc; }
        #map { width: 100%; height: 100%; }
        .store-pin-label {
          background: none;
          border: none;
          box-shadow: none;
          color: #374151;
          font-weight: 700;
          font-size: 11px;
          font-family: sans-serif;
          white-space: nowrap;
        }
        .rider-marker {
          background: #8B0000;
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          color: #FFFFFF;
          text-align: center;
          line-height: 28px;
          font-size: 16px;
          box-shadow: 0 0 12px rgba(139,0,0,0.6);
        }
        .store-red-dot {
          background: #8B0000;
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(139,0,0,0.5);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', { zoomControl: false }).setView([${(kitchenLat + userLat) / 2}, ${(kitchenLng + userLng) / 2}], 14);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(map);

        // Dashed Red Route Line
        const route = L.polyline([
          [${kitchenLat}, ${kitchenLng}],
          [${userLat}, ${userLng}]
        ], { color: '#8B0000', weight: 4, opacity: 0.9, dashArray: '6, 6' }).addTo(map);

        // Chowrasta Store Pin
        L.marker([${kitchenLat}, ${kitchenLng}], {
          icon: L.divIcon({ className: 'store-red-dot', iconSize: [18, 18] })
        }).addTo(map).bindTooltip("Chowrasta Store", { permanent: true, direction: "bottom", className: "store-pin-label" });

        // Rider Live Position
        const riderSvg = '<div style="background:#8B0000;width:32px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid #fff;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>';
        L.marker([${currentLat}, ${currentLng}], {
          icon: L.divIcon({ className: 'rider-marker', html: riderSvg, iconSize: [32, 32], iconAnchor: [16, 16] })
        }).addTo(map);

        map.fitBounds(route.getBounds(), { padding: [30, 30] });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.liveMapContainer}>
      <View style={styles.mapFrameContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={leafletHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Chowrasta Store Map"
          />
        ) : (
          <View style={styles.nativeMapBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 12, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>Chowrasta Store Fleet Route</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#8B0000' }}>{etaText}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="storefront" size={24} color="#8B0000" />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 2 }}>Store</Text>
              </View>
              <View style={{ flex: 1, height: 4, backgroundColor: '#FEE2E2', marginHorizontal: 8, borderRadius: 2, position: 'relative', justifyContent: 'center' }}>
                <View style={{ width: `${Math.round(progress * 100)}%`, height: 4, backgroundColor: '#8B0000', borderRadius: 2 }} />
                <View style={{ position: 'absolute', left: `${Math.max(5, Math.min(90, Math.round(progress * 100)))}%`, transform: [{ translateX: -12 }], backgroundColor: '#8B0000', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3 }}>
                  <Ionicons name="bicycle" size={14} color="#FFFFFF" />
                </View>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="location" size={24} color="#10B981" />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280', marginTop: 2 }}>You</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
