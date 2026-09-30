import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CategoryGridProps {
  onSelectCategory: (cat: string) => void;
  onSeeAll: () => void;
}

const LOCAL_IMAGES: Record<string, any> = {
  'chicken-category.png': require('../../../assets/images/chicken-category.png'),
  'our-brand.png': require('../../../assets/images/our-brand.png'),
  'pickles-category.png': require('../../../assets/images/pickles-category.png'),
  'fooditems.png': require('../../../assets/images/fooditems.png'),
};

export default function CategoryGrid({ onSelectCategory, onSeeAll }: CategoryGridProps) {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={14} color="#8B0000" />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryGrid}>
        {/* Card 1: Fresh Meat & Panner */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onSelectCategory('meat')}
          style={styles.categoryCard}
        >
          <View style={styles.categoryImgBox}>
            <Image
              source={LOCAL_IMAGES['chicken-category.png']}
              style={styles.categoryImg}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.categoryLabel}>Fresh Meat & Panner</Text>
        </TouchableOpacity>

        {/* Card 2: Our Brand */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onSelectCategory('our-products')}
          style={styles.categoryCard}
        >
          <View style={styles.categoryImgBox}>
            <Image
              source={LOCAL_IMAGES['our-brand.png']}
              style={styles.categoryImg}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.categoryLabel}>Our Brand</Text>
        </TouchableOpacity>

        {/* Card 3: Pickles */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onSelectCategory('pickles')}
          style={styles.categoryCard}
        >
          <View style={styles.categoryImgBox}>
            <Image
              source={LOCAL_IMAGES['pickles-category.png']}
              style={styles.categoryImg}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.categoryLabel}>Pickles</Text>
        </TouchableOpacity>

        {/* Card 4: Home Foods */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onSelectCategory('home-foods')}
          style={styles.categoryCard}
        >
          <View style={styles.categoryImgBox}>
            <Image
              source={LOCAL_IMAGES['fooditems.png']}
              style={styles.categoryImg}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.categoryLabel}>Home Foods</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B0000',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    rowGap: 8,
  },
  categoryCard: {
    width: '49%',
    alignItems: 'center',
  },
  categoryImgBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 6,
  },
  categoryImg: {
    width: '100%',
    height: '100%',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
});

