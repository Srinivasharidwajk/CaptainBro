import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RiderOrderContext } from '../context/RiderOrderContext';

export default function RiderHistoryScreen() {
  const router = useRouter();
  const { completedOrders, shiftEarnings, codCollected } = useContext(RiderOrderContext);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery History & Earnings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Earnings Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Total Trips</Text>
            <Text style={styles.summaryVal}>{completedOrders.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Trip Payout</Text>
            <Text style={[styles.summaryVal, { color: '#10B981' }]}>₹{shiftEarnings}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>COD Cash</Text>
            <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>₹{codCollected}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>COMPLETED TRIPS ({completedOrders.length})</Text>

        {completedOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="bicycle-outline" size={48} color="#4B5563" />
            <Text style={styles.emptyTitle}>No Deliveries Completed Yet</Text>
            <Text style={styles.emptySub}>Delivered customer orders will appear here with earnings breakdown.</Text>
          </View>
        ) : (
          completedOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTopRow}>
                <Text style={styles.orderId}>Order #{order.id.slice(-6)}</Text>
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                  <Text style={styles.completedBadgeText}>DELIVERED</Text>
                </View>
              </View>

              <Text style={styles.customerName}>{order.customerName || 'Customer'}</Text>
              <Text style={styles.addressText} numberOfLines={2}>{order.address || 'Address provided'}</Text>

              <View style={styles.orderFooter}>
                <View>
                  <Text style={styles.footerLabel}>Order Value / Mode</Text>
                  <Text style={styles.footerValue}>₹{order.total} • {order.paymentMethod}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.footerLabel}>Rider Earning</Text>
                  <Text style={[styles.footerValue, { color: '#10B981' }]}>+₹50</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0F19' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  container: { padding: 16, flexGrow: 1 },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 20,
  },
  summaryColumn: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: '#1F2937' },
  summaryLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  summaryVal: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginTop: 4 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', marginBottom: 12, letterSpacing: 0.5 },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#E5E7EB', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 6 },
  orderCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 12,
  },
  orderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 13, fontWeight: '800', color: '#E5E7EB' },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadgeText: { fontSize: 10, fontWeight: '800', color: '#10B981' },
  customerName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  addressText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    paddingTop: 10,
    marginTop: 10,
  },
  footerLabel: { fontSize: 10, color: '#6B7280' },
  footerValue: { fontSize: 13, fontWeight: '800', color: '#F3F4F6', marginTop: 2 },
});
