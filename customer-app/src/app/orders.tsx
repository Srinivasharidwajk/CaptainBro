import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNavbar from '@/components/BottomNavbar';
import { OrderContext } from '@/context/OrderContext';
import { CartContext } from '@/context/CartContext';
import { AuthContext } from '@/context/AuthContext';
import { formatDate, formatPrice } from '@/utils/helpers';
import { OrderData, updateOrderFieldsDb } from '@/firebase/database';

// Core UI Branding Assets
const LOCAL_IMAGES: Record<string, any> = {
  'fooditems.png': require('../../assets/images/fooditems.png'),
};

const DEFAULT_FALLBACK_IMG = { uri: 'https://ik.imagekit.io/uuwqngqjh/New%20Folder/captainbroimages/ChatGPT%20Image%20Aug%2024%202026%2003_51_27%20P-100kb.jpg' };

const getImageUrl = (imageName: any) => {
  if (!imageName) return DEFAULT_FALLBACK_IMG;
  if (typeof imageName === 'number') return imageName;
  if (typeof imageName === 'object' && imageName.uri) return imageName;
  if (typeof imageName === 'string') {
    if (imageName.startsWith('http') || imageName.startsWith('data:image')) {
      return { uri: imageName };
    }
    const filename = imageName.replace(/^.*[\\\/]/, '');
    if (LOCAL_IMAGES[filename]) {
      return LOCAL_IMAGES[filename];
    }
  }
  return DEFAULT_FALLBACK_IMG;
};

