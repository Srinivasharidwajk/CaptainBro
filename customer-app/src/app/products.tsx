import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BottomNavbar from '@/components/BottomNavbar';
import { CartContext } from '@/context/CartContext';
import { AuthContext } from '@/context/AuthContext';
import { formatWeight } from '@/utils/helpers';
import { getProductsDb, subscribeToProductsDb, sortProductsByPriority } from '@/firebase/database';

// Core UI Branding Assets
const LOCAL_IMAGES: Record<string, any> = {
  'fooditems.png': require('../../assets/images/fooditems.png'),
  'fruits-category.png': require('../../assets/images/fruits-category.png'),
  'chicken-category.png': require('../../assets/images/chicken-category.png'),
  'pickles-category.png': require('../../assets/images/pickles-category.png'),
  'onions.png': require('../../assets/images/onions.png'),
  'cooking-oil.png': require('../../assets/images/cooking-oil.png'),
};

const DEFAULT_FALLBACK_IMG = { uri: 'https://ik.imagekit.io/uuwqngqjh/New%20Folder/captainbroimages/ChatGPT%20Image%20Aug%2024%202026%2003_51_27%20P-100kb.jpg' };

const getImageUrl = (imageName: any) => {
  if (!imageName) return DEFAULT_FALLBACK_IMG;
  if (typeof imageName === 'number') return imageName;
  if (typeof imageName === 'object' && imageName.uri) return imageName;
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

const formatPrice = (price: number) => {
  const safePrice = typeof price === 'number' && !isNaN(price) ? price : 0;
  return `₹${safePrice}`;
};

export const CATEGORIES = [
  { id: 'meat', name: 'Meat & Seafood' },
  { id: 'our-products', name: 'Our Brand Products' },
  { id: 'vegetables', name: 'Fresh Vegetables' },
  { id: 'fruits', name: 'Fresh Fruits' },
  { id: 'grocery', name: 'Groceries' },
  { id: 'pickles', name: 'Pickles' },
  { id: 'home-foods', name: 'Home Foods' },
];



export default function ProductsScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ category?: string; search?: string }>();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.search || '');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const categoryParam = searchParams.category || '';

  const mergeProducts = (dbProds: any[]) => {
    if (!dbProds || !Array.isArray(dbProds)) return [];
    return sortProductsByPriority(dbProds);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      getProductsDb().then((dbProds) => {
        setProducts(mergeProducts(dbProds || []));
      }).catch(() => { });
    }, 100);

    const unsub = subscribeToProductsDb((prods) => {
      setProducts(mergeProducts(prods || []));
    });

    return () => {
      clearTimeout(timer);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    if (searchParams.search !== undefined) {
      setSearchQuery(searchParams.search);
    }
  }, [searchParams.search]);

  const handleCategorySelect = (id: string) => {
    const activeCategories = categoryParam ? categoryParam.split(',') : [];
    if (activeCategories.includes(id)) {
      const remaining = activeCategories.filter((c) => c !== id);
      router.setParams({ category: remaining.length > 0 ? remaining.join(',') : undefined });
    } else {
      router.setParams({ category: id });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    router.setParams({ category: undefined, search: undefined });
  };

  const isProductInCat = (product: any, catId: string) => {
    if (!product) return false;
    const c = (product.category || '').toLowerCase().trim();
    if (c === catId.toLowerCase()) return true;

    if (catId === 'meat') {
      return ['meat', 'chicken', 'mutton', 'fish', 'prawns', 'seafood', 'fresh meat & seafood'].includes(c);
    }
    if (catId === 'our-products') {
      return ['our-products', 'our_brand', 'our products', 'brand', 'signature', 'our brand specials'].includes(c);
    }
    if (catId === 'vegetables') {
      return ['vegetables', 'veg', 'greens', 'farm vegetables', 'farm fresh vegetables'].includes(c);
    }
    if (catId === 'fruits') {
      return ['fruits', 'fruit', 'fresh fruits'].includes(c);
    }
    if (catId === 'grocery') {
      return ['grocery', 'groceries', 'cooking essentials', 'eggs', 'dairy', 'staples', 'daily groceries'].includes(c);
    }
    if (catId === 'pickles') {
      return ['pickles', 'pickle', 'homemade pickles'].includes(c);
    }
    if (catId === 'home-foods') {
      return ['home-foods', 'home foods', 'sweets', 'snacks', 'home foods & telangana sweets'].includes(c);
    }
    return false;
  };

  const rawFilteredProducts = products.filter((product) => {
    const activeCategories = categoryParam ? categoryParam.split(',') : [];
    let matchesCategory = activeCategories.length === 0;
    if (activeCategories.length > 0) {
      matchesCategory = activeCategories.some((catId) => isProductInCat(product, catId));
    }
    const matchesSearch =
      !searchQuery ||
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredProducts = sortProductsByPriority(rawFilteredProducts);

  const handleBack = () => {
    try {
      router.back();
    } catch (_) {
      router.push('/' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* Header Bar with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Products</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Header Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="Search items..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              router.setParams({ search: text.length > 0 ? text : undefined });
            }}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pillsContainer}
        >
          <TouchableOpacity
            onPress={() => router.setParams({ category: undefined })}
            style={[styles.pill, !categoryParam ? styles.pillActive : styles.pillInactive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, !categoryParam ? styles.pillTextActive : styles.pillTextInactive]}>
              All
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((cat) => {
            const activeCategories = categoryParam ? categoryParam.split(',') : [];
            const isActive = activeCategories.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleCategorySelect(cat.id)}
                style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results Info Header */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>Showing {filteredProducts.length} items</Text>
          {(searchQuery || categoryParam) ? (
            <TouchableOpacity onPress={handleResetFilters}>
              <Text style={styles.clearAllBtn}>Clear All</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Products Grid or Grouped Categories */}
        {!categoryParam && !searchQuery ? (
          <View style={styles.groupedList}>
            {CATEGORIES.map((cat) => {
              const catProducts = sortProductsByPriority(products.filter((p) => isProductInCat(p, cat.id)));

              if (catProducts.length === 0) return null;

              return (
                <View key={cat.id} style={styles.categorySection}>
                  <View style={styles.categoryHeaderRow}>
                    <Text style={styles.categorySectionTitle}>{cat.name}</Text>
                    <TouchableOpacity onPress={() => handleCategorySelect(cat.id)}>
                      <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.productGrid}>
                    {catProducts.map((p) => (
                      <View key={p.id} style={styles.productGridCol}>
                        <ProductCard product={p} onPress={() => router.push({ pathname: `/product/${p.id}` as any })} />
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBadge}>
                  <Ionicons name="archive-outline" size={28} color="#6B7280" />
                </View>
                <Text style={styles.emptyTitle}>No Products Found</Text>
                <Text style={styles.emptySub}>
                  We couldn't find any items in this category right now.
                </Text>
                {handleResetFilters && (
                  <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
                    <Text style={styles.resetBtnText}>Clear Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredProducts.map((p) => (
                <View key={p.id} style={styles.productGridCol}>
                  <ProductCard product={p} onPress={() => router.push({ pathname: `/product/${p.id}` as any })} />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      <BottomNavbar />
    </SafeAreaView>
  );
}

const MULTILINGUAL_LABELS: any = {
  categories: {
    chicken: { en: 'chicken', te: 'చికెన్', hi: 'चिकन' },
    mutton: { en: 'mutton', te: 'మటన్', hi: 'मटन' },
    fish: { en: 'fish', te: 'చేపలు', hi: 'मछली' },
    prawns: { en: 'prawns', te: 'రొయ్యలు', hi: 'झींगे' },
    grocery: { en: 'grocery', te: 'కిరాణా', hi: 'किराना' },
    vegetables: { en: 'vegetables', te: 'కూరగాయలు', hi: 'సబ్జియాన్' },
    fruits: { en: 'fruits', te: 'పండ్లు', hi: 'ఫల్' }
  },
  products: {
    p5: { en: 'onion', te: 'ఉల్లిపాయ', hi: 'प्याज' },
    p6: { en: 'green chilli', te: 'పచ్చిమిర్చి', hi: 'हरी मिर्च' },
    p7: { en: 'coriander', te: 'కొత్తిమీర', hi: 'धनिया' },
    p8: { en: 'lemon', te: 'నిమ్మకాయ', hi: 'नींबू' },
    p9: { en: 'basmati rice', te: 'బాస్మతి బియ్యం', hi: 'బాస్మతీ చావల్' },
    p10: { en: 'cooking oil', te: 'వంట నూనె', hi: 'ఖానా పకానే కా తేల్' },
    p11: { en: 'curd', te: 'పెరుగు', hi: 'దహీ' },
    p12: { en: 'chilli powder', te: 'కారం పొడి', hi: 'లాల్ మిర్చి పౌడర్' },
    p13: { en: 'ginger garlic paste', te: 'అల్లం వెల్లుల్లి పేస్ట్', hi: 'అదరక్ లహసున్ కా పేస్ట్' },
    p14: { en: 'mint', te: 'పుదీనా', hi: 'పుదీనా' },
    p15: { en: 'masala powder', te: 'మసాలా పొడి', hi: 'మసాలా పొడి' },
    p16: { en: 'raw masala mix', te: 'మసాలా దినుసులు', hi: 'ఖడా మసాలా' },
    p17: { en: 'sona masuri rice', te: 'సోనా మసూరి బియ్యం', hi: 'సోనా మసూరీ చావల్' },
    p23: { en: 'banana', te: 'అరటిపండు', hi: 'కేలా' },
    p36: { en: 'mango pickle', te: 'మామిడికాయ పచ్చడి', hi: 'ఆమ్ కా అచార్' },
    p37: { en: 'tomato pickle', te: 'టమాటా పచ్చడి', hi: 'టమాటర్ కా అచార్' },
    p38: { en: 'chicken pickle', te: 'చికెన్ పచ్చడి', hi: 'చికెన్ కా అచార్' },
    p40: { en: 'chilli powder', te: 'కారం పొడి', hi: 'లాల్ మిర్చి పౌడర్' },
    p41: { en: 'turmeric powder', te: 'పసుపు పొడి', hi: 'హల్దీ పౌడర్' },
    p42: { en: 'coriander powder', te: 'ధనియాల పొడి', hi: 'ధనియా పౌడర్' },
    p43: { en: 'natural sugar', te: 'సహజ పంచదార', hi: 'ప్రాకృతిక్ చీనీ' },
    p44: { en: 'natural jaggery', te: 'సహజ బెల్లం', hi: 'ప్రాకృతిక్ గుడ్' },
    p45: { en: 'gravy powder', te: 'గ్రేవీ పొడి', hi: 'గ్రేవీ పౌడర్' },
    p46: { en: 'masala powder', te: 'మసాలా పొడి', hi: 'మసాలా పొడి' },
    p47: { en: 'milkshake powder', te: 'మిల్క్ షేక్ పొడి', hi: 'మిల్క్ షేక్ పౌడర్' },
    p48: { en: 'face pack', te: 'ఫేస్ ప్యాక్', hi: 'ఫేస్ ప్యాక్' },
    p49: { en: 'dry fruits mix', te: 'డ్రై ఫ్రూట్స్ మిక్స్', hi: 'డ్రై ఫ్రూట్స్ మిక్స్' },
    p50: { en: 'face pack for men', te: 'పురుషుల ఫేస్ ప్యాక్', hi: 'పురుషోన్ కే లియే ఫేస్ ప్యాక్' },
    p51: { en: 'face pack for kids', te: 'పిల్లల ఫేస్ ప్యాక్', hi: 'బచ్చోన్ కే లియే ఫేస్ ప్యాక్' },
    p52: { en: 'protein shake powder', te: 'ప్రోటీన్ షేక్ పొడి', hi: 'ప్రోటీన్ షేక్ పౌడర్' },
    p53: { en: 'groundnut oil', te: 'వేరుశెనగ నూనె', hi: 'మూంగఫలీ కా తేల్' },
    p54: { en: 'groundnut oil', te: 'వేరుశెనగ నూనె', hi: 'మూంగఫలీ కా తేల్' },
    p55: { en: 'groundnut oil', te: 'వేరుశెనగ నూనె', hi: 'మూంగఫలీ కా తేల్' },
    p56: { en: 'face pack for women', te: 'మహిళల ఫేస్ ప్యాక్', hi: 'మహిళావోన్ కే లియే ఫేస్ ప్యాక్' },
    p75: { en: 'lemon pickle', te: 'నిమ్మకాయ పచ్చడి', hi: 'నీంబూ కా అచార్' },
    p76: { en: 'garlic pickle', te: 'వెల్లుల్లి పచ్చడి', hi: 'లహసున్ కా అచార్' },
    p77: { en: 'ginger pickle', te: 'అల్లం పచ్చడి', hi: 'అదరక్ కా అచార్' },
    p78: { en: 'gongura pickle', te: 'గోంగూర పచ్చడి', hi: 'గోంగూరా కా అచార్' },
    p79: { en: 'mutton pickle', te: 'మటన్ పచ్చడి', hi: 'మటన్ కా అచార్' }
  }
};

const getSubtextLabel = (product: any) => {
  if (!product) return '';
  if (MULTILINGUAL_LABELS.products[product.id]) {
    const label = MULTILINGUAL_LABELS.products[product.id];
    return `${label.en} • ${label.te} • ${label.hi}`;
  }
  if (MULTILINGUAL_LABELS.categories[product.category]) {
    const label = MULTILINGUAL_LABELS.categories[product.category];
    return `${label.en} • ${label.te} • ${label.hi}`;
  }
  return product.sub || product.category;
};

// ProductCard Subcomponent
function ProductCard({ product, onPress }: { product: any; onPress: () => void }) {
  const router = useRouter();
  const { cartItems, addToCart, updateQuantity, toggleWishlist, isWishlisted } = useContext(CartContext);
  const { currentUser } = useContext(AuthContext);

  const cartItem = cartItems.find((item) => {
    const pId = String(product.id || '');
    return String(item.id) === pId || String(item.cartItemId).startsWith(pId);
  });
  const quantity = cartItem ? cartItem.quantity : 0;
  const itemId = cartItem ? (cartItem.cartItemId || cartItem.id) : String(product.id);
  const wishlisted = isWishlisted(product.id);

  const handleAdd = (e: any) => {
    e.stopPropagation();
    if (onPress) {
      onPress();
    } else {
      router.push(`/product/${product.id}` as any);
    }
  };

  const handleIncrement = (e: any) => {
    e.stopPropagation();
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'Please login with your mobile number to add items to your cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login with OTP',
            onPress: () =>
              router.push({
                pathname: '/auth/login' as any,
                params: { redirectTo: '/products' },
              }),
          },
        ]
      );
      return;
    }
    if (cartItem) {
      updateQuantity(itemId, quantity + 1);
    } else {
      addToCart(product, 1);
    }
  };

  const handleDecrement = (e: any) => {
    e.stopPropagation();
    if (cartItem) {
      updateQuantity(itemId, quantity - 1);
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      <View style={styles.cardImgContainer}>
        <Image source={getImageUrl(product.image)} style={styles.cardImg} resizeMode="contain" />
        <TouchableOpacity
          style={styles.heartBadge}
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
        >
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={15}
            color={wishlisted ? '#DC2626' : '#9CA3AF'}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.cardInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {(() => {
            const c = (product.category || '').toLowerCase();
            const n = (product.name || '').toLowerCase();
            const isPickle = c.includes('pickle') || n.includes('pickle');
            const isPickleNonVeg = isPickle && /chicken|mutton|prawn|fish|meat/i.test(n);
            const isPickleVeg = isPickle && !isPickleNonVeg;
            const isP = n.includes('paneer') || n.includes('panner') || n.includes('punner') || product.id === 'p24';
            const isM = (['meat', 'chicken', 'mutton', 'fish', 'prawns'].includes(c) || /chicken|mutton|fish|prawn|meat|koramanu|salmon/i.test(n)) && !isP && !isPickle;
            const isNonVeg = isM || isPickleNonVeg;
            const isVeg = isP || isPickleVeg;
            if (!isNonVeg && !isVeg) return null;
            return (
              <View style={[styles.dietDotBorder, { width: 11, height: 11, borderWidth: 1.2, borderColor: isVeg ? '#16A34A' : '#DC2626' }]}>
                <View style={[styles.dietDotInner, { width: 4.5, height: 4.5, borderRadius: 2.25, backgroundColor: isVeg ? '#16A34A' : '#DC2626' }]} />
              </View>
            );
          })()}
          <Text style={[styles.cardName, { flex: 1 }]} numberOfLines={1}>
            {product.name}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
          <Text style={styles.cardWeight}>{formatWeight(product.weight, quantity > 0 ? quantity : 1)}</Text>
          <View style={styles.ratingInline}>
            <FontAwesome name="star" size={10} color="#F59E0B" />
            <Text style={styles.ratingText}>{product.rating || '4.8'}</Text>
          </View>
        </View>

        <Text style={styles.cardCategory} numberOfLines={1}>
          {getSubtextLabel(product)}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <Text style={styles.cardPrice}>{formatPrice(product.price * (quantity > 0 ? quantity : 1))}</Text>
        {product.inStock === false ? (
          <View style={{
            backgroundColor: '#F3F4F6',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}>
            <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '800' }}>OUT OF STOCK</Text>
          </View>
        ) : quantity > 0 ? (
          <View style={styles.qtyCardControl}>
            <TouchableOpacity style={styles.qtyCardBtn} activeOpacity={0.8} onPress={handleDecrement}>
              <Ionicons name="remove" size={14} color="#8B0000" />
            </TouchableOpacity>
            <Text style={styles.qtyCardText}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyCardBtn} activeOpacity={0.8} onPress={handleIncrement}>
              <Ionicons name="add" size={14} color="#8B0000" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={handleAdd}>
            <Ionicons name="add" size={14} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 99,
    elevation: 4,
  },
  backBtn: {
    padding: 6,
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 46,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  clearBtn: {
    padding: 4,
  },
  pillsScroll: {
    marginHorizontal: -12,
  },
  pillsContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  pillInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextInactive: {
    color: '#374151',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  clearAllBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B0000',
  },
  groupedList: {
    gap: 20,
  },
  categorySection: {
    gap: 10,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categorySectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B0000',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  productGridCol: {
    width: '48.5%',
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
  },
  seeMoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B0000',
  },
  emptyState: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    maxWidth: 240,
    textAlign: 'center',
  },
  resetBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  resetBtnText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 12,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardImgContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  heartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 3,
  },
  dietDotBorder: {
    width: 13,
    height: 13,
    borderWidth: 1.5,
    borderRadius: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dietDotInner: {
    width: 5.5,
    height: 5.5,
    borderRadius: 2.75,
  },
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  cardWeight: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  cardInfo: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  cardCategory: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'capitalize',
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#8B0000',
    padding: 8,
    borderRadius: 6,
  },
  qtyCardControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  qtyCardBtn: {
    padding: 4,
  },
  qtyCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B0000',
    minWidth: 14,
    textAlign: 'center',
  },
});
