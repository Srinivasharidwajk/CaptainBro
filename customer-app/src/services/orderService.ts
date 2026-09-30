import { 
  createOrderDb, 
  getOrdersDb, 
  getOrdersByUserDb,
  getOrderByIdDb,
  updateOrderStatusDb,
  updateOrderFieldsDb,
  subscribeToOrdersDb,
  subscribeToOrdersByUserDb,
  subscribeToOrderByIdDb,
  deleteAllOrdersDb,
  cancelOrderDb,
  OrderData
} from '../firebase/database';

export const createOrder = async (orderData: OrderData): Promise<OrderData> => {
  return await createOrderDb(orderData);
};

export const getOrders = async (userId?: string): Promise<OrderData[]> => {
  return await getOrdersDb(userId);
};

export const getOrdersByUser = async (userId: string): Promise<OrderData[]> => {
  return await getOrdersByUserDb(userId);
};

export const getOrderById = async (orderId: string): Promise<OrderData | null> => {
  return await getOrderByIdDb(orderId);
};

export const deleteAllOrders = async (): Promise<void> => {
  return await deleteAllOrdersDb();
};

export const updateOrderStatus = async (id: string, status: string, riderId: string | null = null) => {
  return await updateOrderStatusDb(id, status, riderId);
};

export const updateOrderFields = async (id: string, fields: Partial<OrderData>) => {
  return await updateOrderFieldsDb(id, fields);
};

export const subscribeToOrders = (callback: (orders: OrderData[]) => void, userId?: string) => {
  return subscribeToOrdersDb(callback, userId);
};

export const subscribeToOrdersByUser = (userId: string, callback: (orders: OrderData[]) => void) => {
  return subscribeToOrdersByUserDb(userId, callback);
};

export const subscribeToOrderById = (orderId: string, callback: (order: OrderData | null) => void) => {
  return subscribeToOrderByIdDb(orderId, callback);
};

export const cancelOrder = async (orderId: string): Promise<boolean> => {
  return await cancelOrderDb(orderId);
};

