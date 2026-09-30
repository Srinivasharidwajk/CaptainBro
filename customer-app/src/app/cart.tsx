import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNavbar from '@/components/BottomNavbar';
import { CartContext } from '@/context/CartContext';
import { AuthContext } from '@/context/AuthContext';
import { formatPrice, formatWeight } from '@/utils/helpers';

// Core UI Branding Assets
const LOCAL_IMAGES: Record<string, any> = {
  'fooditems.png': require('../../assets/images/fooditems.png'),
  'captain-bro-logo.png': require('../../assets/images/captain-bro-logo.png'),
};

const DEFAULT_FALLBACK_IMG = { uri: 'https://ik.imagekit.io/uuwqngqjh/New%20Folder/captainbroimages/ChatGPT%20Image%20Aug%2024%202026%2003_51_27%20P-100kb.jpg' };

const getImageUrl = (imageName?: any) => {
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

const generateNext9Days = () => {
  const days: { dayLabel: string; dateLabel: string; fullDateString: string }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 9; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);

    let dayLabel = dayNames[d.getDay()];
    if (i === 0) dayLabel = 'Today';
    else if (i === 1) dayLabel = 'Tomorrow';

    const dateNum = String(d.getDate()).padStart(2, '0');
    const month = monthNames[d.getMonth()];
    const dateLabel = `${dateNum} ${month}`;
    const fullDateString = `${dayLabel}, ${dateNum} ${month}`;

    days.push({ dayLabel, dateLabel, fullDateString });
  }
  return days;
};

const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', time: '07:00 AM - 11:00 AM', icon: 'sunny-outline' },
  { id: 'afternoon', label: 'Afternoon', time: '12:00 PM - 04:00 PM', icon: 'partly-sunny-outline' },
  { id: 'evening', label: 'Evening', time: '05:00 PM - 09:00 PM', icon: 'moon-outline' },
];

