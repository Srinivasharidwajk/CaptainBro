import React, { useState, useEffect, useRef, useContext } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';

const logo = require('../../../assets/images/captain-bro-logo.png');

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirectTo?: string }>();
  const {
    sendPhoneOtp,
    confirmPhoneOtp,
    updateProfile,
  } = useContext(AuthContext);

  // Auth Steps: 'phone' | 'otp' | 'onboarding'
  const [authStep, setAuthStep] = useState<'phone' | 'otp' | 'onboarding'>('phone');

  // Phone & OTP state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [loading, setLoading] = useState(false);

  // Onboarding state for new customers
  const [onboardName, setOnboardName] = useState('');
  const [onboardEmail, setOnboardEmail] = useState('');
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);

  // Resend OTP Countdown
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const otpInputsRef = useRef<Array<TextInput | null>>([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: any;
    if (authStep === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authStep, resendTimer]);

  const navigatePostAuth = (_role?: string) => {
    if (params.redirectTo) {
      router.replace(params.redirectTo as any);
    } else {
      router.replace('/profile' as any);
    }
  };

  // Step 1: Send OTP to customer's mobile number
  const handleSendOtp = async (overridePhone?: string) => {
    const rawDigits = (overridePhone || phone).replace(/\D/g, '');
    const cleanPhone = rawDigits.slice(-10);

    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPhoneOtp(cleanPhone);
      setConfirmationResult(res.confirmationResult);
      setIsFallback(!!res.isFallback);
      setAuthStep('otp');
      setResendTimer(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);

      if (res.isFallback) {
        Alert.alert(
          'Verification Code Ready',
          `OTP verification initiated for +91 ${cleanPhone}.\n\nEnter code 123456 (or any 6 digits) to complete login.`
        );
      } else {
        Alert.alert('OTP Sent', `A 6-digit SMS verification code was sent to +91 ${cleanPhone}.`);
      }
    } catch (err: any) {
      Alert.alert('Unable to Send OTP', err.message || 'Please check your mobile number and internet connection.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input box changes & auto-focus
  const handleOtpBoxChange = (text: string, index: number) => {
    const sanitized = text.replace(/\D/g, '');
    const newOtp = [...otp];

    if (sanitized.length > 1) {
      // User pasted full OTP code
      const digits = sanitized.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      const nextFocus = Math.min(digits.length, 5);
      otpInputsRef.current[nextFocus]?.focus();
      return;
    }

    newOtp[index] = sanitized;
    setOtp(newOtp);

    if (sanitized && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Step 3: Verify OTP code
  const handleVerifyOtp = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      Alert.alert('Incomplete OTP', 'Please enter all 6 digits of your SMS code.');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const user = await confirmPhoneOtp(
        fullOtp,
        confirmationResult,
        cleanPhone,
        isFallback
      );

      setAuthenticatedUser(user);

      // Check if user is a new customer who needs profile onboarding
      const isNewCustomer =
        !user.fullName ||
        user.fullName === 'User' ||
        user.fullName.startsWith('Captain User') ||
        !user.email ||
        user.email.endsWith('@captainbro.com');

      if (isNewCustomer) {
        setOnboardName(user.fullName && !user.fullName.startsWith('Captain User') ? user.fullName : '');
        setOnboardEmail(user.email && !user.email.endsWith('@captainbro.com') ? user.email : '');
        setAuthStep('onboarding');
      } else {
        navigatePostAuth(user.role);
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Save Onboarding Profile (Name + Email) for new customer (MANDATORY)
  const handleSaveOnboarding = async () => {
    const trimmedName = onboardName.trim();
    const trimmedEmail = onboardEmail.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert('Name Required', 'Please enter your full name (at least 2 characters).');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      Alert.alert('Valid Email Required', 'Please enter a valid email address (e.g. name@gmail.com) for your digital invoices.');
      return;
    }

    setLoading(true);
    try {
      if (authenticatedUser?.uid) {
        await updateProfile({
          fullName: trimmedName,
          email: trimmedEmail,
        });
      }

      navigatePostAuth();
    } catch (err: any) {
      Alert.alert('Error Saving Profile', err.message || 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (authStep === 'onboarding') {
              Alert.alert(
                'Profile Setup Required',
                'Please enter your name and email to finish setting up your account.'
              );
            } else if (authStep === 'otp') {
              setAuthStep('phone');
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {authStep === 'onboarding' ? 'Welcome to Captain Bro' : 'Customer Login'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Logo & Brand Header */}
          <View style={styles.brandHero}>
            <View style={styles.logoCircle}>
              <Image source={logo} style={styles.logoImg} resizeMode="contain" />
            </View>
            <Text style={styles.brandName}>Captain Bro</Text>
            <Text style={styles.brandTagline}>Fresh Meat, Spices & Food delivered in 30 mins</Text>
          </View>

          {/* ==================== STEP 1: PHONE NUMBER ENTRY ==================== */}
          {authStep === 'phone' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Enter your mobile number</Text>
              <Text style={styles.cardSub}>
                We will send a 6-digit verification code to confirm your account
              </Text>

              {/* Indian Phone Input Field */}
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCodeBox}>
                  <Text style={styles.flagText}>IN</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <View style={styles.verticalDivider} />
                <TextInput
                  style={styles.phoneTextInput}
                  placeholder="Enter 10 digit mobile number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(val) => setPhone(val.replace(/\D/g, ''))}
                  autoFocus
                />
                {phone.length > 0 && (
                  <TouchableOpacity onPress={() => setPhone('')} style={{ padding: 6 }}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Primary Continue Button */}
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  phone.length < 10 && styles.primaryBtnDisabled,
                ]}
                onPress={() => handleSendOtp()}
                disabled={phone.length < 10 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.primaryBtnText}>Get OTP Code</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Terms Notice */}
              <Text style={styles.termsText}>
                By continuing, you agree to Captain Bro's{' '}
                <Text style={styles.termsHighlight}>Terms of Service</Text> &{' '}
                <Text style={styles.termsHighlight}>Privacy Policy</Text>.
              </Text>
            </View>
          )}

          {/* ==================== STEP 2: 6-DIGIT OTP VERIFICATION ==================== */}
          {authStep === 'otp' && (
            <View style={styles.card}>
              <View style={styles.otpHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Verify Mobile OTP</Text>
                  <Text style={styles.cardSub}>
                    Enter the 6-digit SMS code sent to{' '}
                    <Text style={{ fontWeight: '700', color: '#111827' }}>+91 {phone}</Text>
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editPhoneBtn}
                  onPress={() => setAuthStep('phone')}
                >
                  <Ionicons name="pencil" size={13} color="#8B0000" />
                  <Text style={styles.editPhoneText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* 6 Discrete Digit Boxes */}
              <View style={styles.otpBoxesRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(el) => {
                      otpInputsRef.current[index] = el;
                    }}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : undefined,
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(val) => handleOtpBoxChange(val, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    selectTextOnFocus
                    autoFocus={index === 0}
                  />
                ))}
              </View>

              {/* Verify & Proceed Button */}
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  otp.join('').length < 6 && styles.primaryBtnDisabled,
                  { marginTop: 22 },
                ]}
                onPress={handleVerifyOtp}
                disabled={otp.join('').length < 6 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Resend OTP Timer & Button */}
              <View style={styles.resendContainer}>
                {canResend ? (
                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={() => handleSendOtp(phone)}
                  >
                    <Ionicons name="refresh" size={16} color="#8B0000" />
                    <Text style={styles.resendBtnText}>Resend SMS Code</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendCountdownText}>
                    Resend code in{' '}
                    <Text style={{ fontWeight: '700', color: '#8B0000' }}>
                      00:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}s
                    </Text>
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* STEP 3: NEW CUSTOMER PROFILE ONBOARDING */}
          {authStep === 'onboarding' && (
            <View style={styles.card}>
              <View style={styles.onboardingHeaderRow}>
                <View style={styles.onboardingIconBox}>
                  <Ionicons name="sparkles" size={24} color="#8B0000" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Complete Your Profile</Text>
                  <Text style={styles.cardSub}>
                    Welcome! Tell us your name and email so we can personalize your experience.
                  </Text>
                </View>
              </View>

              {/* Full Name Input */}
              <View style={{ marginTop: 20 }}>
                <Text style={styles.inputLabel}>
                  Full Name <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <View style={styles.onboardingInputWrapper}>
                  <Ionicons name="person-outline" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.onboardingInput}
                    placeholder="Enter your full name (e.g. Rahul Sharma)"
                    placeholderTextColor="#9CA3AF"
                    value={onboardName}
                    onChangeText={setOnboardName}
                    autoCapitalize="words"
                    autoFocus
                  />
                </View>
              </View>

              {/* Email Address Input (Required) */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.inputLabel}>
                  Email Address <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <View style={styles.onboardingInputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.onboardingInput}
                    placeholder="Enter email (e.g. name@gmail.com)"
                    placeholderTextColor="#9CA3AF"
                    value={onboardEmail}
                    onChangeText={setOnboardEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Save & Start Shopping Button */}
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (!onboardName.trim() || !onboardEmail.trim()) && styles.primaryBtnDisabled,
                  { marginTop: 24 },
                ]}
                onPress={handleSaveOnboarding}
                disabled={!onboardName.trim() || !onboardEmail.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.primaryBtnText}>Start Shopping</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandHero: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
  },
  logoImg: {
    width: 44,
    height: 44,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  brandTagline: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  cardSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 18,
    paddingHorizontal: 12,
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  flagText: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 10,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingVertical: 14,
  },
  primaryBtn: {
    backgroundColor: '#8B0000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryBtnDisabled: {
    backgroundColor: '#FCA5A5',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  termsText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  termsHighlight: {
    color: '#8B0000',
    fontWeight: '600',
  },
  staffPortalStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  staffPortalText: {
    fontSize: 12,
    color: '#6B7280',
  },
  staffPortalLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B0000',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  editPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  editPhoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B0000',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  otpBox: {
    width: 46,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  otpBoxFilled: {
    borderColor: '#8B0000',
    backgroundColor: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendCountdownText: {
    fontSize: 12,
    color: '#6B7280',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8B0000',
  },
  roleToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  rolePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  rolePillActive: {
    backgroundColor: '#8B0000',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  rolePillTextActive: {
    color: '#FFFFFF',
  },
  staffInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  switchBackBtn: {
    alignItems: 'center',
    marginTop: 16,
    padding: 6,
  },
  switchBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  onboardingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  onboardingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  onboardingInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  skipOnboardingBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  skipOnboardingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
});
