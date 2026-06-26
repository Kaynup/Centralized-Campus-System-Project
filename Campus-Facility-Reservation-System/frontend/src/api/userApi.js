import apiClient from './apiClient';

/**
 * Uploads a CSV file for bulk user creation.
 * @param {File} file 
 * @returns {Promise<Object>}
 */
export const uploadUsersCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/api/v1/admin/users/bulk-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Fetch all registered users (Admin only).
 * @returns {Promise<Array>}
 */
export const getAllUsers = async () => {
  const response = await apiClient.get('/api/v1/admin/users');
  return response.data;
};
