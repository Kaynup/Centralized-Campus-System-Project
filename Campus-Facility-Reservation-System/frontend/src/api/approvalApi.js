import apiClient from './apiClient';

/**
 * Fetch pending approvals (admin/professor only)
 * @returns {Promise<Array>}
 */
export const fetchPendingApprovals = async () => {
  const response = await apiClient.get('/api/v1/approvals/pending');
  return response.data;
};

/**
 * Approve a pending booking
 * @param {string|number} bookingId
 * @param {number} [notesId] - Optional approval notes ID
 * @returns {Promise<Object>}
 */
export const approveBooking = async (bookingId, notesId) => {
  const response = await apiClient.post(`/api/v1/bookings/${bookingId}/approve`, { notes: notesId });
  return response.data;
};

/**
 * Reject a pending booking
 * @param {string|number} bookingId
 * @param {number} notesId - Required rejection notes ID
 * @returns {Promise<Object>}
 */
export const rejectBooking = async (bookingId, notesId) => {
  const response = await apiClient.post(`/api/v1/bookings/${bookingId}/reject`, { notes: notesId });
  return response.data;
};
