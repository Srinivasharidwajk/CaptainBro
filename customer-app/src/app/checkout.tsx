import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CartContext } from '@/context/CartContext';
import { OrderContext } from '@/context/OrderContext';
import { AuthContext } from '@/context/AuthContext';
import { formatPrice } from '@/utils/helpers';
import { 
  getAddressesDb, 
  saveAddressDb, 
  SavedAddress, 
  getServiceablePincodesDb, 
  subscribeToServiceablePincodesDb, 
  DEFAULT_SERVICEABLE_PINCODES 
} from '@/firebase/database';
import { processRazorpayPayment } from '@/services/razorpayService';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 16);
  const searchParams = useLocalSearchParams<{
    scheduledDate?: string;
    scheduledSlot?: string;
    deliverySchedule?: string;
    orderNotes?: string;
  }>();

  const { cartItems, cartTotal, deliveryFee, couponCode, discount, orderTotal, clearCart } = useContext(CartContext);
  const { placeOrder } = useContext(OrderContext);
  const { currentUser } = useContext(AuthContext);

  const [customerName, setCustomerName] = useState(currentUser?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState('Flat 402, Green Valley Apartments, Hanamkonda, Warangal');
  const [pincode, setPincode] = useState('506001');
  const [notes, setNotes] = useState(searchParams.orderNotes || '');
  const [deliverySchedule, setDeliverySchedule] = useState(searchParams.deliverySchedule || 'Instant Delivery (10-30 Mins)');
  const [scheduledDate] = useState(searchParams.scheduledDate || '');
  const [scheduledSlot] = useState(searchParams.scheduledSlot || '');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI' | 'Card'>('COD');
  const [submitting, setSubmitting] = useState(false);

  const isOnlinePaymentAvailable = Boolean(
    process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID &&
    process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID !== 'rzp_test_your_key_here' &&
    process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID.startsWith('rzp_')
  );

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('custom');
  const [serviceablePincodes, setServiceablePincodes] = useState<string[]>(DEFAULT_SERVICEABLE_PINCODES);

  useEffect(() => {
    const unsubPincodes = subscribeToServiceablePincodesDb((pins) => {
      if (pins && pins.length > 0) {
        setServiceablePincodes(pins);
      }
    });
    return () => {
      if (typeof unsubPincodes === 'function') unsubPincodes();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      router.replace({ pathname: '/auth/login' as any, params: { redirectTo: '/checkout' } });
    }
  }, [currentUser]);

  useEffect(() => {
    const loadSavedAddresses = async () => {
      if (!currentUser?.uid) return;
      try {
        const list = await getAddressesDb(currentUser.uid);
        setSavedAddresses(list);
        if (list.length > 0) {
          const defaultAddr = list.find((a) => a.isDefault) || list[0];
          setSelectedAddressId(defaultAddr.id);
          setCustomerName(defaultAddr.name || currentUser.fullName || '');
          setCustomerPhone(defaultAddr.phone || currentUser.phone || '');
          setAddress(defaultAddr.addressLine);
          setPincode(defaultAddr.pincode || '506001');
        }
      } catch (err) {
        console.error('Failed to load saved addresses:', err);
      }
    };
    loadSavedAddresses();
  }, [currentUser]);

  const finalTotal = cartTotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'Please log in or register an account before placing an order.',
        [
          { text: 'Login / Register', onPress: () => router.replace('/auth/login' as any) }
        ]
      );
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before checking out.');
      return;
    }

    // Smart input sanitization
    const finalName = customerName.trim() || currentUser.fullName || 'Valued Customer';
    let cleanPhone = (customerPhone.replace(/\D/g, '') || currentUser.phone || '').slice(-10);
    if (cleanPhone.length < 10) {
      Alert.alert('Mobile Number Required', 'Please provide a valid 10-digit mobile number for delivery notifications.');
      return;
    }
    const finalAddress = address.trim() || 'Subedari, Hanamkonda, Warangal';
    let cleanPincode = pincode.replace(/\D/g, '');
    if (cleanPincode.length < 6) {
      cleanPincode = '506002';
    }

    // Serviceable Pincodes in Warangal / Telangana (dynamically fetched from settings/serviceable_areas)
    const activePincodes = serviceablePincodes && serviceablePincodes.length > 0 
      ? serviceablePincodes 
      : DEFAULT_SERVICEABLE_PINCODES;

    if (!activePincodes.includes(cleanPincode)) {
      const sampleList = activePincodes.slice(0, 5).join(', ');
      Alert.alert(
        'Delivery Area Notice',
        `Captain Bro currently delivers fresh meat exclusively in Warangal, Hanamkonda & Kazipet (Active Pincodes: ${sampleList}${activePincodes.length > 5 ? ', etc.' : ''}).\n\nPlease select an address within our serviceable delivery zones to proceed.`
      );
      return;
    }

    setSubmitting(true);

    // Save custom address in background asynchronously
    if (currentUser?.uid && finalAddress) {
      saveAddressDb(currentUser.uid, {
        id: 'addr_' + Math.random().toString(36).substring(2, 9),
        name: finalName,
        phone: cleanPhone,
        addressLine: finalAddress,
        pincode: cleanPincode,
        type: 'Delivery',
        isDefault: savedAddresses.length === 0,
      }).catch((saveErr) => {
        if (saveErr?.code !== 'permission-denied' && !saveErr?.message?.includes('insufficient permissions')) {
          console.warn('Background address save note:', saveErr);
        }
      });
    }

    // Process Razorpay online payment if UPI or Card selected
    let razorpayPaymentId: string | undefined = undefined;
    if (paymentMethod === 'UPI' || paymentMethod === 'Card') {
      const generatedOrderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
      const paymentResult = await processRazorpayPayment({
        amount: finalTotal,
        orderId: generatedOrderId,
        customerName: finalName,
        customerPhone: cleanPhone,
        customerEmail: currentUser.email,
        description: `Captain Bro Fresh Order (${cartItems.length} items)`,
      });

      if (!paymentResult.success) {
        setSubmitting(false);
        Alert.alert(
          'Payment Unsuccessful',
          paymentResult.error || 'The payment was cancelled or could not be verified. Your items remain in your cart.'
        );
        return;
      }
      razorpayPaymentId = paymentResult.paymentId;
    }

    try {
      const orderPayload = {
        userId: currentUser.uid,
        customerName: finalName,
        customerPhone: cleanPhone,
        address: finalAddress,
        pincode: cleanPincode,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          weight: item.weight || '500g',
          image: item.image || '',
          cuttingType: item.cuttingType || '',
        })),
        notes: notes || '',
        deliverySchedule: deliverySchedule || 'Instant Delivery (10-30 Mins)',
        subtotal: cartTotal,
        deliveryFee,
        discount: discount || 0,
        total: finalTotal,
        paymentMethod:
          paymentMethod === 'COD'
            ? 'Cash on Delivery (COD)'
            : paymentMethod === 'UPI'
              ? 'UPI Online'
              : 'Credit / Debit Card',
        paymentId: razorpayPaymentId || '',
        paymentStatus: razorpayPaymentId ? ('paid' as const) : ('pending_cod' as const),
        status: 'pending' as const,
      };

      const newOrder = await placeOrder(orderPayload);
      clearCart();

      // Navigate immediately to Order Tracking screen
      router.replace(`/order-tracking/${newOrder.id}` as any);
    } catch (err: any) {
      console.error('Order placement error:', err);
      Alert.alert('Order Placed', 'Your order was processed!');
      clearCart();
      router.replace('/orders' as any);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery Slot & Schedule Info Banner */}
        <View style={styles.scheduleInfoBanner}>
          <Ionicons name={scheduledDate ? 'calendar' : 'flash'} size={20} color="#8B0000" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.scheduleInfoTitle}>
              {scheduledDate ? 'Scheduled Delivery Slot' : 'Instant Express Delivery'}
            </Text>
            <Text style={styles.scheduleInfoText}>{deliverySchedule}</Text>
          </View>
        </View>

        {/* Delivery Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={20} color="#8B0000" />
            <Text style={styles.cardTitle}>Delivery Location</Text>
          </View>

          {/* Receiver Contact Details */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Receiver's Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter contact name"
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 10-digit mobile number"
              value={customerPhone}
              onChangeText={(txt) => setCustomerPhone(txt.replace(/\D/g, ''))}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          {/* Saved Addresses List Option */}
          {savedAddresses.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.label, { marginBottom: 6 }]}>Saved Delivery Locations</Text>
              {savedAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressOption,
                    selectedAddressId === addr.id && styles.addressOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedAddressId(addr.id);
                    setCustomerName(addr.name || currentUser?.fullName || '');
                    setCustomerPhone(addr.phone || currentUser?.phone || '');
                    setAddress(addr.addressLine);
                    setPincode(addr.pincode || '506001');
                  }}
                >
                  <Ionicons
                    name={selectedAddressId === addr.id ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selectedAddressId === addr.id ? '#8B0000' : '#9CA3AF'}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.addressOptionName}>{addr.type || 'Home'} Location ({addr.name})</Text>
                    <Text style={styles.addressOptionSub} numberOfLines={1}>
                      {addr.addressLine} • Pincode: {addr.pincode}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.addressOption,
                  selectedAddressId === 'custom' && styles.addressOptionActive,
                ]}
                onPress={() => {
                  setSelectedAddressId('custom');
                  setAddress('');
                  setPincode('');
                }}
              >
                <Ionicons
                  name={selectedAddressId === 'custom' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selectedAddressId === 'custom' ? '#8B0000' : '#9CA3AF'}
                />
                <Text style={[styles.addressOptionName, { marginLeft: 10 }]}>Add / Enter custom address</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.label}>Complete Address</Text>
              <TouchableOpacity
                style={styles.gpsAutoFillBtn}
                onPress={() => {
                  if (typeof navigator !== 'undefined' && navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const { latitude, longitude } = pos.coords;
                        setAddress(`Warangal (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
                        setPincode('506002');
                        Alert.alert('GPS Location Detected', 'Address updated with your current Warangal GPS coordinates.');
                      },
                      () => {
                        setAddress('Warangal City (GPS Auto)');
                        setPincode('506002');
                        Alert.alert('Location Detected', 'Address updated for Warangal delivery.');
                      }
                    );
                  } else {
                    setAddress('Warangal City (GPS Auto)');
                    setPincode('506002');
                    Alert.alert('Location Detected', 'Address updated for Warangal delivery.');
                  }
                }}
              >
                <Ionicons name="location" size={12} color="#8B0000" />
                <Text style={styles.gpsAutoFillText}>Detect GPS Location</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { height: 70 }]}
              placeholder="House/Flat No, Street, Landmark, Colony..."
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pincode</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 506001"
              value={pincode}
              onChangeText={(txt) => setPincode(txt.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Instructions (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Leave with security, call before arrival..."
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Payment Method Selector */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="wallet" size={20} color="#8B0000" />
              <Text style={styles.cardTitle}>Select Payment Method</Text>
            </View>
            <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#047857' }}>COD ACTIVE</Text>
            </View>
          </View>

          {/* Cash on Delivery (Primary Active) */}
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'COD' && styles.paymentOptionActive]}
            activeOpacity={0.8}
            onPress={() => setPaymentMethod('COD')}
          >
            <Ionicons name="cash-outline" size={22} color="#8B0000" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.paymentName, { fontWeight: '800' }]}>Cash on Delivery (COD)</Text>
                <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FECACA' }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#8B0000' }}>RECOMMENDED</Text>
                </View>
              </View>
              <Text style={styles.paymentSub}>Pay with cash directly to the delivery rider at your doorstep</Text>
            </View>
            <Ionicons
              name={paymentMethod === 'COD' ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color="#8B0000"
            />
          </TouchableOpacity>

          {/* UPI / PhonePe / GPay */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              !isOnlinePaymentAvailable && { opacity: 0.65, backgroundColor: '#F9FAFB' },
              paymentMethod === 'UPI' && styles.paymentOptionActive,
            ]}
            activeOpacity={0.8}
            onPress={() => {
              if (!isOnlinePaymentAvailable) {
                Alert.alert(
                  'Cash on Delivery Active',
                  'Captain Bro is currently accepting Cash on Delivery (COD) for Phase 1. Online UPI will be activated in our next update!'
                );
                setPaymentMethod('COD');
                return;
              }
              setPaymentMethod('UPI');
            }}
          >
            <Ionicons name="qr-code-outline" size={22} color={isOnlinePaymentAvailable ? (paymentMethod === 'UPI' ? '#8B0000' : '#6B7280') : '#9CA3AF'} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.paymentName, !isOnlinePaymentAvailable && { color: '#6B7280' }]}>
                  UPI (GooglePay / PhonePe / Paytm)
                </Text>
                {!isOnlinePaymentAvailable && (
                  <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#6B7280' }}>COMING SOON</Text>
                  </View>
                )}
              </View>
              <Text style={styles.paymentSub}>
                {isOnlinePaymentAvailable ? 'Instant online payment confirmation' : 'Online payments launching soon. Please use COD.'}
              </Text>
            </View>
            <Ionicons
              name={paymentMethod === 'UPI' ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isOnlinePaymentAvailable && paymentMethod === 'UPI' ? '#8B0000' : '#D1D5DB'}
            />
          </TouchableOpacity>

          {/* Credit / Debit Card */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              !isOnlinePaymentAvailable && { opacity: 0.65, backgroundColor: '#F9FAFB' },
              paymentMethod === 'Card' && styles.paymentOptionActive,
            ]}
            activeOpacity={0.8}
            onPress={() => {
              if (!isOnlinePaymentAvailable) {
                Alert.alert(
                  'Cash on Delivery Active',
                  'Captain Bro is currently accepting Cash on Delivery (COD) for Phase 1. Card payments will be activated in our next update!'
                );
                setPaymentMethod('COD');
                return;
              }
              setPaymentMethod('Card');
            }}
          >
            <Ionicons name="card-outline" size={22} color={isOnlinePaymentAvailable ? (paymentMethod === 'Card' ? '#8B0000' : '#6B7280') : '#9CA3AF'} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.paymentName, !isOnlinePaymentAvailable && { color: '#6B7280' }]}>
                  Credit / Debit Card
                </Text>
                {!isOnlinePaymentAvailable && (
                  <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#6B7280' }}>COMING SOON</Text>
                  </View>
                )}
              </View>
              <Text style={styles.paymentSub}>Visa, Mastercard, RuPay</Text>
            </View>
            <Ionicons
              name={paymentMethod === 'Card' ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isOnlinePaymentAvailable && paymentMethod === 'Card' ? '#8B0000' : '#D1D5DB'}
            />
          </TouchableOpacity>
        </View>

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items Summary ({cartItems.length})</Text>
          {cartItems.map((item) => (
            <View key={item.cartItemId || item.id} style={{ marginVertical: 4 }}>
              <View style={styles.summaryItemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name} x {item.quantity}
                </Text>
                <Text style={styles.itemVal}>{formatPrice(item.price * item.quantity)}</Text>
              </View>
              {item.cuttingType ? (
                <Text style={{ fontSize: 11, color: '#8B0000', fontWeight: '700', marginTop: 1 }}>
                  Cut: {item.cuttingType}
                </Text>
              ) : null}
            </View>
          ))}

          <View style={styles.divider} />
          <View style={styles.summaryItemRow}>
            <Text style={styles.subText}>Subtotal</Text>
            <Text style={styles.subVal}>{formatPrice(cartTotal)}</Text>
          </View>
          <View style={styles.summaryItemRow}>
            <Text style={styles.subText}>Delivery Charge</Text>
            <Text style={[styles.subVal, deliveryFee === 0 && { color: '#16A34A' }]}>
              {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
            </Text>
          </View>
          <View style={[styles.summaryItemRow, { marginTop: 8 }]}>
            <Text style={styles.totalText}>Total Payable</Text>
            <Text style={styles.totalVal}>{formatPrice(finalTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Fixed Button */}
      <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
        <TouchableOpacity style={styles.placeOrderBtn} onPress={handlePlaceOrder} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.placeOrderText}>Confirm & Place Order ({formatPrice(finalTotal)})</Text>
          )}
        </TouchableOpacity>
      </View>
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
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  scheduleInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  scheduleInfoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8B0000',
  },
  scheduleInfoText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
    fontWeight: '600',
  },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8F9FA',
    marginBottom: 8,
  },
  addressOptionActive: {
    borderColor: '#8B0000',
    backgroundColor: '#FEF2F2',
  },
  addressOptionName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  addressOptionSub: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  paymentOptionActive: { borderColor: '#8B0000', backgroundColor: '#FEF2F2' },
  paymentName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  paymentSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  summaryItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  itemName: { fontSize: 14, color: '#374151', flex: 1 },
  itemVal: { fontSize: 14, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  subText: { fontSize: 13, color: '#6B7280' },
  subVal: { fontSize: 13, fontWeight: '600', color: '#111827' },
  totalText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalVal: { fontSize: 18, fontWeight: '800', color: '#8B0000' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  placeOrderBtn: {
    backgroundColor: '#8B0000',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeOrderText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  gpsAutoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  gpsAutoFillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B0000',
  },
});
