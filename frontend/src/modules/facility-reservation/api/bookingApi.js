import { facilityClient } from "../../../shared/api/axiosClient";

/**
 * Create booking
 */
export const createBooking = async (payload) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.post(
    "/api/v1/reservations",
    payload
  );

  return data;
};

/**
 * Current user's bookings
 */
export const fetchMyBookings = async (statusFilter) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const params = statusFilter
    ? { status: statusFilter }
    : {};

  const { data } = await facilityClient.get(
    "/api/v1/reservations",
    { params }
  );

  return data;
};

/**
 * Booking details
 */
export const fetchBookingById = async (
  bookingId
) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get(
    `/api/v1/reservations/${bookingId}`
  );

  return data;
};

/**
 * Preview cancellation
 */
export const previewCancellation = async (
  bookingId
) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get(
    `/api/v1/reservations/preview-cancel/${bookingId}`
  );

  return data;
};

/**
 * Cancel booking
 */
export const cancelBooking = async (
  bookingId,
  cancelReason
) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.post(
    `/api/v1/reservations/${bookingId}/cancel`,
    {
      reason: cancelReason ? cancelReason : null
    }
  );

  return data;
};