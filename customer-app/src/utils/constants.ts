export const ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  RIDER: 'rider',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DISPATCHED: 'dispatched',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const CATEGORIES = [
  { id: 'meat', name: "Meat &\nSeafood", image: 'chicken-category.png', sub: 'Chicken, Mutton, Fish & Prawns' },
  { id: 'our-products', name: "Our Brand\nProducts", image: 'fooditems.png', sub: 'Captain Bro Signature & Masalas' },
  { id: 'vegetables', name: "Fresh\nVegetables", image: 'onions.png', sub: 'Farm Fresh Vegetables & Greens' },
  { id: 'fruits', name: "Fresh\nFruits", image: 'fruits-category.png', sub: 'Farm Fresh Sweet Fruits' },
  { id: 'grocery', name: "Daily\nGroceries", image: 'cooking-oil.png', sub: 'Cooking Essentials, Oils & Dairy' },
  { id: 'pickles', name: "Homemade\nPickles", image: 'pickles-category.png', sub: 'Traditional Veg & Non-Veg Pickles' },
  { id: 'home-foods', name: "Home\nFoods", image: 'sakinalu.png', sub: 'Telangana Sweets, Sakinalu & Snacks' }
];

export const MOCK_PRODUCTS = [
  {
    id: 'p1',
    name: 'Tender Chicken Curry Cut',
    category: 'meat',
    price: 160,
    weight: '500g',
    description: 'Fresh, skinless, bone-in chicken curry cut sourced directly from local farms.',
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    rating: 4.8
  },
  {
    id: 'p2',
    name: 'Premium Goat Mutton',
    category: 'meat',
    price: 420,
    weight: '500g',
    description: 'Juicy and tender cuts of fresh goat meat, perfect for slow cooking and rich masalas.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    rating: 4.9
  },
  {
    id: 'p3',
    name: 'Fresh Koramanu (Murrel Fish)',
    category: 'meat',
    price: 380,
    weight: '1000g',
    description: 'Cleaned, scaled, and sliced murrel fish ready for frying or curry.',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    rating: 4.7
  },
  {
    id: 'p4',
    name: 'Jumbo Prawns',
    category: 'meat',
    price: 200,
    weight: '500g',
    description: 'Fresh shell-off, de-veined jumbo prawns with zero preservatives.',
    image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    rating: 4.6
  },
  {
    id: 'p5',
    name: 'Organic Farm Onions',
    category: 'vegetables',
    price: 35,
    weight: '1kg',
    description: 'Crisp, flavorful farm-grown red onions.',
    image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    rating: 4.7
  },
  {
    id: 'p40',
    name: 'Chilli Powder',
    category: 'our-products',
    price: 145,
    weight: '500g',
    description: 'Pure and authentic spice powder from Captain Bro.',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    rating: 4.9
  },
  {
    id: 'p11',
    name: 'Fresh Thick Curd Cup',
    category: 'grocery',
    price: 20,
    weight: '500g',
    description: 'Creamy thick dairy curd cup.',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    rating: 4.8
  },
  {
    id: 'p12',
    name: 'Cold Pressed Groundnut Oil',
    category: 'our-products',
    price: 180,
    weight: '500ml',
    description: 'Pure cold pressed natural cooking oil.',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    rating: 4.9
  },
  {
    id: 'p24',
    name: 'Fresh Malai Paneer',
    category: 'meat',
    price: 150,
    weight: '500g',
    description: 'Fresh, rich, and creamy malai paneer cubes prepared daily with 100% pure milk.',
    image: 'https://firebasestorage.googleapis.com/v0/b/captain-bro-app.firebasestorage.app/o/ChatGPT%20Image%20Aug%2026%2C%202026%2C%2012_37_43%20AM.png?alt=media&token=1458f702-675b-452a-b309-9d635308d214',
    inStock: true,
    rating: 4.9
  },
  {
    id: 'p45',
    name: 'Kerala Masala Powder',
    category: 'our-products',
    price: 90,
    weight: '250g',
    description: 'Kerala Masala Powder • Our Brand Products',
    image: 'https://firebasestorage.googleapis.com/v0/b/captain-bro-app.firebasestorage.app/o/captain-bro-kerala-masala%20(1)%20(1).jpg?alt=media&token=79c4a2b1-5118-4e0f-81d4-0242a3af563f',
    inStock: true,
    rating: 4.8
  }
];
