import { facilityClient } from "../../../shared/api/axiosClient";

/**
 * Create booking
 */
export const createBooking = async (payload) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.post(
    "/api/v1/bookings",
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
    "/api/v1/bookings",
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
    `/api/v1/bookings/${bookingId}`
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
    `/api/v1/bookings/preview-cancel/${bookingId}`
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
  const { data } = await facilityClient.delete(
    `/api/v1/bookings/${bookingId}`,
    {
      data: cancelReason
        ? { reason: cancelReason }
        : undefined,
    }
  );

  return data;
};