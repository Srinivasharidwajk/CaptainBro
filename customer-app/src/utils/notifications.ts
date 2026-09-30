import { Platform } from 'react-native';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Map order statuses to user-friendly titles and messages
export const getStatusNotificationContent = (status: string, orderId: string, riderName?: string): NotificationPayload => {
  const shortId = (orderId || '').substring(0, 8).toUpperCase();
  switch (status) {
    case 'accepted':
      return {
        title: 'Order Confirmed',
        body: `Your order #${shortId} has been confirmed and accepted by Captain Bro.`,
      };
    case 'preparing':
      return {
        title: 'Kitchen is Preparing',
        body: `Your items for order #${shortId} are being freshly cleaned, packed, and prepared.`,
      };
    case 'out_for_delivery':
    case 'dispatched':
      return {
        title: 'Out for Delivery',
        body: riderName
          ? `Rider ${riderName} is on the way with your order #${shortId}.`
          : `Your order #${shortId} is out for delivery with our rider.`,
      };
    case 'delivered':
      return {
        title: 'Order Delivered',
        body: `Order #${shortId} has been delivered successfully. Enjoy your fresh meal!`,
      };
    case 'cancelled':
      return {
        title: 'Order Cancelled',
        body: `Order #${shortId} has been cancelled. Reach out if you need assistance.`,
      };
    case 'price_quoted':
      return {
        title: 'Price Quote Ready',
        body: `A price quote is ready for your custom order #${shortId}. Tap to review and confirm!`,
      };
    default:
      return {
        title: 'Order Update',
        body: `Order #${shortId} status updated to ${status}.`,
      };
  }
};

/**
 * Trigger an in-app or browser notification for order status change
 */
export const triggerOrderNotification = (status: string, orderId: string, riderName?: string) => {
  const { title, body } = getStatusNotificationContent(status, orderId, riderName);

  // Web Browser Notification if permission granted
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.png',
        });
      } catch (_) {}
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          try {
            new Notification(title, { body, icon: '/favicon.png' });
          } catch (_) {}
        }
      });
    }
  }

  return { title, body };
};
