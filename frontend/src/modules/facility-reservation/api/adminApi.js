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
  const { data } = await facilityClient.get(
    `/api/v1/admin/history?facility_id=${facilityId}&date=${dateStr}&slot_id=${slotId}`
  );
  return data.history || [];
};

export const forceCancelBooking = async (bookingId, payload) => {
  const { data } = await facilityClient.patch(
    `/api/v1/admin/bookings/${bookingId}/force-cancel`,
    payload
  );
  return data;
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
  const { data } = await authClient.post(
    `/api/v1/wallet/bulk-topup`,
    payload
  );
  return data;
};