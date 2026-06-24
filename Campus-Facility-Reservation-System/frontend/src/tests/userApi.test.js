import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadUsersCSV } from '../api/userApi';
import apiClient from '../api/apiClient';

vi.mock('../api/apiClient');

describe('userApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadUsersCSV', () => {
    it('sends a POST request with formData', async () => {
      const mockResponse = { data: { created_count: 5, errors: [] } };
      apiClient.post.mockResolvedValueOnce(mockResponse);

      const file = new File(['test,csv'], 'test.csv', { type: 'text/csv' });
      const result = await uploadUsersCSV(file);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/admin/users/bulk-upload',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });
});
