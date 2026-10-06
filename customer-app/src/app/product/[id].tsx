import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  StatusBar,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { CartContext } from '@/context/CartContext';
import { AuthContext } from '@/context/AuthContext';
import { formatWeight } from '@/utils/helpers';
import { RECIPE_VIDEOS, playRecipeVideo } from '@/utils/recipeData';
import { subscribeToProductsDb, getProductsDb, getProductByIdDb, subscribeToProductByIdDb } from '@/firebase/database';

// Core UI Branding Assets
const LOCAL_IMAGES: Record<string, any> = {
  'fooditems.png': require('../../../assets/images/fooditems.png'),
  'fruits-category.png': require('../../../assets/images/fruits-category.png'),
  'chicken-category.png': require('../../../assets/images/chicken-category.png'),
  'pickles-category.png': require('../../../assets/images/pickles-category.png'),
  'onions.png': require('../../../assets/images/onions.png'),
  'cooking-oil.png': require('../../../assets/images/cooking-oil.png'),
  'captain-bro-logo.png': require('../../../assets/images/captain-bro-logo.png'),
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

const formatPrice = (price: any) => {
  if (price === null || price === undefined || price === '') return '₹0';
  const num = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.]/g, ''));
  const safePrice = !isNaN(num) ? num : 0;
  return `₹${safePrice}`;
};

const getProductGallery = (product: any): string[] => {
  if (!product) return ['fooditems.png'];
  const primary = product.image || 'fooditems.png';
  if (product.gallery && Array.isArray(product.gallery) && product.gallery.length > 0) {
    return [primary, ...product.gallery];
  }
  if (product.additionalImages && Array.isArray(product.additionalImages) && product.additionalImages.length > 0) {
    return [primary, ...product.additionalImages];
  }
  return [primary];
};

const findProductEverywhere = (searchId: string, list: any[]) => {
  if (!searchId || !Array.isArray(list)) return null;
  const sId = String(searchId);

  // 1. Direct ID match in live list
  const direct = list.find((p: any) => String(p.id) === sId);
  if (direct) return direct;

  // 2. Search inside frequentlyBought arrays of all products in list
  for (const p of list) {
    if (p.frequentlyBought && Array.isArray(p.frequentlyBought)) {
      for (const fb of p.frequentlyBought) {
        if (typeof fb === 'object' && fb && String(fb.id) === sId) {
          return {
            id: fb.id,
            name: fb.name,
            price: typeof fb.price === 'number' ? fb.price : parseFloat(fb.price) || 100,
            weight: fb.weight || '500g',
            image: fb.image || 'fooditems.png',
            category: fb.category || 'grocery',
            description: fb.description || `${fb.name} • ${fb.weight || '500g'}`,
            rating: fb.rating || 4.8,
            inStock: true,
          };
        }
      }
    }
  }
  return null;
};

