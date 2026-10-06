import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Modal,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavbar from '@/components/BottomNavbar';
import { CartContext } from '@/context/CartContext';
import { AuthContext } from '@/context/AuthContext';
import { formatWeight, loadState, saveState } from '@/utils/helpers';

import { getProductsDb, subscribeToProductsDb, sortProductsByPriority } from '@/firebase/database';
import HeroBanners from '@/components/customer/HeroBanners';
import CategoryGrid from '@/components/customer/CategoryGrid';
import TestimonialsSection from '@/components/customer/TestimonialsSection';
import LocationModal from '@/components/customer/LocationModal';

const rawWidth = Dimensions.get('window').width;
const SCREEN_WIDTH = Math.min(rawWidth && rawWidth > 0 ? rawWidth : 375, 480);
const BANNER_WIDTH = SCREEN_WIDTH - 20;
const BANNER_HEIGHT = BANNER_WIDTH * 0.48;

// Core UI Branding Assets
const LOCAL_IMAGES: Record<string, any> = {
  'mobilebannerone.png': require('../../assets/images/mobilebannerone.png'),
  'bannerone.png': require('../../assets/images/bannerone.png'),
  'bannertwo.png': require('../../assets/images/bannertwo.png'),
  'bannerthree.png': require('../../assets/images/bannerthree.png'),
  'bannerfour.png': require('../../assets/images/bannerfour.png'),
  'fooditems.png': require('../../assets/images/fooditems.png'),
  'fooditems1.png': require('../../assets/images/fooditems1.png'),
  'fruits-category.png': require('../../assets/images/fruits-category.png'),
  'chicken-category.png': require('../../assets/images/chicken-category.png'),
  'pickles-category.png': require('../../assets/images/pickles-category.png'),
  'onions.png': require('../../assets/images/onions.png'),
  'cooking-oil.png': require('../../assets/images/cooking-oil.png'),
  'captain-bro-logo.png': require('../../assets/images/captain-bro-logo.png'),
  'our-brand.png': require('../../assets/images/our-brand.png'),
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

const MULTILINGUAL_LABELS: any = {
  categories: {
    chicken: { en: 'chicken', te: 'చికెన్', hi: 'चिकन' },
    mutton: { en: 'mutton', te: 'మటన్', hi: 'मटन' },
    fish: { en: 'fish', te: 'చేపలు', hi: 'मछली' },
    prawns: { en: 'prawns', te: 'రొయ్యలు', hi: 'झींगे' },
    grocery: { en: 'grocery', te: 'కిరాణా', hi: 'किराना' },
    vegetables: { en: 'vegetables', te: 'కూరగాయలు', hi: 'सब्जियां' },
    fruits: { en: 'fruits', te: 'పండ్లు', hi: 'फल' }
  },
  products: {
    p5: { en: 'onion', te: 'ఉల్లిపాయ', hi: 'प्याज' },
    p6: { en: 'green chilli', te: 'పచ్చిమిర్చి', hi: 'हरी मिर्च' },
    p7: { en: 'coriander', te: 'కొత్తిమీర', hi: 'धनिया' },
    p8: { en: 'lemon', te: 'నిమ్మకాయ', hi: 'नींबू' },
    p9: { en: 'basmati rice', te: 'బాస్మతి బియ్యం', hi: 'बासमती चावल' },
    p10: { en: 'cooking oil', te: 'వంట నూనె', hi: 'खाना पकाने का तेल' },
    p11: { en: 'curd', te: 'పెరుగు', hi: 'दही' },
    p12: { en: 'chilli powder', te: 'కారం పొడి', hi: 'लाल मिर्च पाउडर' },
    p13: { en: 'ginger garlic paste', te: 'అల్లం వెల్లుల్లి పేస్ట్', hi: 'अदरक लहसुन का पेस्ट' },
    p14: { en: 'mint', te: 'పుదీనా', hi: 'पुदीना' },
    p15: { en: 'masala powder', te: 'మసాలా పొడి', hi: 'మసాలా పొడి' },
    p16: { en: 'raw masala mix', te: 'మసాలా దినుసులు', hi: 'खड़ा मसाला' },
    p17: { en: 'sona masuri rice', te: 'సోనా మసూరి బియ్యం', hi: 'सोना मसूरी चावल' },
    p23: { en: 'banana', te: 'అరటిపండు', hi: 'కేలా' },
    p24: { en: 'paneer', te: 'పన్నీర్', hi: 'पनीर' },
    p36: { en: 'mango pickle', te: 'మామిడికాయ పచ్చడి', hi: 'आम का अचार' },
    p37: { en: 'tomato pickle', te: 'టమాటా పచ్చడి', hi: 'टमाटर का अचार' },
    p38: { en: 'chicken pickle', te: 'చికెన్ పచ్చడి', hi: 'चिकन का अचार' },
    p40: { en: 'chilli powder', te: 'కారం పొడి', hi: 'लाल मिर्च पाउडर' },
    p41: { en: 'turmeric powder', te: 'పసుపు పొడి', hi: 'हल्दी पाउडर' },
    p42: { en: 'coriander powder', te: 'ధనియాల పొడి', hi: 'धनिया पाउडर' },
    p43: { en: 'natural sugar', te: 'సహజ పంచదార', hi: 'प्राकृतिक चीनी' },
    p44: { en: 'natural jaggery', te: 'సహజ బెల్లం', hi: 'प्राकृतिक गुड़' },
    p45: { en: 'Kerala Masala Powder', te: 'కేరళ మసాలా పొడి', hi: 'केरल मसाला पाउडर' },
    p46: { en: 'masala powder', te: 'మసాలా పొడి', hi: 'మసాలా పొడి' },
    p47: { en: 'milkshake powder', te: 'మిల్క్ షేక్ పొడి', hi: 'మిల్క్ షేక్ పౌడర్' },
    p48: { en: 'face pack', te: 'ఫేస్ ప్యాక్', hi: 'फेस पैक' },
    p49: { en: 'dry fruits mix', te: 'డ్రై ఫ్రూట్స్ మిక్స్', hi: 'ड्राई फ्रूट्स मिक्स' },
    p50: { en: 'face pack for men', te: 'పురుషుల ఫేస్ ప్యాక్', hi: 'पुरुषों के लिए फेस पैक' },
    p51: { en: 'face pack for kids', te: 'పిల్లల ఫేస్ ప్యాక్', hi: 'बच्चों के लिए फेस पैक' },
    p52: { en: 'protein shake powder', te: 'ప్రోటీన్ షేక్ పొడి', hi: 'प्रोटीन शेक पाउडर' },
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

const TESTIMONIALS = [
  {
    id: 't1',
    name: 'Abhishek S. (NIT W)',
    meta: '21 yrs • Student • Kazipet',
    text: '"Hostel food bore kottinappudu directly ordering chicken wings from here! Acha quality and clean packaging, super fast delivery too. చికెన్ చాలా బాగుంది!"',
    stars: 5,
  },
  {
    id: 't2',
    name: 'Sireesha K.',
    meta: '42 yrs • Homemaker • Kazipet',
    text: '"ఉల్లిపాయలు, కొత్తిమీర చాలా తాజాగా ఉన్నాయి! Very fresh organic vegetables. Direct గా ఇంటికే డెలివరీ చేయడం వల్ల మార్కెట్ కి వెళ్లే శ్రమ తగ్గింది. ధన్యవాదాలు!"',
    stars: 5,
  },
  {
    id: 't3',
    name: 'Ramesh Varma',
    meta: '64 yrs • Retired Manager • Hanamkonda',
    text: '"మటన్ కటింగ్ చాలా నీట్ గా చేసారు. Sunday morning meat shop దగ్గర line లో నిలబడే కష్టం తప్పింది. Fresh and tender goat mutton, whole family loved it!"',
    stars: 5,
  },
  {
    id: 't4',
    name: 'Deepika Reddy',
    meta: '28 yrs • Software Engineer (WFH) • Naimnagar',
    text: '"Work from home time lo quick cooking ki groundnut oil and chicken pickle order chesa. Taste exactly intlo chesinatte undi! Super convenient 20 mins delivery."',
    stars: 5,
  },
  {
    id: 't5',
    name: 'Venkat Rao',
    meta: '56 yrs • School Teacher • Hunter Road',
    text: '"మా ఆవిడ Telangana Sakinalu & Sarva Pindi taste చూసి authentic traditional flavor అని మెచ్చుకుంది. Fresh grocery and genuine quality products."',
    stars: 5,
  },
  {
    id: 't6',
    name: 'Harsha Vardhan',
    meta: '24 yrs • UPSC Aspirant • Subedari',
    text: '"Late night study sessions ki snacks and morning breakfast items/fruits order chestuntanu. Fresh bananas, apples with super fast delivery in Warangal!"',
    stars: 5,
  },
  {
    id: 't7',
    name: 'Dr. Ananya P.',
    meta: '34 yrs • Pediatrician • KMC Warangal',
    text: '"As a doctor, hygiene is my top priority. Meat cuts are cleanly packed, odorless and truly fresh. Best daily essentials app for working mothers."',
    stars: 5,
  },
  {
    id: 't8',
    name: 'Narsimha Chary',
    meta: '71 yrs • Senior Citizen • Waddepally',
    text: '"వయస్సు వల్ల మార్కెట్ కి వెళ్లలేకపోతున్నాను. ఫోన్ లో ఆర్డర్ చేయగానే చక్కగా ఇంటి తలుపు దగ్గరికే తెచ్చి ఇచ్చారు. మంచి గౌరవప్రదమైన డెలివరీ సర్వీస్."',
    stars: 5,
  },
  {
    id: 't9',
    name: 'Kavitha & Sravan',
    meta: '31 yrs • Young Parents • Kishanpura',
    text: '"Fresh thick curd, paneer and organic vegetables daily maa pillala diet kosam teesukuntunnam. Pure quality with zero adulteration. Really happy with Captain Bro!"',
    stars: 5,
  },
  {
    id: 't10',
    name: 'Bhanu Prakash',
    meta: '19 yrs • B.Tech Student • KITS Warangal',
    text: '"Friends tho weekend room lo cook cheskovadaniki boneless chicken and masala powder order chesam. Biryani superb vachindi brother! Pocket friendly prices too."',
    stars: 5,
  },
  {
    id: 't11',
    name: 'Lakshmi Prasanna',
    meta: '49 yrs • Boutique Owner • Ramnagar',
    text: '"మామిడికాయ పచ్చడి (Mango Pickle) and Dhanaya powder taste adbhutam! Pure traditional homemade aroma with perfect spice balance."',
    stars: 5,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { cartCount } = useContext(CartContext);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('Warangal, Hanamkonda');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  useEffect(() => {
    // Check if new customer needs first-time onboarding
    AsyncStorage.getItem('@captainbro_has_onboarded_v1').then((hasOnboarded) => {
      if (!hasOnboarded) {
        router.replace('/onboarding' as any);
      }
    }).catch(() => {});

    loadState<string>('user_location', 'Warangal, Hanamkonda').then((loc) => {
      if (loc) setSelectedLocation(loc);
    });
  }, []);

  const handleSelectLocation = (loc: string) => {
    setSelectedLocation(loc);
    saveState('user_location', loc);
    setIsLocationOpen(false);
  };

  const handleDetectGPSLocation = () => {
    setIsDetectingGps(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const detectedLoc = `Warangal (GPS: ${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;
          setSelectedLocation(detectedLoc);
          saveState('user_location', detectedLoc);
          setIsDetectingGps(false);
          setIsLocationOpen(false);
          Alert.alert('GPS Location Detected', `Updated delivery area to ${detectedLoc}`);
        },
        (err) => {
          setIsDetectingGps(false);
          const fallbackLoc = 'Warangal City (GPS Auto)';
          setSelectedLocation(fallbackLoc);
          saveState('user_location', fallbackLoc);
          setIsLocationOpen(false);
          Alert.alert('Location Detected', `Set to ${fallbackLoc}`);
        },
        { timeout: 5000 }
      );
    } else {
      setIsDetectingGps(false);
      const fallbackLoc = 'Warangal City (GPS Auto)';
      setSelectedLocation(fallbackLoc);
      saveState('user_location', fallbackLoc);
      setIsLocationOpen(false);
      Alert.alert('Location Detected', `Set to ${fallbackLoc}`);
    }
  };

  const mergeProducts = (dbProds: any[]) => {
    if (!dbProds || !Array.isArray(dbProds)) return [];
    return sortProductsByPriority(dbProds);
  };

  useEffect(() => {
    // Non-blocking background sync for Firestore product catalog updates
    const timer = setTimeout(() => {
      getProductsDb().then((prods) => {
        setProducts(mergeProducts(prods || []));
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

  const slideBanners = [
    { img: LOCAL_IMAGES['bannerone.png'], category: 'our-products', label: 'Our Products' },
    { img: LOCAL_IMAGES['bannertwo.png'], category: 'home-foods', label: 'Home Foods' },
    { img: LOCAL_IMAGES['bannerthree.png'], category: 'pickles', label: 'Homemade Pickles' },
    { img: LOCAL_IMAGES['bannerfour.png'], category: 'meat', label: 'Fresh Meat & Seafood' },
  ];

  const [activeSlide, setActiveSlide] = useState(0);
  const bannerFlatListRef = useRef<FlatList>(null);

  // Auto Slide Carousel Interval
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

  const handleNavigate = (path: string, params?: Record<string, string>) => {
    if (params?.category) {
      router.push({ pathname: '/products' as any, params: { category: params.category } });
    } else if (params?.search) {
      router.push({ pathname: '/products' as any, params: { search: params.search } });
    } else {
      router.push(path as any);
    }
  };

  const findProductByMatch = (id: string, searchKeywords: string[]) => {
    return (
      products.find((p) => p.id === id) ||
      products.find((p) => {
        const nameLower = (p.name || '').toLowerCase();
        return searchKeywords.some((kw) => nameLower.includes(kw));
      })
    );
  };

  const matchedPicks = [
    findProductByMatch('p40', ['chilli powder', 'mirchi', 'chilli', 'karam']),
    findProductByMatch('p1', ['chicken curry', 'chicken', 'curry cut', 'tender chicken']),
    findProductByMatch('p24', ['paneer', 'panner', 'malai paneer', 'punner']),
    findProductByMatch('prod_1788002158982_7brq', ['kerala masala', 'kerala', 'masala powder', 'kerala masala powder']),
  ].filter(Boolean);

  const topFourRecommendations = matchedPicks.length > 0
    ? Array.from(new Set([...matchedPicks, ...products])).slice(0, 4)
    : products.slice(0, 4);

  const filteredProducts = activeCategory
    ? products.filter((p) => isProductInCat(p, activeCategory))
    : topFourRecommendations;

  const isProductInCat = (p: any, catId: string) => {
    if (!p) return false;
    const c = (p.category || '').toLowerCase().trim();
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

  const getMeatPriority = (p: any) => {
    if (typeof p.priority === 'number' && p.priority > 0) return p.priority;
    if (typeof p.priority === 'string' && parseInt(p.priority, 10) > 0) return parseInt(p.priority, 10);
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    // 1. Primary Chicken
    if (p.id === 'p1' || (cat === 'chicken' && (name.includes('curry cut') || name.includes('tender')))) return 1001;
    // 2. Primary Mutton
    if (p.id === 'p2' || (cat === 'mutton' && (name.includes('goat') || name.includes('curry')))) return 1002;
    // 3. Primary Panner / Paneer
    if (p.id === 'p24' || name.includes('paneer') || name.includes('panner')) return 1003;
    // 4. Primary Fish
    if (p.id === 'p3' || (cat === 'fish' && (name.includes('koramanu') || name.includes('murrel')))) return 1004;
    // 5. Primary Prawns
    if (p.id === 'p4' || (cat === 'prawns' && (name.includes('fresh prawns') || name.includes('jumbo')))) return 1005;
    // 6. All remaining Chicken types
    if (cat === 'chicken' || name.includes('chicken')) return 1006;
    // 7. All remaining Mutton types
    if (cat === 'mutton' || name.includes('mutton')) return 1007;
    // 8. All remaining Fish & Prawns types
    if (cat === 'fish' || name.includes('fish') || cat === 'prawns' || name.includes('prawns')) return 1008;
    return 1009;
  };

  const getOurBrandPriority = (p: any) => {
    if (typeof p.priority === 'number' && p.priority > 0) return p.priority;
    if (typeof p.priority === 'string' && parseInt(p.priority, 10) > 0) return parseInt(p.priority, 10);
    const name = (p.name || '').toLowerCase();
    const weight = (p.weight || '').toLowerCase();
    // 1. Groundnut Oil (1000ml / 1L)
    if (
      p.id === 'p53' ||
      p.id === 'p55' ||
      ((name.includes('groundnut') || name.includes('peanut')) && (weight.includes('1000') || weight.includes('1l') || name.includes('1000') || name.includes('1l') || name.includes('1000ml') || name.includes('1 litre')))
    ) return 1001;
    // 2. Chilli Powder
    if (p.id === 'p40' || (name.includes('chilli') && name.includes('powder')) || name.includes('karam')) return 1002;
    // 3. Turmeric Powder
    if (p.id === 'p41' || (name.includes('turmeric') && name.includes('powder')) || name.includes('pasupu')) return 1003;
    // 4. Natural Sugar Deshi
    if (p.id === 'p43' || name.includes('natural sugar') || name.includes('sugar deshi') || name.includes('deshi sugar') || name.includes('sugar')) return 1004;
    // 5. Kerala Masala Powder
    if (p.id === 'p45' || name.includes('kerala')) return 1005;
    // 6. General Gravy Powder / All In One Masala
    if (p.id === 'p46' || name.includes('gravy powder') || name.includes('gravy') || name.includes('all in one')) return 1006;
    // 7. Natural Jaggery (Bellam)
    if (p.id === 'p44' || name.includes('jaggery') || name.includes('bellam')) return 1007;
    // 8. Dhanaya / Coriander Powder
    if (p.id === 'p42' || name.includes('dhanaya') || name.includes('coriander powder')) return 1008;
    // 10. Groundnut Oil (500ml / other oil - Last)
    if (p.id === 'p54' || name.includes('groundnut') || name.includes('peanut oil') || name.includes('oil')) return 1010;
    // 9. Other brand products
    return 1009;
  };

  const getPicklePriority = (p: any) => {
    if (typeof p.priority === 'number' && p.priority > 0) return p.priority;
    if (typeof p.priority === 'string' && parseInt(p.priority, 10) > 0) return parseInt(p.priority, 10);
    const name = (p.name || '').toLowerCase();
    // 1. Mango Pickle
    if (p.id === 'p36' || (name.includes('mango') && (name.includes('pickle') || name.includes('pachadi')))) return 1001;
    // 2. Chicken Pickle
    if (p.id === 'p38' || (name.includes('chicken') && (name.includes('pickle') || name.includes('pachadi')))) return 1002;
    // 3. Lemon Pickle
    if (p.id === 'p37' || p.id === 'p75' || (name.includes('lemon') && (name.includes('pickle') || name.includes('pachadi'))) || name.includes('nimmakaya')) return 1003;
    // 4. Chintakaya Pachadi / Pickle
    if (name.includes('chintakaya') || name.includes('chinta') || name.includes('tamarind') || name.includes('chintha')) return 1004;
    // 5. Tomato Pickle
    if (name.includes('tomato')) return 1005;
    // 6. Gongura Pickle
    if (name.includes('gongura')) return 1006;
    // 7. Mutton Pickle
    if (name.includes('mutton')) return 1007;
    // 8. Other pickles
    return 1008;
  };

  const rawMeatProducts = products.filter((p) => isProductInCat(p, 'meat'));
  const meatProducts = [...rawMeatProducts].sort((a, b) => getMeatPriority(a) - getMeatPriority(b));
  const rawCaptainBroProducts = products.filter((p) => isProductInCat(p, 'our-products'));
  const captainBroProducts = [...rawCaptainBroProducts].sort((a, b) => getOurBrandPriority(a) - getOurBrandPriority(b));
  const vegetables = sortProductsByPriority(products.filter((p) => isProductInCat(p, 'vegetables')));
  const fruits = sortProductsByPriority(products.filter((p) => isProductInCat(p, 'fruits')));
  const groceries = sortProductsByPriority(products.filter((p) => isProductInCat(p, 'grocery')));
  const rawPickles = products.filter((p) => isProductInCat(p, 'pickles'));
  const pickles = [...rawPickles].sort((a, b) => getPicklePriority(a) - getPicklePriority(b));
  const homeFoods = sortProductsByPriority(products.filter((p) => isProductInCat(p, 'home-foods')));

  const safeSearchQuery = typeof searchQuery === 'string' ? searchQuery : '';

  const autocompleteSuggestions = safeSearchQuery.trim()
    ? products
      .filter((p) => {
        const query = safeSearchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(query) ||
          p.sub?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
        );
      })
      .slice(0, 5)
    : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* App Top Branding Header */}
      <View style={styles.topHeader}>
        <Image
          source={LOCAL_IMAGES['captain-bro-logo.png']}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        <TouchableOpacity
          onPress={() => router.push('/cart' as any)}
          style={styles.cartHeaderBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="cart" size={24} color="#111827" />
          {cartCount > 0 && (
            <View style={styles.cartBadgeDot}>
              <Text style={styles.cartBadgeDotText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Bar Container with Elevated Dropdown */}
        <View style={[styles.searchWrapper, { pointerEvents: 'box-none' }]}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              placeholder="Search for mutton, chicken, fish, greens..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onSubmitEditing={() => {
                setShowSuggestions(false);
                handleNavigate('/products', { search: searchQuery });
              }}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
                style={styles.clearIcon}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Overlay Dropdown */}
          {showSuggestions && safeSearchQuery.trim().length > 0 && (
            <View style={styles.suggestionsContainer}>
              {autocompleteSuggestions.length > 0 ? (
                autocompleteSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      setShowSuggestions(false);
                      setSearchQuery('');
                      router.push({ pathname: `/product/${item.id}` as any });
                    }}
                    style={styles.suggestionItem}
                    activeOpacity={0.7}
                  >
                    <Image source={getImageUrl(item.image)} style={styles.suggestionImg} resizeMode="cover" />
                    <View style={styles.suggestionTextCol}>
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.suggestionSub} numberOfLines={1}>
                        {item.sub || item.category}
                      </Text>
                    </View>
                    <Text style={styles.suggestionPrice}>{formatPrice(item.price)}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No matching fresh items found.</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Auto-sliding Banner Showcase */}
        <HeroBanners onBannerPress={(category) => handleNavigate('/products', { category })} />

        {/* Shop by Category Section */}
        <CategoryGrid
          onSelectCategory={(category) => handleNavigate('/products', { category })}
          onSeeAll={() => handleNavigate('/products')}
        />



        {/* Top Recommendations Section (2x2 Grid Matching Screenshot 4) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Recommendations</Text>
          <TouchableOpacity
            onPress={() => handleNavigate('/products')}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={14} color="#8B0000" />
          </TouchableOpacity>
        </View>

        <View style={styles.productGrid}>
          {filteredProducts.slice(0, 4).map((p) => (
            <View key={p.id} style={styles.productGridCol}>
              <ProductCard product={p} onPress={() => router.push({ pathname: `/product/${p.id}` as any })} />
            </View>
          ))}
        </View>

        {/* Fresh Meat & Panner Section */}
        {meatProducts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fresh Meat & Panner</Text>
              <TouchableOpacity
                onPress={() => handleNavigate('/products', { category: 'meat' })}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <Ionicons name="chevron-forward" size={14} color="#8B0000" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {meatProducts.map((p) => (
                <View key={p.id} style={styles.horizontalCardWrapper}>
                  <ProductCard product={p} onPress={() => router.push({ pathname: `/product/${p.id}` as any })} />
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Our Products Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Our Products</Text>
          <TouchableOpacity
            onPress={() => handleNavigate('/products', { category: 'our-products' })}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={14} color="#8B0000" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {captainBroProducts.map((p) => (
            <View key={p.id} style={styles.horizontalCardWrapper}>
              <ProductCard product={p} onPress={() => router.push({ pathname: `/product/${p.id}` as any })} />
            </View>
          ))}
        </ScrollView>



        {/* Homemade Pickles Section */}
        {pickles.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Homemade Pickles</Text>
              <TouchableOpacity
                onPress={() => handleNavigate('/products', { category: 'pickles' })}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <Ionicons name="chevron-forward" size={14} color="#8B0000" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {pickles.map((p) => (
                <View key={p.id} style={styles.horizontalCardWrapper}>
                  <ProductCard product={p} onPress={() => router.push({ pathname: `/product/${p.id}` as any })} />
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Telangana Home Foods & Sweets Section */}
        {homeFoods.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Telangana Home Foods & Sweets</Text>
              <TouchableOpacity
                onPress={() => handleNavigate('/products', { category: 'home-foods' })}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <Ionicons name="chevron-forward" size={14} color="#8B0000" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {homeFoods.map((p) => (
                <View key={p.id} style={styles.horizontalCardWrapper}>
                  <ProductCard product={p} onPress={() => router.push({ pathname: `/product/${p.id}` as any })} />
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Promo Banner (Delivering in 10-25 Min) */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleNavigate('/products')}
          style={styles.promoBannerContainer}
        >
          <Image
            source={LOCAL_IMAGES['mobilebannerone.png'] || LOCAL_IMAGES['CloudKitImg.png']}
            style={styles.promoBannerImg}
            resizeMode="cover"
          />
        </TouchableOpacity>

        {/* Testimonials Section (Loved by Locals) */}
        <TestimonialsSection />

        {/* Location Popup Modal */}
        <LocationModal
          visible={isLocationOpen}
          selectedLocation={selectedLocation}
          isDetectingGps={isDetectingGps}
          onClose={() => setIsLocationOpen(false)}
          onSelectLocation={handleSelectLocation}
          onDetectGps={handleDetectGPSLocation}
        />

      </ScrollView>
      <BottomNavbar />
    </SafeAreaView>
  );
}

// Product Card Component matching exact web screenshots UI
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
  const isOutOfStock = product.inStock === false || (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0);

  const handleAdd = (e: any) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (onPress) {
      onPress();
    } else {
      router.push(`/product/${product.id}` as any);
    }
  };

  const handleIncrement = (e: any) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (typeof product.stockQuantity === 'number' && quantity >= product.stockQuantity) {
      Alert.alert('Maximum Stock Reached', `Only ${product.stockQuantity} units are currently available.`);
      return;
    }
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
                params: { redirectTo: '/' },
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
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, isOutOfStock && { opacity: 0.85 }]}>
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
            <Text style={styles.ratingText}>{product.rating || '4.9'}</Text>
          </View>
        </View>

        <Text style={styles.cardCategory} numberOfLines={1}>
          {getSubtextLabel(product)}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <Text style={styles.cardPrice}>{formatPrice(product.price * (quantity > 0 ? quantity : 1))}</Text>
        {isOutOfStock ? (
          <View style={{ paddingHorizontal: 7, paddingVertical: 4, backgroundColor: '#FEE2E2', borderRadius: 6, borderWidth: 1, borderColor: '#FECACA' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626' }}>OUT OF STOCK</Text>
          </View>
        ) : quantity > 0 ? (
          <View style={styles.qtyCardControl}>
            <TouchableOpacity style={styles.qtyCardBtn} activeOpacity={0.8} onPress={handleDecrement}>
              <Ionicons name="remove" size={14} color="#8B0000" />
            </TouchableOpacity>
            <Text style={styles.qtyCardText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyCardBtn}
              activeOpacity={0.8}
              onPress={handleIncrement}
              disabled={typeof product.stockQuantity === 'number' && quantity >= product.stockQuantity}
            >
              <Ionicons name="add" size={14} color={typeof product.stockQuantity === 'number' && quantity >= product.stockQuantity ? '#9CA3AF' : '#8B0000'} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.arrowBtn} activeOpacity={0.85} onPress={handleAdd}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// React Native Stylesheet matching exact Web UI
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLogo: {
    width: 120,
    height: 40,
  },
  cartHeaderBtn: {
    padding: 6,
    position: 'relative',
  },
  cartBadgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 9,
    backgroundColor: '#8B0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeDotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 14,
  },
  searchWrapper: {
    zIndex: 1000,
    elevation: 10,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  clearIcon: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    overflow: 'hidden',
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionImg: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  suggestionTextCol: {
    flex: 1,
    marginLeft: 10,
  },
  suggestionName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  suggestionSub: {
    fontSize: 10,
    color: '#6B7280',
  },
  suggestionPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B0000',
  },
  noResults: {
    padding: 14,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  bannerWrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 2,
  },
  bannerItemContainer: {
    width: SCREEN_WIDTH - 24,
    height: BANNER_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: '#8B0000',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#D1D5DB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B0000',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
  },
  categoryCard: {
    width: '49%',
    alignItems: 'center',
  },
  categoryImgBox: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FFFDF9',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  categoryImg: {
    width: '100%',
    height: '100%',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
    textAlign: 'center',
  },
  quickTabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 4,
  },
  quickTabChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickTabChipActive: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#8B0000',
  },
  quickTabChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  quickTabChipTextActive: {
    color: '#8B0000',
    fontWeight: '800',
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
  horizontalScroll: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  horizontalCardWrapper: {
    width: 175,
    marginRight: 12,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 0,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardImgContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
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
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
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
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#92400E',
  },
  cardWeight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  cardInfo: {
    marginTop: 6,
    paddingHorizontal: 8,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  cardCategory: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  arrowBtn: {
    backgroundColor: '#8B0000',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBannerContainer: {
    width: '100%',
    height: BANNER_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  promoBannerImg: {
    width: '100%',
    height: '100%',
  },
  testimonialsSection: {
    gap: 8,
  },
  testimonialHeader: {
    gap: 2,
  },
  testimonialSub: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  testimonialCard: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginRight: 10,
    justifyContent: 'space-between',
    minHeight: 128,
  },
  testimonialText: {
    fontSize: 11.5,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  testimonialFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  reviewerName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  reviewerMeta: {
    fontSize: 9.5,
    color: '#6B7280',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B0000',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  gpsDetectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  locationOptionList: {
    marginTop: 14,
    gap: 8,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  locationOptionSelected: {
    borderColor: '#8B0000',
    backgroundColor: '#FEF2F2',
  },
  locationOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  locationOptionTextSelected: {
    color: '#8B0000',
    fontWeight: '800',
  },
  modalButton: {
    backgroundColor: '#8B0000',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
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