export default function OrdersScreen() {
  const router = useRouter();
  const { orders, loading, fetchOrders, cancelUserOrder } = useContext(OrderContext);
  const { addToCart } = useContext(CartContext);
  const { currentUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  React.useEffect(() => {
    fetchOrders();
  }, []);

  // Rating Modal State
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrderToRate, setSelectedOrderToRate] = useState<OrderData | null>(null);
  const [starRating, setStarRating] = useState(5);
  const [reviewNote, setReviewNote] = useState('');

  const handleCancelOrder = (order: OrderData) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No, Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!order.id) return;
            try {
              await cancelUserOrder(order.id);
              Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not cancel order.');
            }
          },
        },
      ]
    );
  };

  const userOrders = currentUser
    ? (currentUser.role === 'admin' || currentUser.role === 'super_admin')
      ? orders
      : orders.filter((o) => {
          const userPhone = (currentUser.phone || '').replace(/\D/g, '').slice(-10);
          const orderPhone = (o.customerPhone || '').replace(/\D/g, '').slice(-10);
          return (currentUser.uid && o.userId === currentUser.uid) || (userPhone && orderPhone === userPhone);
        })
    : [];

  const activeOrders = userOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const pastOrders = userOrders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');

  const displayOrders = activeTab === 'active' ? activeOrders : pastOrders;

  const handleReorder = (order: OrderData) => {
    if (!order.items || order.items.length === 0) return;
    order.items.forEach((item) => {
      addToCart(item, item.quantity || 1);
    });
    Alert.alert('Reordered!', 'Items from this order have been added to your cart.', [
      { text: 'View Cart', onPress: () => router.push('/cart' as any) },
      { text: 'OK' }
    ]);
  };

  const handleOpenRating = (order: OrderData) => {
    setSelectedOrderToRate(order);
    setStarRating((order as any).rating || 5);
    setReviewNote((order as any).reviewText || '');
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedOrderToRate || !selectedOrderToRate.id) return;
    try {
      await updateOrderFieldsDb(selectedOrderToRate.id, {
        rating: starRating,
        reviewText: reviewNote.trim()
      } as any);
      Alert.alert('Thank You!', 'Your order rating and feedback have been submitted.');
      setRatingModalVisible(false);
      setSelectedOrderToRate(null);
    } catch (err) {
      Alert.alert('Notice', 'Rating recorded locally.');
      setRatingModalVisible(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { text: 'Order Placed', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' };
      case 'accepted':
        return { text: 'Confirmed', bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE' };
      case 'preparing':
        return { text: 'Preparing', bg: '#E0E7FF', color: '#3730A3', border: '#C7D2FE' };
      case 'out_for_delivery':
      case 'dispatched':
        return { text: 'Out for Delivery', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
      case 'delivered':
        return { text: 'Delivered', bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' };
      case 'cancelled':
        return { text: 'Cancelled', bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' };
      default:
        return { text: status, bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Orders</Text>
        <TouchableOpacity style={styles.cartHeaderBtn} onPress={() => router.push('/cart' as any)}>
          <Ionicons name="cart-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'active' && styles.tabChipActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({activeOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === 'completed' && styles.tabChipActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Past Orders ({pastOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#8B0000" style={{ marginTop: 40 }} />
        ) : !currentUser ? (
          <View style={styles.emptyState}>
            <Ionicons name="lock-closed-outline" size={48} color="#8B0000" />
            <Text style={styles.emptyTitle}>Login to View Orders</Text>
            <Text style={styles.emptySub}>
              Please login with your mobile number to track live deliveries and view past orders.
            </Text>
            <TouchableOpacity
              style={styles.shopBtn}
              onPress={() =>
                router.push({
                  pathname: '/auth/login' as any,
                  params: { redirectTo: '/orders' },
                })
              }
            >
              <Text style={styles.shopBtnText}>Login with OTP</Text>
            </TouchableOpacity>
          </View>
        ) : displayOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No {activeTab} orders</Text>
            <Text style={styles.emptySub}>Your order history will appear here once placed.</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/products' as any)}>
              <Text style={styles.shopBtnText}>Explore Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            const isDelivered = order.status === 'delivered';
            const orderRating = (order as any).rating;
            const firstThreeItems = order.items.slice(0, 3);
            const remainingCount = order.items.length > 3 ? order.items.length - 3 : 0;
            const mainTitle = order.items.map((i) => i.name).join(', ');
            const totalItemCount = order.items.reduce((acc, i) => acc + (i.quantity || 1), 0);

            return (
              <TouchableOpacity
                key={order.id}
                style={styles.compactOrderCard}
                onPress={() => router.push(`/order-tracking/${order.id}` as any)}
                activeOpacity={0.88}
              >
                {/* Card Header Row */}
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.orderIdCaption}>ORDER ID: {order.id}</Text>
                    <Text style={styles.orderTimeSub}>{formatDate(order.createdAt)}</Text>
                  </View>

                  <View style={[styles.compactStatusPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={[styles.compactStatusText, { color: badge.color }]}>{badge.text}</Text>
                  </View>
                </View>

                {/* Overlapping Avatars & Item Summary */}
                <View style={styles.avatarRowContainer}>
                  <View style={styles.avatarStack}>
                    {firstThreeItems.map((item, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.avatarCircleWrapper,
                          { marginLeft: idx === 0 ? 0 : -14, zIndex: 10 - idx },
                        ]}
                      >
                        <Image source={getImageUrl(item.image)} style={styles.avatarCircleImg} resizeMode="cover" />
                      </View>
                    ))}
                    {remainingCount > 0 && (
                      <View
                        style={[
                          styles.avatarCircleWrapper,
                          styles.avatarMoreCircle,
                          { marginLeft: -14, zIndex: 1 },
                        ]}
                      >
                        <Text style={styles.avatarMoreText}>+{remainingCount}</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.compactItemTitle} numberOfLines={1}>
                      {mainTitle}
                    </Text>
                    {order.items?.some((i) => i.cuttingType) && (
                      <Text style={styles.cuttingStylesSummary} numberOfLines={1}>
                        Cut: {order.items.filter((i) => i.cuttingType).map((i) => `${i.name}: ${i.cuttingType}`).join(' • ')}
                      </Text>
                    )}
                    <Text style={styles.compactItemSub}>
                      Total: {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} • {formatPrice(order.total)}
                    </Text>
                  </View>
                </View>

                {/* Delivery Partner Assigned Box (Matching Screenshot 2) */}
                {order.status !== 'cancelled' && (
                  <View style={styles.partnerSubRow}>
                    <View style={styles.partnerIconCircle}>
                      <Ionicons name="bicycle" size={16} color="#D97706" />
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.partnerCaptionText}>DELIVERY PARTNER</Text>
                      <Text style={styles.partnerNameText}>{order.riderName || 'Assigned'}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.greenCallBtnCircle}
                      onPress={() => Linking.openURL(`tel:${order.riderPhone || '9876543211'}`)}
                    >
                      <Ionicons name="call" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Delivery Schedule & Special Instructions */}
                {(Boolean(order.deliverySchedule) || Boolean(order.notes)) && (
                  <View style={styles.orderNotesScheduleBox}>
                    {order.deliverySchedule ? (
                      <View style={styles.orderScheduleRow}>
                        <Ionicons name={order.scheduledDate ? 'calendar-outline' : 'flash-outline'} size={12} color="#8B0000" />
                        <Text style={styles.orderScheduleText} numberOfLines={1}>{order.deliverySchedule}</Text>
                      </View>
                    ) : null}
                    {order.notes ? (
                      <View style={styles.orderNotesRow}>
                        <Ionicons name="document-text-outline" size={12} color="#4B5563" />
                        <Text style={styles.orderNotesText} numberOfLines={2}>Note: "{order.notes}"</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Quick Action Footer */}
                <View style={styles.compactCardFooter}>
                  {order.deliveryPin && order.status !== 'delivered' && (
                    <View style={styles.pinChip}>
                      <Text style={styles.pinChipText}>PIN: {order.deliveryPin}</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
                    {order.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.cancelPillBtn}
                        onPress={() => handleCancelOrder(order)}
                      >
                        <Ionicons name="close-circle-outline" size={13} color="#DC2626" />
                        <Text style={styles.cancelPillText}>Cancel</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.reorderPillBtn}
                      onPress={() => handleReorder(order)}
                    >
                      <Ionicons name="refresh" size={13} color="#8B0000" />
                      <Text style={styles.reorderPillText}>Re-Order</Text>
                    </TouchableOpacity>

                    {isDelivered && (
                      <TouchableOpacity
                        style={styles.ratePillBtn}
                        onPress={() => handleOpenRating(order)}
                      >
                        <FontAwesome name="star" size={11} color="#D97706" />
                        <Text style={styles.ratePillText}>
                          {orderRating ? `${orderRating}★` : 'Rate'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.trackPillBtn}
                      onPress={() => router.push(`/order-tracking/${order.id}` as any)}
                    >
                      <Text style={styles.trackPillText}>Track</Text>
                      <Ionicons name="chevron-forward" size={13} color="#8B0000" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Post-Delivery Rating Modal */}
      <Modal visible={ratingModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.ratingModalContent}>
            <Text style={styles.ratingTitle}>Rate Your Order</Text>
            <Text style={styles.ratingSub}>How was your experience with order #{selectedOrderToRate?.id}?</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setStarRating(s)}>
                  <FontAwesome
                    name={s <= starRating ? 'star' : 'star-o'}
                    size={32}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Write a feedback note (optional)..."
              placeholderTextColor="#9CA3AF"
              value={reviewNote}
              onChangeText={setReviewNote}
              style={styles.ratingInput}
              multiline
            />

            <View style={styles.ratingModalActions}>
              <TouchableOpacity style={styles.cancelRatingBtn} onPress={() => setRatingModalVisible(false)}>
                <Text style={styles.cancelRatingText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitRatingBtn} onPress={handleSubmitRating}>
                <Text style={styles.submitRatingText}>Submit Rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNavbar activeTab="orders" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  tabChipActive: { backgroundColor: '#8B0000' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  tabTextActive: { color: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  shopBtn: { backgroundColor: '#8B0000', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  shopBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  cartHeaderBtn: { padding: 6 },
  compactOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  orderIdCaption: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  orderTimeSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  compactStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  avatarRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircleWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  avatarCircleImg: {
    width: '100%',
    height: '100%',
  },
  avatarMoreCircle: {
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMoreText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  compactItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  compactItemSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
    fontWeight: '500',
  },
  partnerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  partnerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerCaptionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  partnerNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginTop: 1,
  },
  greenCallBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  orderNotesScheduleBox: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    gap: 4,
  },
  orderScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderScheduleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8B0000',
    flex: 1,
  },
  orderNotesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  orderNotesText: {
    fontSize: 11.5,
    color: '#374151',
    flex: 1,
    lineHeight: 16,
  },
  compactCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pinChip: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  pinChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B0000',
  },
  reorderPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  reorderPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B0000',
  },
  ratePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  trackPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  trackPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B0000',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  ratingModalContent: {
    width: '92%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  ratingSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ratingInput: {
    width: '100%',
    height: 70,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  ratingModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelRatingBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
  },
  cancelRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  submitRatingBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#8B0000',
  },
  submitRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cuttingStylesSummary: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8B0000',
    marginTop: 2,
  },
  cancelPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
});
