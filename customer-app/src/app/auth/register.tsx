import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { db } from '@/firebase/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { register } = useContext(AuthContext);

  const [accountType, setAccountType] = useState<'customer' | 'rider'>(
    params.type === 'rider' ? 'rider' : 'customer'
  );
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('Bike / Motorcycle');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const VEHICLE_OPTIONS = ['Bike / Motorcycle', 'Scooter', 'Bicycle', 'Auto'];

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      Alert.alert('Password Required', 'Please enter a password of at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Password and Confirm Password must match.');
      return;
    }

    setLoading(true);
    const autoEmail =
      accountType === 'rider'
        ? `rider_${cleanPhone}@captainbro.com`
        : `${cleanPhone}@captainbro.com`;

    try {
      const user = await register(
        autoEmail,
        password.trim(),
        fullName.trim(),
        cleanPhone,
        accountType
      );

      // If registered as rider, create rider entry in Firestore
      if (accountType === 'rider') {
        try {
          await setDoc(
            doc(db, 'riders', user.uid),
            {
              id: user.uid,
              name: fullName.trim(),
              phone: cleanPhone,
              vehicleType,
              status: 'online',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (_) {}
      }

      router.replace('/profile' as any);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Mobile number may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {accountType === 'rider' ? 'Partner Registration' : 'New User Registration'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand Banner */}
        <View style={styles.logoSection}>
          <View style={styles.logoBadge}>
            <Ionicons
              name={accountType === 'rider' ? 'bicycle' : 'person-add'}
              size={32}
              color="#8B0000"
            />
          </View>
          <Text style={styles.appName}>
            {accountType === 'rider' ? 'Join as Delivery Partner' : 'Create Account'}
          </Text>
          <Text style={styles.tagline}>
            {accountType === 'rider'
              ? 'Deliver orders with Captain Bro and earn daily'
              : 'Register in 30 seconds to start ordering'}
          </Text>
        </View>

        {/* Role Segmented Switcher */}
        <View style={styles.roleTabContainer}>
          <TouchableOpacity
            style={[styles.roleTabBtn, accountType === 'customer' && styles.roleTabBtnActive]}
            onPress={() => setAccountType('customer')}
          >
            <Ionicons
              name="bag-handle"
              size={16}
              color={accountType === 'customer' ? '#8B0000' : '#6B7280'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.roleTabText, accountType === 'customer' && styles.roleTabTextActive]}>
              Customer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleTabBtn, accountType === 'rider' && styles.roleTabBtnActive]}
            onPress={() => setAccountType('rider')}
          >
            <Ionicons
              name="bicycle"
              size={16}
              color={accountType === 'rider' ? '#8B0000' : '#6B7280'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.roleTabText, accountType === 'rider' && styles.roleTabTextActive]}>
              Delivery Partner
            </Text>
          </TouchableOpacity>
        </View>

        {/* Registration Card */}
        <View style={styles.card}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#8B0000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          {/* Vehicle Type (Rider only) */}
          {accountType === 'rider' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Type</Text>
              <View style={styles.vehiclePillsRow}>
                {VEHICLE_OPTIONS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.vehiclePill, vehicleType === v && styles.vehiclePillActive]}
                    onPress={() => setVehicleType(v)}
                  >
                    <Text
                      style={[
                        styles.vehiclePillText,
                        vehicleType === v && styles.vehiclePillTextActive,
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Mobile Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {accountType === 'rider' ? 'Partner Mobile Number' : 'Mobile Number'}
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#8B0000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="10 digit mobile number"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#8B0000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Create a password (min 6 chars)"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#8B0000" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.btnInner}>
                <Text style={styles.primaryBtnText}>
                  {accountType === 'rider' ? 'Register as Delivery Partner' : 'Register Now'}
                </Text>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() =>
              router.push({
                pathname: '/auth/login' as any,
                params: { type: accountType },
              })
            }
          >
            <Text style={styles.loginText}>
              Already registered? <Text style={styles.loginHighlight}>Login Here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 20 },
  logoSection: { alignItems: 'center', marginVertical: 14 },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: { fontSize: 24, fontWeight: '800', color: '#8B0000' },
  tagline: { fontSize: 13, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  roleTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  roleTabBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  roleTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleTabTextActive: {
    color: '#8B0000',
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  vehiclePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehiclePill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vehiclePillActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#8B0000',
  },
  vehiclePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  vehiclePillTextActive: {
    color: '#8B0000',
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: '#8B0000',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loginLink: { marginTop: 20, alignItems: 'center' },
  loginText: { fontSize: 14, color: '#4B5563' },
  loginHighlight: { color: '#8B0000', fontWeight: '800' },
});
