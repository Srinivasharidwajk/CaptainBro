import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { CartContext } from '@/context/CartContext';

interface BottomNavbarProps {
  activeTab?: string;
  cartCount?: number;
}

export default function BottomNavbar({ cartCount }: BottomNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { cartCount: liveCartCount } = useContext(CartContext);

  const activeCount = cartCount !== undefined ? cartCount : liveCartCount;
  const isSplashPath = pathname === '/splash';

  // Bottom inset calculation: on Android gesture bar / iOS home bar, add padding to avoid overlapping the line
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 4);

  // Production-grade tab navigation: replaces screen instead of stacking and prevents duplicate triggers
  const handleTabPress = (target: string) => {
    if (pathname === target) return;
    router.replace(target as any);
  };

  if (isSplashPath) return null;

  // Customer Bottom Bar (Home, Browse, Cart, Orders, Profile)
  const isHome = pathname === '/' || pathname === '/index' || pathname === '/home';
  const isBrowse = pathname === '/products';
  const isCart = pathname === '/cart';
  const isOrders = pathname === '/orders' || pathname.startsWith('/order-tracking');
  const isProfile = pathname === '/profile' || pathname.startsWith('/auth');

  return (
    <View style={[styles.navContainer, { paddingBottom: bottomInset }]}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => handleTabPress('/')}
          style={styles.tabBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isHome ? 'home' : 'home-outline'}
            size={22}
            color={isHome ? '#8B0000' : '#6B7280'}
          />
          <Text style={[styles.tabLabel, isHome && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleTabPress('/products')}
          style={styles.tabBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isBrowse ? 'search' : 'search-outline'}
            size={22}
            color={isBrowse ? '#8B0000' : '#6B7280'}
          />
          <Text style={[styles.tabLabel, isBrowse && styles.tabLabelActive]}>Browse</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleTabPress('/cart')}
          style={styles.tabBtn}
          activeOpacity={0.7}
        >
          <View style={styles.cartIconWrapper}>
            <Ionicons
              name={isCart ? 'bag-handle' : 'bag-handle-outline'}
              size={22}
              color={isCart ? '#8B0000' : '#6B7280'}
            />
            {activeCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{activeCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, isCart && styles.tabLabelActive]}>Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleTabPress('/orders')}
          style={styles.tabBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isOrders ? 'receipt' : 'receipt-outline'}
            size={22}
            color={isOrders ? '#8B0000' : '#6B7280'}
          />
          <Text style={[styles.tabLabel, isOrders && styles.tabLabelActive]}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleTabPress('/profile')}
          style={styles.tabBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isProfile ? 'person' : 'person-outline'}
            size={22}
            color={isProfile ? '#8B0000' : '#6B7280'}
          />
          <Text style={[styles.tabLabel, isProfile && styles.tabLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    width: '100%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
    height: '100%',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: '#8B0000',
    fontWeight: '800',
  },
  cartIconWrapper: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -3,
    right: -7,
    backgroundColor: '#8B0000',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