export default function ProductDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 6);
  const navigation = useNavigation();
  const searchParams = useLocalSearchParams<{
    id: string;
    name?: string;
    price?: string;
    weight?: string;
    image?: string;
    category?: string;
    description?: string;
    fromFrequentlyBought?: string;
    isComplement?: string;
  }>();
  const id = searchParams.id;
  const { addToCart, updateQuantity, removeFromCart, cartItems, cartCount, toggleWishlist, isWishlisted } = useContext(CartContext);
  const { currentUser } = useContext(AuthContext);

  const isFromFrequentlyBought =
    searchParams.fromFrequentlyBought === 'true' ||
    searchParams.isComplement === 'true' ||
    String(id).startsWith('fb_') ||
    String(id).startsWith('comp_');

  const fallbackFromParams = (searchParams.name && id) ? {
    id: String(id),
    name: searchParams.name,
    price: typeof searchParams.price !== 'undefined' ? parseFloat(searchParams.price) || 100 : 100,
    weight: searchParams.weight || '500g',
    image: searchParams.image || 'fooditems.png',
    category: searchParams.category || 'grocery',
    description: searchParams.description || `${searchParams.name} • ${searchParams.weight || '500g'}`,
    rating: 4.8,
    inStock: true,
  } : null;

  const scrollViewRef = useRef<ScrollView>(null);
  const [allProductsList, setAllProductsList] = useState<any[]>([]);
  const [product, setProduct] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cuttingType, setCuttingType] = useState('Curry Cut');
  const [imageModalVisible, setImageModalVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    // Reset view position, selected image, and quantity on product change
    setSelectedImageIndex(0);
    setQuantity(1);
    try {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    } catch (_) {}

    // Immediately resolve local product if passed via params
    if (fallbackFromParams) {
      setProduct(fallbackFromParams);
    }

    getProductByIdDb(id).then((docProd) => {
      if (isMounted && docProd) {
        setProduct(docProd);
      }
    }).catch(() => { });

    getProductsDb().then((dbProds) => {
      if (isMounted && dbProds && dbProds.length > 0) {
        setAllProductsList(dbProds);
        const match = findProductEverywhere(String(id), dbProds);
        if (match) setProduct(match);
      }
    }).catch(() => { });

    const unsubDoc = subscribeToProductByIdDb(id, (liveProd) => {
      if (isMounted && liveProd) {
        setProduct(liveProd);
      }
    });

    const unsubAll = subscribeToProductsDb((prods) => {
      if (isMounted && prods && prods.length > 0) {
        setAllProductsList(prods);
        const match = findProductEverywhere(String(id), prods);
        if (match) setProduct(match);
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubDoc === 'function') unsubDoc();
      if (typeof unsubAll === 'function') unsubAll();
    };
  }, [id]);

  // If product state is for a different id, fallback to finding by id immediately
  const activeProduct = (product && String(product.id) === String(id))
    ? product
    : (findProductEverywhere(String(id), allProductsList) || fallbackFromParams);

  const gallery = getProductGallery(activeProduct);
  const currentDisplayImage = gallery[selectedImageIndex] || activeProduct?.image;

  const descText = activeProduct?.description ||
    activeProduct?.sub ||
    `${activeProduct?.name || 'Fresh Product'} • ${activeProduct?.category || 'grocery'}`;

  const catLower = (activeProduct?.category || '').toLowerCase();
  const nameLower = (activeProduct?.name || '').toLowerCase();

  const isChickenOrMutton = (['chicken', 'mutton'].includes(catLower) || nameLower.includes('chicken') || nameLower.includes('mutton')) && !nameLower.includes('pickle');
  const isPickle = ['pickles', 'pickle'].includes(catLower) || nameLower.includes('pickle');
  const isPickleNonVeg = isPickle && /chicken|mutton|prawn|fish|meat/i.test(nameLower);
  const isPickleVeg = isPickle && !isPickleNonVeg;

  const isHomeFood = ['home-foods', 'home foods', 'sweets', 'snacks'].includes(catLower) || nameLower.includes('sakinalu') || nameLower.includes('sarva pindi') || nameLower.includes('ariselu') || nameLower.includes('karijelu') || nameLower.includes('murukulu') || nameLower.includes('chegodi');
  const idNum = parseInt(activeProduct?.id?.substring(1) || '0');
  const isOurProduct = (catLower === 'our-products' || catLower === 'our_brand' || catLower === 'brand' || catLower === 'signature') || (activeProduct?.id?.startsWith('p') && idNum >= 40 && idNum <= 74 && !isHomeFood && !isPickle);

  const isPaneer = nameLower.includes('paneer') || nameLower.includes('panner') || nameLower.includes('punner') || activeProduct?.id === 'p24';
  const isPureMeat = (['meat', 'chicken', 'mutton', 'fish', 'prawns', 'seafood'].includes(catLower) || /chicken|mutton|fish|prawn|meat|koramanu|salmon/i.test(nameLower)) && !isPaneer && !isPickle;
  const isMeat = isPureMeat || isPaneer;
  const isVeg = ['vegetables', 'veg', 'greens'].includes(catLower);
  const isFruit = ['fruits', 'fruit'].includes(catLower);

  const isNonVegDiet = isPureMeat || isPickleNonVeg;
  const isVegDiet = isPaneer || isPickleVeg;
  const hasDietBadge = isNonVegDiet || isVegDiet;

  // Cutting styles: Use admin configured cuttingStyles if present, otherwise default to Curry Cut & Biryani Cut
  const cuttingStyles: string[] = (activeProduct?.cuttingStyles && Array.isArray(activeProduct.cuttingStyles) && activeProduct.cuttingStyles.length > 0)
    ? activeProduct.cuttingStyles
    : ['Curry Cut', 'Biryani Cut'];

  const hasConfiguredCuts = Boolean(activeProduct?.cuttingStyles && Array.isArray(activeProduct.cuttingStyles) && activeProduct.cuttingStyles.length > 0);
  const showCuttingStyles = hasConfiguredCuts || ((isChickenOrMutton || catLower === 'meat') && !isPickle && !isPaneer);

  useEffect(() => {
    if (cuttingStyles.length > 0 && !cuttingStyles.includes(cuttingType)) {
      setCuttingType(cuttingStyles[0]);
    }
  }, [activeProduct?.id, activeProduct?.cuttingStyles]);

  // Frequently Bought Together:
  // Shows respective category items for Pickles, Home Foods, Our Brand products, or admin-configured items
  const getFrequentlyBoughtList = () => {
    // If this product was opened from Frequently Bought Together, do NOT show frequently bought items
    if (isFromFrequentlyBought) {
      return [];
    }

    if (activeProduct?.frequentlyBought && Array.isArray(activeProduct.frequentlyBought) && activeProduct.frequentlyBought.length > 0) {
      return activeProduct.frequentlyBought.map((fItem: any, idx: number) => {
        if (typeof fItem === 'string') {
          const found = allProductsList.find((p) => String(p.id) === String(fItem));
          if (found) return found;
          return {
            id: fItem,
            name: fItem,
            price: 25,
            weight: '500g',
            image: 'fooditems.png',
            category: 'grocery',
            rating: 4.8,
            inStock: true,
          };
        }
        return {
          id: fItem.id || `comp_${String(activeProduct?.id || id)}_${idx}_${String(fItem.name || '').replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: fItem.name || `Item #${idx + 1}`,
          price: typeof fItem.price === 'number' ? fItem.price : parseFloat(String(fItem.price)) || 25,
          weight: fItem.weight || '500g',
          image: fItem.image || 'fooditems.png',
          category: fItem.category || 'grocery',
          description: fItem.description || `${fItem.name || 'Complement'} • ${fItem.weight || '500g'}`,
          rating: fItem.rating || 4.8,
          inStock: true,
        };
      }).filter(Boolean);
    }

    const currentId = String(activeProduct?.id || id);

    // Fresh Meat or Paneer: Show complementary items from live admin products (grocery, spices, vegetables)
    if (isMeat || isPaneer) {
      return allProductsList.filter((p) => {
        if (String(p.id) === currentId) return false;
        const c = (p.category || '').toLowerCase();
        const n = (p.name || '').toLowerCase();
        return (
          ['grocery', 'vegetables', 'our-products', 'our_brand'].includes(c) ||
          /oil|ginger|garlic|onion|mint|chilli|coriander|lemon|rice|curd|masala/i.test(n)
        );
      });
    }

    // Homemade Pickles: Show other homemade pickles
    if (isPickle) {
      return allProductsList.filter((p) => {
        const c = (p.category || '').toLowerCase();
        const n = (p.name || '').toLowerCase();
        return (c.includes('pickle') || n.includes('pickle')) && String(p.id) !== currentId;
      });
    }

    // Telangana Home Foods & Sweets: Show other traditional home foods
    if (isHomeFood) {
      return allProductsList.filter((p) => {
        const c = (p.category || '').toLowerCase();
        const n = (p.name || '').toLowerCase();
        const isHome = ['home-foods', 'home foods', 'sweets', 'snacks'].includes(c) || n.includes('sakinalu') || n.includes('sarva pindi') || n.includes('ariselu') || n.includes('karijelu') || n.includes('murukulu') || n.includes('chegodi');
        return isHome && String(p.id) !== currentId;
      });
    }

    // Our Products: Show other brand products
    if (isOurProduct) {
      return allProductsList.filter((p) => {
        const c = (p.category || '').toLowerCase();
        const n = (p.name || '').toLowerCase();
        const pIdNum = parseInt(p.id?.substring(1) || '0');
        const isBrand = ['our-products', 'our_brand', 'brand', 'signature'].includes(c) || (p.id?.startsWith('p') && pIdNum >= 40 && pIdNum <= 74);
        const isOtherSpecial = ['home-foods', 'home foods', 'sweets', 'pickles', 'pickle', 'meat', 'chicken', 'mutton'].includes(c) || n.includes('pickle') || n.includes('sakinalu') || n.includes('sarva pindi');
        return isBrand && !isOtherSpecial && String(p.id) !== currentId;
      });
    }

    // Fresh Vegetables: Show other vegetables
    if (isVeg) {
      return allProductsList.filter((p) => {
        const c = (p.category || '').toLowerCase();
        return ['vegetables', 'veg', 'greens'].includes(c) && String(p.id) !== currentId;
      });
    }

    // Fresh Fruits: Show other fruits
    if (isFruit) {
      return allProductsList.filter((p) => {
        const c = (p.category || '').toLowerCase();
        return ['fruits', 'fruit'].includes(c) && String(p.id) !== currentId;
      });
    }

    return [];
  };

  const frequentPool = getFrequentlyBoughtList();

  const sectionTitleText = isPickle
    ? 'Frequently Bought Pickles'
    : isHomeFood
    ? 'Frequently Bought Home Foods & Sweets'
    : isOurProduct
    ? 'Frequently Bought Brand Products'
    : 'Frequently Bought Together';

  const addedFrequentItems = frequentPool
    .map((item: any) => {
      const found = cartItems.find((c) => (c.cartItemId || c.id) === item.id || c.id === item.id);
      return found ? { ...item, quantity: found.quantity, cartItemId: found.cartItemId || item.id } : null;
    })
    .filter(Boolean) as any[];

  const rawPrice = typeof activeProduct?.price === 'number'
    ? activeProduct.price
    : parseFloat(String(activeProduct?.price || 0).replace(/[^0-9.]/g, '')) || 0;
  const mainItemPrice = rawPrice * quantity;
  const comboExtraPrice = addedFrequentItems.reduce((sum: number, it: any) => {
    const itPrice = typeof it.price === 'number'
      ? it.price
      : parseFloat(String(it.price || 0).replace(/[^0-9.]/g, '')) || 0;
    return sum + (itPrice * (it.quantity || 1));
  }, 0);
  const combinedTotal = mainItemPrice + comboExtraPrice;

  const handleAddToCart = () => {
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
                params: { redirectTo: `/product/${id}` },
              }),
          },
        ]
      );
      return;
    }
    const itemToAdd = {
      ...activeProduct,
      cuttingType: showCuttingStyles ? cuttingType : undefined,
    };
    addToCart(itemToAdd, quantity);
    router.push('/cart' as any);
  };

  // Recipe videos: ONLY for meat / paneer or if configured from admin side, NOT for pickles, home-foods, our-products
  const getRecipeVideosList = () => {
    // If opened from a Frequently Bought Together item, do NOT show recipe videos
    if (isFromFrequentlyBought) {
      return [];
    }
    if (isPickle || isHomeFood || isOurProduct) {
      return [];
    }
    if (activeProduct?.recipeVideos && Array.isArray(activeProduct.recipeVideos) && activeProduct.recipeVideos.length > 0) {
      return activeProduct.recipeVideos;
    }
    if (isPaneer) {
      return RECIPE_VIDEOS.paneer || RECIPE_VIDEOS.chicken;
    }
    if (catLower === 'chicken' || catLower === 'mutton' || catLower === 'fish' || catLower === 'prawns') {
      return RECIPE_VIDEOS[catLower] || [];
    }
    return [];
  };

  const recipeList = getRecipeVideosList();

  const renderFrequentCard = (item: any) => {
    const itemId = item.id;
    const existingInCart = cartItems.find((c) => (c.cartItemId || c.id) === itemId || c.id === itemId);
    const itemQty = existingInCart ? existingInCart.quantity : 0;
    const cartTargetId = existingInCart ? (existingInCart.cartItemId || existingInCart.id) : itemId;

    return (
      <TouchableOpacity
        key={item.id || item.name}
        style={styles.frequentCard}
        activeOpacity={0.88}
        onPress={() =>
          router.push({
            pathname: `/product/${item.id}` as any,
            params: {
              id: String(item.id),
              name: item.name,
              price: String(item.price),
              weight: item.weight || '500g',
              image: typeof item.image === 'string' ? item.image : '',
              category: item.category || 'grocery',
              description: item.description || '',
              fromFrequentlyBought: 'true',
              isComplement: 'true',
            },
          })
        }
      >
        <View style={styles.frequentImgBox}>
          <Image source={getImageUrl(item.image)} style={styles.frequentImg} resizeMode="cover" />
          <View style={styles.viewOverlayBadge}>
            <Ionicons name="expand-outline" size={10} color="#FFFFFF" />
            <Text style={styles.viewOverlayText}>View</Text>
          </View>
        </View>
        <Text style={styles.frequentName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.frequentWeight}>{item.weight || '100g'}</Text>
        <View style={styles.frequentRow}>
          <Text style={styles.frequentPrice}>{formatPrice(item.price)}</Text>
          {itemQty > 0 ? (
            <View style={styles.qtyFrequentControl}>
              <TouchableOpacity
                style={styles.qtyFrequentBtn}
                activeOpacity={0.8}
                onPress={(e) => {
                  e.stopPropagation();
                  if (itemQty <= 1) {
                    if (typeof removeFromCart === 'function') {
                      removeFromCart(cartTargetId);
                    } else {
                      updateQuantity(cartTargetId, 0);
                    }
                  } else {
                    updateQuantity(cartTargetId, itemQty - 1);
                  }
                }}
              >
                <Ionicons name={itemQty === 1 ? 'trash-outline' : 'remove'} size={12} color="#8B0000" />
              </TouchableOpacity>
              <Text style={styles.qtyFrequentText}>{itemQty}</Text>
              <TouchableOpacity
                style={styles.qtyFrequentBtn}
                activeOpacity={0.8}
                onPress={(e) => {
                  e.stopPropagation();
                  updateQuantity(cartTargetId, itemQty + 1);
                }}
              >
                <Ionicons name="add" size={12} color="#8B0000" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.frequentAddBtn}
              activeOpacity={0.85}
              onPress={(e) => {
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
                            params: { redirectTo: `/product/${id}` },
                          }),
                      },
                    ]
                  );
                  return;
                }
                addToCart(item, 1);
              }}
            >
              <Text style={styles.frequentAddText}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleBack = () => {
    try {
      if (navigation && typeof (navigation as any).goBack === 'function' && (navigation as any).canGoBack()) {
        (navigation as any).goBack();
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/products' as any);
      }
    } catch (_) {
      try {
        router.back();
      } catch {
        router.replace('/products' as any);
      }
    }
  };

  if (!activeProduct) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Product Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={{ marginTop: 12, fontSize: 14, color: '#6B7280' }}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Product Details</Text>
        <TouchableOpacity
          style={styles.cartIconBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => router.push('/cart' as any)}
        >
          <Ionicons name="cart-outline" size={22} color="#111827" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: addedFrequentItems.length > 0 ? 190 : 80 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Product Showcase Card */}
        <View style={styles.imageContainer}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setImageModalVisible(true)}
          >
            <Image source={getImageUrl(currentDisplayImage)} style={styles.productImg} resizeMode="contain" />
            <View style={styles.zoomHintBadge}>
              <Ionicons name="expand-outline" size={11} color="#FFFFFF" />
              <Text style={styles.zoomHintText}>Tap to View Full Image</Text>
            </View>
          </TouchableOpacity>

          {/* Veg / Non-Veg Indicator Badge on Product Image Showcase */}
          {hasDietBadge && (
            <View style={[styles.dietBadge, { borderColor: isVegDiet ? '#86EFAC' : '#FECACA', backgroundColor: isVegDiet ? '#F0FDF4' : '#FEF2F2' }]}>
              <View style={[styles.dietDotBorder, { borderColor: isVegDiet ? '#16A34A' : '#DC2626' }]}>
                <View style={[styles.dietDotInner, { backgroundColor: isVegDiet ? '#16A34A' : '#DC2626' }]} />
              </View>
              <Text style={[styles.dietBadgeText, { color: isVegDiet ? '#15803D' : '#B91C1C' }]}>
                {isVegDiet ? '100% VEG' : 'NON-VEG'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.heartBadge}
            activeOpacity={0.8}
            onPress={() => toggleWishlist(activeProduct)}
          >
            <Ionicons
              name={isWishlisted(activeProduct?.id) ? 'heart' : 'heart-outline'}
              size={18}
              color={isWishlisted(activeProduct?.id) ? '#DC2626' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>

        {/* Gallery Thumbnails Strip */}
        {gallery.length > 1 && (
          <View style={styles.galleryStripContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {gallery.map((imgName, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.galleryThumbCard,
                    selectedImageIndex === idx && styles.galleryThumbCardActive
                  ]}
                  onPress={() => setSelectedImageIndex(idx)}
                >
                  <Image source={getImageUrl(imgName)} style={styles.galleryThumbImg} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Product Details Section */}
        <View style={styles.detailsBox}>
          <View style={styles.titleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
              {hasDietBadge && (
                <View style={[styles.dietDotBorder, { borderColor: isVegDiet ? '#16A34A' : '#DC2626', width: 16, height: 16 }]}>
                  <View style={[styles.dietDotInner, { backgroundColor: isVegDiet ? '#16A34A' : '#DC2626', width: 7, height: 7, borderRadius: 3.5 }]} />
                </View>
              )}
              <Text style={[styles.productTitle, { flex: 1 }]} numberOfLines={2}>{activeProduct?.name || 'Fresh Product'}</Text>
            </View>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{activeProduct?.category || 'MEAT'}</Text>
            </View>
          </View>

          {/* Product Price & Discount Display */}
          <View style={styles.mainPriceRow}>
            <Text style={styles.mainPriceValue}>{formatPrice(activeProduct?.price)}</Text>
            {activeProduct?.originalPrice && Number(activeProduct.originalPrice) > Number(activeProduct.price) && (
              <Text style={styles.originalPriceValue}>{formatPrice(activeProduct.originalPrice)}</Text>
            )}
            {activeProduct?.originalPrice && Number(activeProduct.originalPrice) > Number(activeProduct.price) && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>
                  {Math.round(((Number(activeProduct.originalPrice) - Number(activeProduct.price)) / Number(activeProduct.originalPrice)) * 100)}% OFF
                </Text>
              </View>
            )}
            <Text style={styles.unitPriceLabel}>/ {activeProduct?.weight || '500g'}</Text>
          </View>

          <Text style={styles.weightText}>Standard Quantity: {activeProduct?.weight || '500g'}</Text>

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descText}>{descText}</Text>
          </View>

          {/* Cutting Type Options (for Meat & items with configurable cuts) */}
          {showCuttingStyles && (
            <View style={styles.cuttingSection}>
              <Text style={styles.sectionTitle}>Select Cutting Style</Text>
              <View style={styles.cuttingRow}>
                {cuttingStyles.map((style: string) => (
                  <TouchableOpacity
                    key={style}
                    onPress={() => setCuttingType(style)}
                    style={[styles.cuttingChip, cuttingType === style && styles.cuttingChipActive]}
                  >
                    <Text style={[styles.cuttingChipText, cuttingType === style && styles.cuttingChipTextActive]}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quantity Selector with Total Weight Badge */}
          <View style={styles.qtySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.qtyRowContainer}>
              <View style={styles.scaledWeightBadge}>
                <Text style={styles.scaledWeightText}>Total Weight: {formatWeight(activeProduct?.weight || '500g', quantity)}</Text>
              </View>
              <View style={styles.qtyCounter}>
                <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyBtn}>
                  <Ionicons name="remove" size={16} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{quantity}</Text>
                <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}>
                  <Ionicons name="add" size={16} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Recommended Recipe Videos Section (ONLY when available and not for pickles/homefoods/our-products) */}
        {recipeList && recipeList.length > 0 && (
          <View style={styles.recipeSection}>
            <View style={styles.recipeHeader}>
              <Ionicons name="videocam" size={18} color="#8B0000" />
              <Text style={styles.sectionTitle}>Recommended Recipe Videos ({recipeList.length})</Text>
            </View>
            <Text style={styles.recipeSub}>Watch step-by-step cooking videos for this {activeProduct?.name}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipeScroll}>
              {recipeList.map((rec: any, rIdx: number) => (
                <View key={rec.id || `rec_${rIdx}`} style={styles.recipeCard}>
                  <TouchableOpacity
                    style={styles.recipeImgWrapper}
                    activeOpacity={0.88}
                    onPress={() => playRecipeVideo(rec.videoUrl)}
                  >
                    <Image source={getImageUrl(rec.image)} style={styles.recipeImg} resizeMode="cover" />
                    <View style={styles.playOverlay}>
                      <Ionicons name="play-circle" size={38} color="#FFFFFF" />
                    </View>
                    <View style={styles.timeBadge}>
                      <Ionicons name="time-outline" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                      <Text style={styles.timeBadgeText}>{rec.time || '30 Mins'}</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.recipeBody}>
                    <Text style={styles.recipeName} numberOfLines={1}>{rec.name}</Text>
                    <Text style={styles.recipeDesc} numberOfLines={2}>{rec.description || 'Watch step-by-step preparation video'}</Text>
                    <TouchableOpacity
                      style={styles.watchVideoBtn}
                      onPress={() => playRecipeVideo(rec.videoUrl)}
                    >
                      <Ionicons name="play" size={12} color="#FFFFFF" />
                      <Text style={styles.watchVideoBtnText}>Watch Recipe</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Frequently Bought Together Section */}
        {frequentPool && frequentPool.length > 0 && (
          <View style={styles.frequentSection}>
            <Text style={styles.sectionTitle}>{sectionTitleText}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.frequentScroll}>
              {frequentPool.map(renderFrequentCard)}
            </ScrollView>
          </View>
        )}

        {/* Trust Badges */}
        <View style={styles.trustBox}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={16} color="#8B0000" />
            <Text style={styles.trustText}>100% Fresh & Hygienic</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="flash" size={16} color="#8B0000" />
            <Text style={styles.trustText}>30 Mins Local Delivery</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Footer with Add to Cart and Dynamic Combo Drawer */}
      <View style={styles.footerContainer}>
        {addedFrequentItems.length > 0 && (
          <View style={styles.bundleTray}>
            <View style={styles.bundleHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="bag-check" size={15} color="#8B0000" />
                <Text style={styles.bundleTitle}>Frequently Bought Combo ({addedFrequentItems.length + 1} Items)</Text>
              </View>
              <Text style={styles.bundleSub}>Adjust quantities below</Text>
            </View>

            <ScrollView style={styles.bundleListScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {/* Main Product Row */}
              <View style={styles.bundleItemRow}>
                <Image
                  source={getImageUrl(activeProduct?.image || 'fooditems.png')}
                  style={styles.bundleItemImg}
                  resizeMode="cover"
                />
                <View style={styles.bundleItemInfo}>
                  <Text style={styles.bundleItemName} numberOfLines={1}>
                    {activeProduct?.name} <Text style={styles.bundleItemBadge}>(Current)</Text>
                  </Text>
                  <Text style={styles.bundleItemPrice}>
                    {formatPrice((activeProduct?.price || 0) * quantity)}
                  </Text>
                </View>
                <View style={styles.qtyCardControl}>
                  <TouchableOpacity
                    style={styles.qtyCardBtn}
                    activeOpacity={0.8}
                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Ionicons name="remove" size={12} color="#8B0000" />
                  </TouchableOpacity>
                  <Text style={styles.qtyCardText}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyCardBtn}
                    activeOpacity={0.8}
                    onPress={() => setQuantity(quantity + 1)}
                  >
                    <Ionicons name="add" size={12} color="#8B0000" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Added Combo Items */}
              {addedFrequentItems.map((item: any) => {
                const targetId = item.cartItemId || item.id;
                return (
                  <View key={item.id} style={styles.bundleItemRow}>
                    <Image
                      source={getImageUrl(item.image)}
                      style={styles.bundleItemImg}
                      resizeMode="cover"
                    />
                    <View style={styles.bundleItemInfo}>
                      <Text style={styles.bundleItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.bundleItemPrice}>
                        {formatPrice((item.price || 0) * item.quantity)}
                      </Text>
                    </View>
                    <View style={styles.qtyCardControl}>
                      <TouchableOpacity
                        style={styles.qtyCardBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (item.quantity <= 1) {
                            if (typeof removeFromCart === 'function') {
                              removeFromCart(targetId);
                            } else {
                              updateQuantity(targetId, 0);
                            }
                          } else {
                            updateQuantity(targetId, item.quantity - 1);
                          }
                        }}
                      >
                        <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={12} color="#8B0000" />
                      </TouchableOpacity>
                      <Text style={styles.qtyCardText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyCardBtn}
                        activeOpacity={0.8}
                        onPress={() => updateQuantity(targetId, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={12} color="#8B0000" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 12) }]}>
          <View>
            <Text style={styles.priceLabel}>
              {addedFrequentItems.length > 0 ? `Total (${addedFrequentItems.length + 1} Products)` : 'Total Price'}
            </Text>
            <Text style={styles.priceValue}>{formatPrice(combinedTotal)}</Text>
          </View>
          <TouchableOpacity style={styles.addToCartBtn} activeOpacity={0.88} onPress={handleAddToCart}>
            <Ionicons name="cart" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.addToCartText}>
              {addedFrequentItems.length > 0 ? 'Add Combo to Cart' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fullscreen Product Image Modal */}
      <Modal visible={imageModalVisible} transparent animationType="fade">
        <View style={styles.fullImageModalBg}>
          <TouchableOpacity
            style={styles.closeFullImageBtn}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Image
            source={getImageUrl(currentDisplayImage)}
            style={styles.fullProductImg}
            resizeMode="contain"
          />
        </View>
      </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    zIndex: 99,
    elevation: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  cartIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#8B0000',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 80,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 480,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  zoomHintBadge: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  dietBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  dietDotBorder: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dietDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dietBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ratingBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  heartBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  galleryStripContainer: {
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  galleryThumbCard: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  galleryThumbCardActive: {
    borderColor: '#8B0000',
  },
  galleryThumbImg: {
    width: '100%',
    height: '100%',
  },
  detailsBox: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  categoryTag: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryTagText: {
    color: '#8B0000',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  weightText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  mainPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  mainPriceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#8B0000',
  },
  originalPriceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
  },
  unitPriceLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  descSection: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  descText: {
    fontSize: 13.5,
    color: '#4B5563',
    lineHeight: 20,
  },
  cuttingSection: {
    marginTop: 14,
  },
  cuttingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  cuttingChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  cuttingChipActive: {
    borderColor: '#8B0000',
    backgroundColor: '#FEF2F2',
  },
  cuttingChipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  cuttingChipTextActive: {
    color: '#8B0000',
    fontWeight: '700',
  },
  qtySection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  qtyRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  scaledWeightBadge: {
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  scaledWeightText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#9A3412',
  },
  qtyCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 10,
  },
  recipeSection: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 6,
    borderTopColor: '#F3F4F6',
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipeSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 10,
  },
  recipeScroll: {
    marginTop: 4,
  },
  recipeCard: {
    width: 220,
    marginRight: 12,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  recipeImgWrapper: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  recipeImg: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  recipeBody: {
    padding: 10,
  },
  recipeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  recipeDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
  },
  watchVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#8B0000',
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  watchVideoBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  frequentSection: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 6,
    borderTopColor: '#F3F4F6',
  },
  frequentScroll: {
    marginTop: 8,
    paddingBottom: 6,
  },
  frequentCard: {
    width: 140,
    marginRight: 12,
    padding: 0,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  frequentImgBox: {
    width: '100%',
    height: 110,
    backgroundColor: '#FAFAFA',
    borderRadius: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  frequentImg: {
    width: '100%',
    height: '100%',
  },
  viewOverlayBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  viewOverlayText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  frequentName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
    paddingHorizontal: 8,
  },
  frequentWeight: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 1,
    paddingHorizontal: 8,
  },
  frequentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  frequentPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  frequentAddBtn: {
    backgroundColor: '#8B0000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  frequentAddText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  qtyFrequentControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  qtyFrequentBtn: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  qtyFrequentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B0000',
    minWidth: 14,
    textAlign: 'center',
  },
  trustBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8B0000',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bundleTray: {
    maxHeight: 280,
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bundleTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#8B0000',
  },
  bundleSub: {
    fontSize: 11,
    color: '#9A3412',
    fontWeight: '500',
  },
  bundleListScroll: {
    maxHeight: 220,
  },
  bundleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  bundleItemImg: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  bundleItemInfo: {
    flex: 1,
  },
  bundleItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  bundleItemBadge: {
    fontSize: 10,
    color: '#8B0000',
    fontWeight: '800',
  },
  bundleItemPrice: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  qtyCardControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: 6,
  },
  qtyCardBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qtyCardText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B0000',
    minWidth: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  priceLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  fullImageModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullImageBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullProductImg: {
    width: '90%',
    height: '75%',
  },
});
