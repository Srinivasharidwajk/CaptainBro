import { 
  getRiderStatusDb, 
  updateRiderStatusDb, 
  getOrdersDb,
  OrderData,
  RiderStatusData
} from '../firebase/database';

export const getRiderStatus = async (riderId: string): Promise<RiderStatusData | null> => {
  return await getRiderStatusDb(riderId);
};

export const updateRiderStatus = async (riderId: string, status: 'online' | 'offline' | 'busy'): Promise<RiderStatusData> => {
  return await updateRiderStatusDb(riderId, status);
};

export const getAssignedOrders = async (riderId: string): Promise<OrderData[]> => {
  const allOrders = await getOrdersDb();
  return allOrders.filter(
    (order) => order.riderId === riderId || (order.status === 'accepted' || order.status === 'preparing' || order.status === 'dispatched')
  );
};
