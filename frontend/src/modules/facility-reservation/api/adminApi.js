import { facilityClient } from "../../../shared/api/axiosClient";

export const toggleSlotAvailability = async (payload) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.post(
    "/api/v1/admin/slots/toggle-availability",
    payload
  );

  return data;
};

export const getSlotHistory = async (
  facilityId,
  dateStr,
  slotId
) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get(
    "/api/v1/admin/history",
    {
      params: {
        facility_id: facilityId,
        date: dateStr,
        slot_id: slotId,
      },
    }
  );

  return data.data;
};

export const forceCancelBooking = async (
  bookingId,
  payload
) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.patch(
    `/api/v1/admin/bookings/${bookingId}/force-cancel`,
    payload
  );

  return data;
};

export const topUpUser = async (userId, payload) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.post(
    `/api/v1/admin/users/${userId}/topup`,
    payload
  );

  return data;
};

export const universalTopUp = async (payload) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.post(
    "/api/v1/admin/users/bulk-topup",
    payload
  );

  return data;
};