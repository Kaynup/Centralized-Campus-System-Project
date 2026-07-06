import apiClient from './apiClient';

export const toggleSlotAvailability = async (payload) => {
  const { data } = await apiClient.post('/api/v1/admin/slots/toggle-availability', payload);
  return data;
};

export const getSlotHistory = async (facilityId, dateStr, slotId) => {
  const { data } = await apiClient.get(`/api/v1/admin/history`, {
    params: { facility_id: facilityId, date: dateStr, slot_id: slotId }
  });
  return data.data;
};

export const forceCancelBooking = async (bookingId, payload) => {
  const { data } = await apiClient.patch(`/api/v1/admin/bookings/${bookingId}/force-cancel`, payload);
  return data;
};

export const topUpUser = async (userId, payload) => {
  const { data } = await apiClient.post(`/api/v1/admin/users/${userId}/topup`, payload);
  return data;
};

export const universalTopUp = async (payload) => {
  const { data } = await apiClient.post(`/api/v1/admin/users/bulk-topup`, payload);
  return data;
};