export default function CartScreen() {
  const router = useRouter();
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal, deliveryFee } = useContext(CartContext);
  const { currentUser } = useContext(AuthContext);

  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  // Delivery Scheduling State
  const [isScheduled, setIsScheduled] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState('morning');
  const [orderNotes, setOrderNotes] = useState('');

  const next9Days = generateNext9Days();

  const handleProceedToCheckout = () => {
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'Please enter your mobile number to complete checkout.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login with OTP',
            onPress: () =>
              router.push({
                pathname: '/auth/login' as any,
                params: { redirectTo: '/checkout' },
              }),
          },
        ]
      );
      return;
    }

    const chosenSchedule = isScheduled
      ? `${next9Days[selectedDayIndex]?.fullDateString} • ${TIME_SLOTS.find(s => s.id === selectedSlotId)?.label} (${TIME_SLOTS.find(s => s.id === selectedSlotId)?.time})`
      : 'Instant Delivery (10-30 Mins)';

    router.push({
      pathname: '/checkout',
      params: {
        scheduledDate: isScheduled ? next9Days[selectedDayIndex]?.fullDateString : '',
        scheduledSlot: isScheduled ? `${TIME_SLOTS.find(s => s.id === selectedSlotId)?.label} (${TIME_SLOTS.find(s => s.id === selectedSlotId)?.time})` : '',
        deliverySchedule: chosenSchedule,
        orderNotes: orderNotes.trim(),
      },
    } as any);
  };

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'CAPTAIN50') {
      setDiscount(50);
      Alert.alert('Coupon Applied', '₹50 discount applied successfully!');
    } else {
      Alert.alert('Invalid Coupon', 'Use code CAPTAIN50 for ₹50 OFF');
    }
  };

  const finalTotal = Math.max(0, cartTotal + deliveryFee - discount);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping Cart ({cartItems.length})</Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={styles.clearCartText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {cartItems.length === 0 ? (
          <View style={styles.emptyCartBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="bag-handle-outline" size={40} color="#8B0000" />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySub}>Add fresh meat, produce & groceries to get started.</Text>
            <TouchableOpacity
              style={styles.shopNowBtn}
              onPress={() => router.push('/products' as any)}
            >
              <Text style={styles.shopNowText}>Shop Fresh Items</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Free Delivery Banner */}
            <View style={styles.freeDeliveryBanner}>
              <Ionicons name="flash" size={18} color="#D97706" />
              <Text style={styles.freeDeliveryText}>
                {cartTotal > 300
                  ? ' Congratulations! Free express delivery unlocked.'
                  : ` Add ${formatPrice(301 - cartTotal)} more for FREE delivery`}
              </Text>
            </View>

            {/* Cart Items List */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>Cart Items ({cartItems.length})</Text>
              {cartItems.map((item) => {
                const itemId = item.cartItemId || item.id;
                const itemTotalPrice = (Number(item.price) || 0) * item.quantity;
                return (
                  <View key={itemId} style={styles.cartItemRow}>
                    <Image source={getImageUrl(item.image)} style={styles.itemImage} resizeMode="cover" />

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.cuttingType ? (
                        <View style={styles.cuttingBadge}>
                          <Text style={styles.cuttingBadgeText}>Cut: {item.cuttingType}</Text>
                        </View>
                      ) : null}
                      {item.weight && <Text style={styles.itemWeight}>{formatWeight(item.weight, item.quantity)}</Text>}
                      <Text style={styles.itemPrice}>{formatPrice(itemTotalPrice)}</Text>
                    </View>

                    <View style={styles.qtyControlContainer}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(itemId, Math.max(1, item.quantity - 1))}
                      >
                        <Ionicons name="remove" size={16} color="#111827" />
                      </TouchableOpacity>

                      <Text style={styles.qtyText}>{item.quantity}</Text>

                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(itemId, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={16} color="#8B0000" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromCart(itemId)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Delivery Schedule (9 Days & Morning / Afternoon / Evening) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calendar-outline" size={18} color="#8B0000" />
                  <Text style={styles.sectionHeaderNoMargin}>Delivery Schedule</Text>
                </View>
                {/* Instant vs Schedule Toggle */}
                <View style={styles.scheduleToggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, !isScheduled && styles.toggleBtnActive]}
                    onPress={() => setIsScheduled(false)}
                  >
                    <Ionicons name="flash" size={11} color={!isScheduled ? '#FFFFFF' : '#6B7280'} />
                    <Text style={[styles.toggleBtnText, !isScheduled && styles.toggleBtnTextActive]}>Instant</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, isScheduled && styles.toggleBtnActive]}
                    onPress={() => setIsScheduled(true)}
                  >
                    <Ionicons name="calendar" size={11} color={isScheduled ? '#FFFFFF' : '#6B7280'} />
                    <Text style={[styles.toggleBtnText, isScheduled && styles.toggleBtnTextActive]}>Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isScheduled ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.scheduleSubTitle}>Select Date (Next 9 Days):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
                    {next9Days.map((day, idx) => {
                      const isSelected = selectedDayIndex === idx;
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.dayCard, isSelected && styles.dayCardActive]}
                          onPress={() => setSelectedDayIndex(idx)}
                        >
                          <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>{day.dayLabel}</Text>
                          <Text style={[styles.dayDate, isSelected && styles.dayDateActive]}>{day.dateLabel}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[styles.scheduleSubTitle, { marginTop: 14 }]}>Select Delivery Slot:</Text>
                  <View style={styles.slotsContainer}>
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = selectedSlotId === slot.id;
                      return (
                        <TouchableOpacity
                          key={slot.id}
                          style={[styles.slotCard, isSelected && styles.slotCardActive]}
                          onPress={() => setSelectedSlotId(slot.id)}
                        >
                          <Ionicons
                            name={slot.icon as any}
                            size={18}
                            color={isSelected ? '#8B0000' : '#4B5563'}
                          />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[styles.slotTitle, isSelected && styles.slotTitleActive]}>{slot.label}</Text>
                            <Text style={[styles.slotTime, isSelected && styles.slotTimeActive]}>{slot.time}</Text>
                          </View>
                          {isSelected && <Ionicons name="checkmark-circle" size={18} color="#8B0000" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.scheduleSummaryBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#8B0000" />
                    <Text style={styles.scheduleSummaryText}>
                      Scheduled for: <Text style={{ fontWeight: '800' }}>{next9Days[selectedDayIndex]?.fullDateString}</Text> • <Text style={{ fontWeight: '800' }}>{TIME_SLOTS.find(s => s.id === selectedSlotId)?.label} ({TIME_SLOTS.find(s => s.id === selectedSlotId)?.time})</Text>
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.instantNoticeBox}>
                  <Ionicons name="bicycle" size={20} color="#16A34A" />
                  <Text style={styles.instantNoticeText}>
                    Standard Express Delivery: Your order will be freshly packed and delivered within <Text style={{ fontWeight: '800' }}>10–30 minutes</Text>.
                  </Text>
                </View>
              )}
            </View>

            {/* Delivery Instructions / Order Notes (Text Area input field) */}
            <View style={styles.sectionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="document-text-outline" size={18} color="#8B0000" />
                <Text style={styles.sectionHeaderNoMargin}>Delivery Instructions & Notes</Text>
              </View>

              <TextInput
                style={styles.notesTextArea}
                placeholder="Add special instructions for delivery, landmark, cutting preferences, or doorbell notes..."
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={3}
                value={orderNotes}
                onChangeText={setOrderNotes}
                textAlignVertical="top"
              />

              {/* Quick suggestion chips */}
              <View style={styles.quickChipsRow}>
                {['Ring doorbell', 'Leave at door', 'Call on arrival', 'Do not ring bell'].map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={styles.quickChip}
                    onPress={() => {
                      setOrderNotes((prev) => (prev ? `${prev}, ${chip}` : chip));
                    }}
                  >
                    <Text style={styles.quickChipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Coupon Code Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>Promo Code / Offers</Text>
              <View style={styles.couponRow}>
                <Ionicons name="pricetag-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.couponInput}
                  placeholder="Try CAPTAIN50"
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.applyBtn} onPress={applyCoupon}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Price Summary / Bill Details */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>Bill Details</Text>

              {/* List of Products & Prices in Bill Details */}
              <View style={styles.billProductList}>
                {cartItems.map((item) => {
                  const itemId = item.cartItemId || item.id;
                  const itemTotalPrice = (Number(item.price) || 0) * item.quantity;
                  const displayWeight = formatWeight(item.weight, item.quantity);
                  return (
                    <View key={itemId} style={styles.billProductRow}>
                      <Text style={styles.billProductName} numberOfLines={1}>
                        {item.name} {displayWeight ? `(${displayWeight})` : ''} <Text style={styles.billProductQty}>x {item.quantity}</Text>
                      </Text>
                      <Text style={styles.billProductPrice}>{formatPrice(itemTotalPrice)}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.billDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Item Subtotal</Text>
                <Text style={styles.summaryValue}>{formatPrice(cartTotal)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Charge</Text>
                <Text style={[styles.summaryValue, deliveryFee === 0 && { color: '#16A34A' }]}>
                  {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                </Text>
              </View>

              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount Coupon</Text>
                  <Text style={[styles.summaryValue, { color: '#16A34A' }]}>-{formatPrice(discount)}</Text>
                </View>
              )}

              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>{formatPrice(finalTotal)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Fixed Bottom Checkout Bar */}
      {cartItems.length > 0 && (
        <View style={styles.bottomCheckoutBar}>
          <View>
            <Text style={styles.bottomTotalLabel}>Total Amount</Text>
            <Text style={styles.bottomTotalVal}>{formatPrice(finalTotal)}</Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={handleProceedToCheckout}
          >
            <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <BottomNavbar activeTab="cart" />
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
  clearCartText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 16, paddingBottom: 120 },
  emptyCartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  shopNowBtn: {
    backgroundColor: '#8B0000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  shopNowText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  freeDeliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  freeDeliveryText: { fontSize: 13, fontWeight: '600', color: '#92400E', flex: 1 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sectionHeaderNoMargin: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scheduleToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#8B0000',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  scheduleSubTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  daysScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  dayCard: {
    width: 68,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCardActive: {
    borderColor: '#8B0000',
    backgroundColor: '#FFF5F5',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  dayNameActive: {
    color: '#8B0000',
    fontWeight: '800',
  },
  dayDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  dayDateActive: {
    color: '#8B0000',
    fontWeight: '800',
  },
  slotsContainer: {
    gap: 8,
    marginTop: 4,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  slotCardActive: {
    borderColor: '#8B0000',
    backgroundColor: '#FFF5F5',
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  slotTitleActive: {
    color: '#8B0000',
  },
  slotTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  slotTimeActive: {
    color: '#7F1D1D',
  },
  scheduleSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  scheduleSummaryText: {
    fontSize: 12,
    color: '#991B1B',
    flex: 1,
    lineHeight: 16,
  },
  instantNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  instantNoticeText: {
    fontSize: 12.5,
    color: '#15803D',
    flex: 1,
    lineHeight: 18,
  },
  notesTextArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    fontSize: 13,
    color: '#111827',
    minHeight: 74,
    marginTop: 4,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickChip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickChipText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F9FAFB' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cuttingBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  cuttingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B0000',
  },
  itemWeight: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#8B0000', marginTop: 4 },
  qtyControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyBtn: { padding: 4 },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#111827', marginHorizontal: 8 },
  removeBtn: { marginLeft: 10, padding: 4 },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  couponInput: { flex: 1, fontSize: 14, color: '#111827' },
  applyBtn: { backgroundColor: '#8B0000', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  applyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  summaryLabel: { fontSize: 14, color: '#4B5563' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  billProductList: { marginBottom: 6 },
  billProductRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  billProductName: { fontSize: 13, color: '#374151', flex: 1, marginRight: 8 },
  billProductQty: { fontWeight: '700', color: '#8B0000' },
  billProductPrice: { fontSize: 13, fontWeight: '700', color: '#111827' },
  billDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 8 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: '#8B0000' },
  bottomCheckoutBar: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bottomTotalLabel: { fontSize: 12, color: '#6B7280' },
  bottomTotalVal: { fontSize: 18, fontWeight: '800', color: '#8B0000' },
  checkoutBtn: {
    backgroundColor: '#8B0000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  checkoutBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
