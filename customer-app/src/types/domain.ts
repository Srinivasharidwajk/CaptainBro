import { UserRole, OrderStatus } from '../utils/constants';

export type { UserRole, OrderStatus };

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  vehicleNumber?: string;
  drivingLicense?: string;
  aadharNumber?: string;
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string | number;
  cartItemId?: string;
  name: string;
  price: number;
  quantity: number;
  weight?: string;
  image?: string;
  cuttingType?: string;
}

export interface OrderData {
  id?: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  address: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  paymentId?: string;
  paymentStatus?: 'paid' | 'pending_cod' | 'failed';
  status: OrderStatus | 'pending_review' | 'price_quoted';
  riderId?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  deliveryPin?: string;
  rating?: number;
  reviewText?: string;
  notes?: string;
  deliveryInstructions?: string;
  deliverySchedule?: string;
  scheduledDate?: string;
  scheduledSlot?: string;
  pincode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RiderStatusData {
  id: string;
  status: 'online' | 'offline' | 'busy';
  currentLatitude?: number;
  currentLongitude?: number;
  updatedAt?: string;
  drivingLicense?: string;
  aadharNumber?: string;
  vehicleNumber?: string;
  name?: string;
  phone?: string;
}

export interface OrderTrackingData {
  orderId: string;
  status: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  updatedAt?: string;
}

export interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  addressLine: string;
  pincode: string;
  type?: string;
  isDefault?: boolean;
}

export interface ProductData {
  id: string;
  name: string;
  price: number;
  category: string;
  weight?: string;
  image?: string;
  additionalImages?: string[];
  videoUrl?: string;
  recipeVideos?: any[];
  frequentlyBought?: any[];
  description?: string;
  sub?: string;
  rating?: number;
  inStock?: boolean;
  stockQuantity?: number;
  cuttingOptions?: string[];
  updatedAt?: string;
}

export interface CartItem extends OrderItem {}
