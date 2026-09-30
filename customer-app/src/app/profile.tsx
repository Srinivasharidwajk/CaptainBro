import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNavbar from '@/components/BottomNavbar';
import { AuthContext } from '@/context/AuthContext';
import { CartContext } from '@/context/CartContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, logout, deleteAccount } = useContext(AuthContext);
  const { wishlistItems, addToCart } = useContext(CartContext);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to log out from Captain Bro?');
      if (confirmed) {
        logout().then(() => {
          router.replace('/auth/login' as any);
        });
      }
    } else {
      Alert.alert('Logout Account', 'Are you sure you want to log out from Captain Bro?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Logged out', 'You have been logged out successfully.');
            router.replace('/auth/login' as any);
          },
        },
      ]);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Data',
      'Are you sure you want to permanently delete your Captain Bro account?\n\nThis will permanently delete your profile, saved addresses, order history, and personal information. This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue Deletion',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you completely sure? You will be logged out immediately and your account will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Permanently Delete',
                  style: 'destructive',
                  onPress: async () => {
                    const success = await deleteAccount();
                    if (success) {
                      Alert.alert('Account Deleted', 'Your account and personal data have been permanently erased from Captain Bro.');
                      router.replace('/auth/login' as any);
                    } else {
                      Alert.alert('Error', 'Unable to delete account right now. Please check your network connection.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    if (!name) return 'CB';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.headerBar}>
          <Text style={[styles.headerTitle, { marginLeft: 16 }]}>My Profile</Text>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.loginHeroCard}>
            <View style={styles.loginHeroIconBox}>
              <Ionicons name="person-circle-outline" size={68} color="#8B0000" />
            </View>
            <Text style={styles.loginHeroTitle}>Welcome to Captain Bro</Text>
            <Text style={styles.loginHeroSub}>
              Please login with your mobile number to view your profile, track active deliveries, and manage saved addresses.
            </Text>
            <TouchableOpacity
              style={styles.loginHeroBtn}
              activeOpacity={0.88}
              onPress={() =>
                router.push({
                  pathname: '/auth/login' as any,
                  params: { redirectTo: '/profile' },
                })
              }
            >
              <Ionicons name="phone-portrait-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.loginHeroBtnText}>Login with Mobile OTP</Text>
            </TouchableOpacity>
          </View>

          {/* Help & Support Actions */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>HELP & SUPPORT</Text>
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() =>
                  Alert.alert(
                    'Customer Support',
                    'Support Hotline: 1800-425-BRO (276)\nEmail: support@captainbro.com'
                  )
                }
              >
                <Ionicons name="headset-outline" size={20} color="#374151" />
                <Text style={styles.menuLabel}>Call Helpline Support</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuRow}
                onPress={() =>
                  Alert.alert(
                    'About Captain Bro',
                    'Version: 2.1.0\n\nDelivering the highest quality fresh meats, custom homemade pickles, and traditional local groceries right to your doorstep.'
                  )
                }
              >
                <Ionicons name="information-circle-outline" size={20} color="#374151" />
                <Text style={styles.menuLabel}>About Captain Bro</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <BottomNavbar activeTab="profile" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            {currentUser ? (
              <Text style={styles.avatarText}>{getInitials(currentUser.fullName)}</Text>
            ) : (
              <Ionicons name="person" size={28} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentUser?.fullName || 'Guest User'}</Text>
            <Text style={styles.userPhone}>
              {currentUser?.phone ? `+91 ${currentUser.phone}` : currentUser?.email || 'Login to manage your account'}
            </Text>

            {currentUser && (
              <View
                style={[
                  styles.roleBadge,
                  currentUser.role === 'admin' || currentUser.role === 'super_admin'
                    ? { backgroundColor: '#FEE2E2' }
                    : currentUser.role === 'rider'
                    ? { backgroundColor: '#F0FDF4' }
                    : { backgroundColor: '#EFF6FF' },
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    currentUser.role === 'admin' || currentUser.role === 'super_admin'
                      ? { color: '#8B0000' }
                      : currentUser.role === 'rider'
                      ? { color: '#15803D' }
                      : { color: '#1D4ED8' },
                  ]}
                >
                  {currentUser.role === 'admin' || currentUser.role === 'super_admin'
                    ? 'ADMIN'
                    : currentUser.role === 'rider'
                    ? 'RIDER'
                    : 'CUSTOMER'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Portals Section (Admin & Rider portals hidden for customer-only app experience) */}
        {/*
        {currentUser && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>MANAGEMENT PORTALS</Text>
            
            {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
              <TouchableOpacity
                style={[styles.portalCard, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                onPress={() => router.push('/admin/dashboard' as any)}
              >
                <View style={[styles.portalIconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="shield-checkmark" size={22} color="#8B0000" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.portalTitle, { color: '#8B0000' }]}>Admin Portal</Text>
                  <Text style={styles.portalSub}>Manage orders, inventory catalog, riders, and users</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8B0000" />
              </TouchableOpacity>
            )}

            {currentUser.role === 'rider' && (
              <TouchableOpacity
                style={[styles.portalCard, { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' }]}
                onPress={() => router.push('/rider/dashboard' as any)}
              >
                <View style={[styles.portalIconContainer, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="bicycle" size={22} color="#16A34A" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.portalTitle, { color: '#166534' }]}>Rider Partner Portal</Text>
                  <Text style={styles.portalSub}>View designated delivery locations & update order status</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#16A34A" />
              </TouchableOpacity>
            )}
          </View>
        )}
        */}

        {/* Wishlist / Saved Favorites Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>MY FAVORITES ({wishlistItems.length})</Text>
          {wishlistItems.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingBottom: 4 }}>
              {wishlistItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.favCard}
                  onPress={() => router.push(`/product/${item.id}` as any)}
                >
                  <Text style={styles.favName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.favPrice}>₹{item.price}</Text>
                  <TouchableOpacity
                    style={styles.favAddBtn}
                    onPress={() => {
                      addToCart(item, 1);
                      Alert.alert('Added to Cart', `${item.name} added to cart!`);
                    }}
                  >
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                    <Text style={styles.favAddBtnText}>Add</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyFavBox}>
              <Ionicons name="heart-outline" size={24} color="#9CA3AF" />
              <Text style={styles.emptyFavText}>No favorite items saved yet. Tap the heart icon on products to save them!</Text>
            </View>
          )}
        </View>

        {/* General Actions List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>ACCOUNT ACTIONS</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/orders' as any)}>
              <Ionicons name="receipt-outline" size={20} color="#374151" />
              <Text style={styles.menuLabel}>My Orders & Live Tracking</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/cart' as any)}>
              <Ionicons name="cart-outline" size={20} color="#374151" />
              <Text style={styles.menuLabel}>Shopping Cart</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {!currentUser ? (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => router.push('/auth/login' as any)}
              >
                <Ionicons name="log-in-outline" size={20} color="#8B0000" />
                <Text style={[styles.menuLabel, { color: '#8B0000', fontWeight: '700' }]}>
                  Login with Mobile OTP
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#8B0000" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() =>
                  Alert.alert(
                    'Saved Addresses',
                    'Your saved delivery addresses are automatically loaded during checkout.'
                  )
                }
              >
                <Ionicons name="location-outline" size={20} color="#374151" />
                <Text style={styles.menuLabel}>Saved Delivery Addresses</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Help & Support Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>HELP & SUPPORT</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() =>
                Alert.alert(
                  'Customer Support',
                  'Support Hotline: 1800-425-BRO (276)\nEmail: support@captainbro.com'
                )
              }
            >
              <Ionicons name="headset-outline" size={20} color="#374151" />
              <Text style={styles.menuLabel}>Call Helpline Support</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() =>
                Alert.alert(
                  'About Captain Bro',
                  'Version: 2.1.0\n\nDelivering the highest quality fresh meats, custom homemade pickles, and traditional local groceries right to your doorstep.'
                )
              }
            >
              <Ionicons name="information-circle-outline" size={20} color="#374151" />
              <Text style={styles.menuLabel}>About Captain Bro</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setShowPrivacyModal(true)}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#374151" />
              <Text style={styles.menuLabel}>Privacy Policy & Data Safety</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login / Logout Button */}
        {currentUser ? (
          <>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text style={styles.logoutText}>Logout Account</Text>
            </TouchableOpacity>

            {/* Google Play Mandated Account Deletion */}
            <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={styles.deleteAccountText}>Delete Account & Data</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login' as any)}>
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text style={styles.loginBtnText}>Login / Register Now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Privacy Policy & Data Safety Modal (Google Play Policy Mandate) */}
      <Modal visible={showPrivacyModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.privacyModalContent}>
            <View style={styles.privacyModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={24} color="#8B0000" />
                <Text style={styles.privacyModalTitle}>Privacy Policy & Data Safety</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.privacyScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.policyUpdated}>Last Updated: September 2026 | Captain Bro Warangal</Text>

              <Text style={styles.policySectionHeader}>1. Introduction & Operating Scope</Text>
              <Text style={styles.policyBody}>
                Captain Bro operates a hyper-local fresh meat and grocery commerce delivery platform in Warangal, Telangana. We are committed to protecting your personal information and complying with all applicable data protection regulations and Google Play Store policies.
              </Text>

              <Text style={styles.policySectionHeader}>2. Information We Collect</Text>
              <Text style={styles.policyBody}>
                • <Text style={{ fontWeight: '700' }}>Personal Info:</Text> Name and 10-digit mobile number for account registration and delivery alerts.{"\n"}
                • <Text style={{ fontWeight: '700' }}>Location Data:</Text> Delivery addresses, street names, and pincodes provided by you to fulfill orders within Warangal.{"\n"}
                • <Text style={{ fontWeight: '700' }}>Device & Diagnostics:</Text> Push notification tokens for live order status updates.
              </Text>

              <Text style={styles.policySectionHeader}>3. How We Use Your Data</Text>
              <Text style={styles.policyBody}>
                Your data is strictly utilized to process, prepare, and deliver your fresh food orders, dispatch authorized delivery partners, and send real-time SMS/push updates regarding your order progress. We never sell your data to third-party marketers.
              </Text>

              <Text style={styles.policySectionHeader}>4. Financial & Payment Security</Text>
              <Text style={styles.policyBody}>
                Online UPI and Card payments are handled securely through PCI-DSS compliant Indian Payment Gateways (Razorpay). Captain Bro does not store your credit card numbers, debit card numbers, or UPI PINs on its servers.
              </Text>

              <Text style={styles.policySectionHeader}>5. Account & Data Deletion (Your Rights)</Text>
              <Text style={styles.policyBody}>
                You have the absolute right to request permanent deletion of your account and all associated personal records at any time directly through the "Delete Account & Data" button in your profile settings, or by emailing our Data Grievance Officer at privacy@captainbro.com. Deletion is instantaneous and irrevocable.
              </Text>

              <Text style={styles.policySectionHeader}>6. Contact Information</Text>
              <Text style={styles.policyBody}>
                Captain Bro Technologies{"\n"}
                Hanamkonda, Warangal, Telangana 506001{"\n"}
                Email: support@captainbro.com | Phone: 1800-425-276
              </Text>

              <View style={{ height: 24 }} />
            </ScrollView>

            <TouchableOpacity style={styles.privacyCloseBtn} onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.privacyCloseBtnText}>Close Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavbar activeTab="profile" />
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
    backgroundColor: '#FFFFFF',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111827', letterSpacing: 0.5 },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 16, paddingBottom: 120 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  userInfo: { marginLeft: 16, flex: 1 },
  userName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  userPhone: { fontSize: 13, color: '#6B7280', marginTop: 2, fontWeight: '500' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sectionContainer: { marginBottom: 20 },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 },
  portalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  portalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portalTitle: { fontSize: 15, fontWeight: '800' },
  portalSub: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 16 },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLabel: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '700', color: '#374151' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#DC2626',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  logoutText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  loginBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#8B0000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  loginBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  favCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    width: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  favName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  favPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8B0000',
  },
  favAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B0000',
    borderRadius: 6,
    paddingVertical: 5,
    marginTop: 4,
    gap: 2,
  },
  favAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyFavBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  emptyFavText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  loginHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  loginHeroIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginHeroSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  loginHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B0000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    elevation: 3,
    shadowColor: '#8B0000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  loginHeroBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    marginTop: 12,
    gap: 6,
  },
  deleteAccountText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  privacyModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  privacyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  privacyModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  privacyScrollView: {
    marginTop: 12,
  },
  policyUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 12,
  },
  policySectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginTop: 14,
    marginBottom: 4,
  },
  policyBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  privacyCloseBtn: {
    backgroundColor: '#8B0000',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  privacyCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
