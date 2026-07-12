import { facilityClient } from "../../../shared/api/axiosClient";

/**
 * Fetch pending approvals
 */
export const fetchPendingApprovals = async () => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get("/api/v1/admin/bookings/pending");
  const bookings = data.bookings || [];
  
  return bookings.map(b => ({
    id: b.id, // we map id to bookingId on the page side, or use it directly
    bookingId: b.id,
    requesterName: b.user_id, // we only have user_id, displaying it as name
    requesterEmail: b.user_id,
    facilityName: b.facility_name,
    facilityGroup: b.facility_group,
    date: b.booking_date,
    startTime: b.start_time,
    endTime: b.end_time,
    requestedAt: b.created_at,
  }));
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