import { facilityClient, authClient } from "../../../shared/api/axiosClient";

export const toggleSlotAvailability = async (payload) => {
  // Map to the new admin endpoint for unavailability
  const { facility_id, ...rest } = payload;
  const { data } = await facilityClient.post(
    `/api/v1/admin/facilities/${facility_id}/unavailability`,
    rest
  );
  return data;
};

export const getSlotHistory = async (facilityId, dateStr, slotId) => {
  console.warn("getSlotHistory is not supported by the backend");
  return [];
};

export const forceCancelBooking = async (bookingId, payload) => {
  console.warn("forceCancelBooking is not supported by the backend");
  return {};
};

export const topUpUser = async (userId, payload) => {
  // Core service wallet endpoint
  const { data } = await authClient.post(
    `/api/v1/wallet/topup`,
    { user_id: userId, amount: payload.amount }
  );
  return data;
};

export const universalTopUp = async (payload) => {
  console.warn("universalTopUp is not currently implemented in core service");
  return {};
};