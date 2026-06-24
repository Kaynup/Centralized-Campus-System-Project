import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../api/apiClient';
import { toggleSlotAvailability, getSlotHistory, forceCancelBooking } from '../api/adminApi';

vi.mock('../api/apiClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('adminApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toggleSlotAvailability', () => {
    it('should call the correct endpoint with payload', async () => {
      const payload = { slot_ids: [1, 2], is_available: false, reason: 'Maintenance' };
      const mockResponse = { data: { success: true } };
      apiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await toggleSlotAvailability(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/slots/toggle-availability', payload);
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw an error if the request fails', async () => {
      const payload = { slot_ids: [1], is_available: true, reason: 'Fixed' };
      apiClient.post.mockRejectedValueOnce(new Error('API Error'));

      await expect(toggleSlotAvailability(payload)).rejects.toThrow('API Error');
    });
  });

  describe('getSlotHistory', () => {
    it('should call the correct endpoint', async () => {
      const facilityId = 1;
      const dateStr = "2026-06-18";
      const slotId = 123;
      const expectedPayload = { id: 1, message: 'Unavailable' };
      const mockResponse = { data: { data: expectedPayload } };
      apiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await getSlotHistory(facilityId, dateStr, slotId);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/admin/history`, {
        params: { facility_id: facilityId, date: dateStr, slot_id: slotId }
      });
      expect(result).toEqual(expectedPayload);
    });

    it('should throw an error if the request fails', async () => {
      apiClient.get.mockRejectedValueOnce(new Error('Network Error'));
      await expect(getSlotHistory(1, "2026-06-18", 1)).rejects.toThrow('Network Error');
    });
  });

  describe('forceCancelBooking', () => {
    it('should call the correct endpoint with payload', async () => {
      const bookingId = 456;
      const payload = { reason: 'Admin override' };
      const mockResponse = { data: { id: 456, status: 'CANCELLED' } };
      apiClient.patch.mockResolvedValueOnce(mockResponse);

      const result = await forceCancelBooking(bookingId, payload);

      expect(apiClient.patch).toHaveBeenCalledWith(`/api/v1/admin/bookings/${bookingId}/force-cancel`, payload);
      expect(result).toEqual(mockResponse.data);
    });




    it('should throw an error if the request fails', async () => {
      apiClient.patch.mockRejectedValueOnce(new Error('Unauthorized'));
      await expect(forceCancelBooking(1, {})).rejects.toThrow('Unauthorized');
    });
  });
});
