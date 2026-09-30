import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { loadState, saveState } from '../utils/helpers';

export interface CartItem {
  id: string;
  cartItemId?: string;
  name: string;
  price: number;
  weight?: string;
  image?: string;
  quantity: number;
  cuttingType?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: any, quantity?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  deliveryFee: number;
  couponCode?: string;
  discount?: number;
  orderTotal: number;
  wishlistItems: any[];
  toggleWishlist: (product: any) => void;
  isWishlisted: (productId: string) => boolean;
}

export const CartContext = createContext<CartContextType>({} as CartContextType);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [couponCode, setCouponCode] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const items = await loadState<CartItem[]>('cart_items', []);
      const wishList = await loadState<any[]>('wishlist_items', []);
      setCartItems(items);
      setWishlistItems(wishList);
      setIsLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveState('cart_items', cartItems);
      saveState('wishlist_items', wishlistItems);
    }
  }, [cartItems, wishlistItems, isLoaded]);

  const addToCart = (product: any, quantity = 1) => {
    if (!product) return;
    const baseId = String(product.cartItemId || product.id || 'item_' + Date.now());
    const cartItemId = baseId + (product.cuttingType ? `-${product.cuttingType.replace(/\s+/g, '')}` : '');
    const priceNum = typeof product.price === 'number' ? product.price : parseFloat(product.price || 0) || 0;

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => (item.cartItemId || item.id) === cartItemId);
      if (existingItem) {
        return prevItems.map((item) =>
          (item.cartItemId || item.id) === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { ...product, id: baseId, cartItemId, price: priceNum, quantity }];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => (item.cartItemId || item.id) !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        (item.cartItemId || item.id) === cartItemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const toggleWishlist = (product: any) => {
    if (!product || !product.id) return;
    const pId = String(product.id);
    setWishlistItems((prev) => {
      const exists = prev.some((item) => String(item.id) === pId);
      if (exists) {
        return prev.filter((item) => String(item.id) !== pId);
      }
      return [...prev, product];
    });
  };

  const isWishlisted = (productId: string) => {
    if (!productId) return false;
    const pId = String(productId);
    return wishlistItems.some((item) => String(item.id) === pId);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => {
    const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price as any || 0) || 0;
    return acc + itemPrice * item.quantity;
  }, 0);
  const deliveryFee = cartTotal > 300 || cartTotal === 0 ? 0 : 25;
  const orderTotal = Math.max(0, cartTotal + deliveryFee - discount);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      cartTotal,
      deliveryFee,
      couponCode,
      discount,
      orderTotal,
      wishlistItems,
      toggleWishlist,
      isWishlisted
    }}>
      {children}
    </CartContext.Provider>
  );
};
