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

export const MOCK_PRODUCTS: any[] = [];

