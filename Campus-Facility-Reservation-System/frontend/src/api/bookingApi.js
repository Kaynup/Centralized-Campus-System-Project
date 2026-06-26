import apiClient from './apiClient';

/**
 * Create a new booking
 * @param {Object} payload { facility_id, booking_date, start_slot_id, end_slot_id }
 * @returns {Promise<Object>}
 */
export const createBooking = async (payload) => {
  const response = await apiClient.post('/api/v1/bookings', payload);
  return response.data;
};

/**
 * Fetch bookings of the current user, optionally filtered by status
 * @param {string} [statusFilter]
 * @returns {Promise<Array>}
 */
export const fetchMyBookings = async (statusFilter) => {
  const params = statusFilter ? { status: statusFilter } : {};
  const response = await apiClient.get('/api/v1/bookings', { params });
  return response.data;
};

/**
 * Fetch a booking by ID
 * @param {string|number} bookingId
 * @returns {Promise<Object>}
 */
export const fetchBookingById = async (bookingId) => {
  const response = await apiClient.get(`/api/v1/bookings/${bookingId}`);
  return response.data;
};

/**
 * Preview a booking cancellation (refund and penalty preview)
 * @param {string|number} bookingId
 * @returns {Promise<Object>}
 */
export const previewCancellation = async (bookingId) => {
  const response = await apiClient.get(`/api/v1/bookings/preview-cancel/${bookingId}`);
  return response.data;
};

/**
 * Cancel an existing booking
 * @param {string|number} bookingId
 * @param {number} [cancellationReasonId] - Optional cancellation reason ID
 * @returns {Promise<Object>}
 */
export const cancelBooking = async (bookingId, cancelReason) => {
  const response = await apiClient.delete(`/api/v1/bookings/${bookingId}`, {
    data: cancelReason ? { reason: cancelReason } : undefined
  });
  return response.data;
};
