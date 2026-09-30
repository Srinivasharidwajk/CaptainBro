import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image, FlatList, Dimensions, StyleSheet } from 'react-native';

const rawWidth = Dimensions.get('window').width;
const SCREEN_WIDTH = Math.min(rawWidth && rawWidth > 0 ? rawWidth : 375, 480);
const BANNER_WIDTH = SCREEN_WIDTH - 20;
const BANNER_HEIGHT = BANNER_WIDTH * 0.48;

const LOCAL_BANNERS: Record<string, any> = {
  'bannerone.png': require('../../../assets/images/bannerone.png'),
  'bannertwo.png': require('../../../assets/images/bannertwo.png'),
  'bannerthree.png': require('../../../assets/images/bannerthree.png'),
  'bannerfour.png': require('../../../assets/images/bannerfour.png'),
};

interface HeroBannersProps {
  onBannerPress: (category: string) => void;
}

export default function HeroBanners({ onBannerPress }: HeroBannersProps) {
  const slideBanners = [
    { img: LOCAL_BANNERS['bannerone.png'], category: 'our-products', label: 'Our Products' },
    { img: LOCAL_BANNERS['bannertwo.png'], category: 'home-foods', label: 'Home Foods' },
    { img: LOCAL_BANNERS['bannerthree.png'], category: 'pickles', label: 'Homemade Pickles' },
    { img: LOCAL_BANNERS['bannerfour.png'], category: 'meat', label: 'Fresh Meat & Seafood' },
  ];

  const [activeSlide, setActiveSlide] = useState(0);
  const bannerFlatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveSlide((prev) => {
        const nextIndex = (prev + 1) % slideBanners.length;
        try {
          bannerFlatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        } catch (_) {
          bannerFlatListRef.current?.scrollToOffset({
            offset: nextIndex * BANNER_WIDTH,
            animated: true,
          });
        }
        return nextIndex;
      });
    }, 3200);
    return () => clearInterval(slideInterval);
  }, [slideBanners.length]);

  return (
    <View style={styles.bannerWrapper}>
      <View style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT, borderRadius: 8, overflow: 'hidden' }}>
        <FlatList
          ref={bannerFlatListRef}
          data={slideBanners}
          horizontal
          pagingEnabled={true}
          snapToInterval={BANNER_WIDTH}
          snapToAlignment="center"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, idx) => idx.toString()}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: BANNER_WIDTH,
            offset: BANNER_WIDTH * index,
            index,
          })}
          onScroll={(ev) => {
            const offsetX = ev.nativeEvent.contentOffset.x;
            const newIndex = Math.round(offsetX / BANNER_WIDTH);
            if (newIndex >= 0 && newIndex < slideBanners.length) {
              setActiveSlide(newIndex);
            }
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onBannerPress(item.category)}
              style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT, borderRadius: 8, overflow: 'hidden' }}
            >
              <Image source={item.img} style={styles.bannerImg} resizeMode="cover" />
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Navigation Dots */}
      <View style={styles.dotsRow}>
        {slideBanners.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              setActiveSlide(index);
              try {
                bannerFlatListRef.current?.scrollToIndex({ index, animated: true });
              } catch (_) {
                bannerFlatListRef.current?.scrollToOffset({
                  offset: index * BANNER_WIDTH,
                  animated: true,
                });
              }
            }}
            style={[
              styles.dot,
              activeSlide === index ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrapper: {
    marginVertical: 10,
    alignItems: 'center',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#8B0000',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#D1D5DB',
  },
});
