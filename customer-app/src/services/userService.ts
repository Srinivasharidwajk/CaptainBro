import { getUsersDb, createAdminUserDb, deleteUserDb, UserProfile } from '../firebase/database';
import { UserRole } from '../utils/constants';

export const getUsers = async (): Promise<UserProfile[]> => {
  return await getUsersDb();
};

export const deleteUser = async (uid: string): Promise<boolean> => {
  return await deleteUserDb(uid);
};

export const registerRider = async (riderData: {
  fullName: string;
  phone: string;
  email: string;
  password?: string;
  vehicleNumber?: string;
  drivingLicense?: string;
  aadharNumber?: string;
}) => {
  return await createAdminUserDb({
    fullName: riderData.fullName,
    phone: riderData.phone,
    email: riderData.email,
    password: riderData.password || 'rider123',
    role: 'rider',
    vehicleNumber: riderData.vehicleNumber,
    drivingLicense: riderData.drivingLicense,
    aadharNumber: riderData.aadharNumber,
  });
};
