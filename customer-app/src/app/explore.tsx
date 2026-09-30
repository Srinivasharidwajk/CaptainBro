import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNavbar from '@/components/BottomNavbar';
const LOCAL_IMAGES: Record<string, any> = {
  'fooditems.png': require('../../assets/images/fooditems.png'),
  'fruits-category.png': require('../../assets/images/fruits-category.png'),
  'chicken-category.png': require('../../assets/images/chicken-category.png'),
  'pickles-category.png': require('../../assets/images/pickles-category.png'),
  'cooking-oil.png': require('../../assets/images/cooking-oil.png'),
  'our-brand.png': require('../../assets/images/our-brand.png'),
};

const DEFAULT_FALLBACK_IMG = { uri: 'https://ik.imagekit.io/uuwqngqjh/New%20Folder/captainbroimages/ChatGPT%20Image%20Aug%2024%202026%2003_51_27%20P-100kb.jpg' };

const getImageUrl = (imageName: any) => {
  if (!imageName) return DEFAULT_FALLBACK_IMG;
  if (typeof imageName === 'number') return imageName;
  if (typeof imageName === 'string') {
    if (imageName.startsWith('http') || imageName.startsWith('data:image')) {
      return { uri: imageName };
    }
    const filename = imageName.replace(/^.*[\\\/]/, '');
    if (LOCAL_IMAGES[filename]) {
      return LOCAL_IMAGES[filename];
    }
  }
  return DEFAULT_FALLBACK_IMG;
};

const CATEGORIES = [
  { id: 'meat', name: 'Meat & Seafood', image: 'chicken-category.png', count: 36 },
  { id: 'our-products', name: 'Our Brand Products', image: 'our-brand.png', count: 18 },
  { id: 'vegetables', name: 'Fresh Vegetables', image: 'onions.png', count: 24 },
  { id: 'fruits', name: 'Fresh Fruits', image: 'fruits-category.png', count: 18 },
  { id: 'grocery', name: 'Daily Groceries', image: 'cooking-oil.png', count: 35 },
  { id: 'pickles', name: 'Homemade Pickles', image: 'pickles-category.png', count: 12 },
  { id: 'home-foods', name: 'Home Foods & Sweets', image: 'sakinalu.png', count: 16 },
];

const getCategoryTagline = (id: string) => {
  const taglines: Record<string, string> = {
    meat: 'Tender chicken cuts, rich mutton, fresh water fish & jumbo prawns cleaned safely.',
    'our-products': 'Authentic masala powders, pure groundnut oil, natural jaggery, and brand specials.',
    vegetables: 'Crisp green chillies, organic coriander, onions, lemons, and farm-fresh vegetables.',
    fruits: 'Sweet apples, organic papaya, pomegranate, grapes, and seasonal fruits.',
    grocery: 'Basmati rice, fresh curd, pure spices, ghee, cooking oils, and daily essentials.',
    pickles: 'Traditional homemade mango, chicken, tomato, and Gongura pickles prepared naturally.',
    'home-foods': 'Authentic Telangana Sakinalu, Ariselu, traditional sweets, snacks and home foods.',
  };
  return taglines[id] || 'Sourced daily with strict safety checkmarks.';
};

export default function BrowseCategoriesScreen() {
  const router = useRouter();

  const handleCategoryPress = (catId: string) => {
    router.push({ pathname: '/products' as any, params: { category: catId } });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Categories</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionTitleBox}>
          <Text style={styles.mainTitle}>Explore Categories</Text>
          <Text style={styles.subTitle}>Explore our range of premium meats, fresh produce & groceries</Text>
        </View>

        <View style={styles.categoriesList}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.85}
              onPress={() => handleCategoryPress(cat.id)}
              style={styles.categoryCard}
            >
              {/* Category Icon */}
              <View style={styles.categoryImgBox}>
                <Image
                  source={getImageUrl(cat.image)}
                  style={styles.categoryImg}
                  resizeMode="cover"
                />
              </View>

              {/* Info */}
              <View style={styles.categoryInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{cat.count} Items</Text>
                  </View>
                </View>

                <Text style={styles.categoryTagline} numberOfLines={2}>
                  {getCategoryTagline(cat.id)}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <BottomNavbar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
    gap: 16,
  },
  sectionTitleBox: {
    gap: 4,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  subTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoriesList: {
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  categoryImgBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  categoryImg: {
    width: '100%',
    height: '100%',
  },
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  countBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8B0000',
  },
  categoryTagline: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
});
