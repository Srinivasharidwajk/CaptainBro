import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ONBOARDING_STORAGE_KEY = '@captainbro_has_onboarded_v1';

interface OnboardingSlide {
  id: string;
  badge: string;
  title: string;
  highlight: string;
  subtitle: string;
  image: any;
  color: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    badge: '100% FARM FRESH',
    title: 'Tender & Chemical-Free',
    highlight: 'Fresh Meats',
    subtitle: 'Daily procured chicken, country birds & mutton, custom cleaned and vacuum packed for unmatched taste.',
    image: require('../../assets/images/chicken-category.png'),
    color: '#8B0000',
  },
  {
    id: '2',
    badge: 'EXPRESS DISPATCH',
    title: 'Delivered to Doorstep in',
    highlight: '30 Minutes',
    subtitle: 'Hyper-local lightning fast delivery across Warangal, Hanamkonda & Kazipet directly to your kitchen.',
    image: require('../../assets/images/fooditems.png'),
    color: '#DC2626',
  },
  {
    id: '3',
    badge: 'HERITAGE RECIPES',
    title: 'Authentic Traditional',
    highlight: 'Homemade Pickles',
    subtitle: 'Crafted with authentic Telugu grandma recipes using pure cold-pressed groundnut oil, zero preservatives.',
    image: require('../../assets/images/pickles-category.png'),
    color: '#B91C1C',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch (_) {}
    router.replace('/' as any);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / SCREEN_WIDTH);
    if (index >= 0 && index < SLIDES.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F9" />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/images/captain-bro-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>Captain Bro</Text>
        </View>

        <TouchableOpacity style={styles.skipBtn} onPress={handleComplete} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
          <Ionicons name="chevron-forward" size={14} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Slides Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.imageContainer}>
              <View style={styles.imageBackdrop} />
              <Image source={item.image} style={styles.slideImage} resizeMode="contain" />
            </View>

            <View style={styles.textContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>

              <Text style={styles.title}>
                {item.title}{' '}
                <Text style={[styles.titleHighlight, { color: item.color }]}>
                  {item.highlight}
                </Text>
              </Text>

              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      {/* Bottom Navigation Controls */}
      <View style={styles.bottomBar}>
        {/* Indicator Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, { flexDirection: 'row', alignItems: 'center' }]}
          onPress={handleNext}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color="#FFFFFF"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F9',
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#8B0000',
    letterSpacing: -0.5,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  skipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 2,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH * 0.78,
    height: SCREEN_WIDTH * 0.75,
    maxHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 16,
  },
  imageBackdrop: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    borderRadius: SCREEN_WIDTH * 0.45,
    backgroundColor: '#FEE2E2',
    opacity: 0.6,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    color: '#8B0000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 10,
  },
  titleHighlight: {
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#8B0000',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#E5E7EB',
  },
  primaryBtn: {
    backgroundColor: '#8B0000',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#8B0000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
