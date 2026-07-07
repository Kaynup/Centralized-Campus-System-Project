import { facilityClient } from "../../../shared/api/axiosClient";

/**
 * Fetch pending approvals
 */
export const fetchPendingApprovals = async () => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get("/api/v1/reservations");
  if (Array.isArray(data)) {
    return data.filter(r => r.status === 'PENDING');
  }
  return data;
};

/**
 * Approve booking
 */
export const approveBooking = async (bookingId, notesId) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.post(
    `/api/v1/reservations/${bookingId}/approve`,
    {
      notes: notesId,
    }
  );

  return data;
};

/**
 * Reject booking
 */
export const rejectBooking = async (bookingId, notesId) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.post(
    `/api/v1/reservations/${bookingId}/reject`,
    {
      notes: notesId,
    }
  );

  return data;
};