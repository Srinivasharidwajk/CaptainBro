import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RiderAuthContext } from '../../context/RiderAuthContext';

export default function RiderLoginScreen() {
  const router = useRouter();
  const { loginRider } = useContext(RiderAuthContext);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter your registered 10-digit mobile number.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Password Required', 'Please enter your rider login password or PIN.');
      return;
    }

    setLoading(true);
    const res = await loginRider(cleanPhone, password.trim());
    setLoading(false);

    if (res.success) {
      router.replace('/' as any);
    } else {
      Alert.alert('Sign In Failed', res.message || 'Unable to authenticate. Please check with store admin.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="bicycle" size={42} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Captain Bro Partner</Text>
            <Text style={styles.heroSubtitle}>
              Delivery Fleet & Fleet Partner Operations
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeader}>Rider Sign In</Text>
            <Text style={styles.cardSub}>
              Use the mobile number and password assigned to you by the store manager.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Registered Mobile Number</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.prefix}>+91</Text>
                <TextInput
                  style={styles.input}
                  placeholder="9876543210"
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rider Password / PIN</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#6B7280"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Sign In & Go on Duty</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.helpText}>
              Not registered yet? Ask your store manager to add your phone and create your login in the Admin Portal.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0F19' },
  container: { padding: 20, justifyContent: 'center', flexGrow: 1 },
  heroSection: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#8B0000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#8B0000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  heroSubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardHeader: { fontSize: 18, fontWeight: '800', color: '#F3F4F6' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 18, lineHeight: 18 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 8 },
  prefix: { color: '#F3F4F6', fontWeight: '700', marginRight: 8 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  submitBtn: {
    backgroundColor: '#8B0000',
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: '#8B0000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  helpText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});
