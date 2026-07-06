import apiClient from './apiClient';

/**
 * Fetch notifications of the current user
 * @returns {Promise<Array>}
 */
export const fetchNotifications = async () => {
  const response = await apiClient.get('/api/v1/notifications');
  return response.data;
};

/**
 * Mark a single notification as read
 * @param {string|number} notificationId
 * @returns {Promise<Object>}
 */
export const markNotificationRead = async (notificationId) => {
  const response = await apiClient.post(`/api/v1/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 * @returns {Promise<Object>}
 */
export const markAllNotificationsRead = async () => {
  const response = await apiClient.post('/api/v1/notifications/read-all');
  return response.data;
};

/**
 * Clear all read notifications
 * @returns {Promise<Object>}
 */
export const clearReadNotifications = async () => {
  const response = await apiClient.delete('/api/v1/notifications/clear-read');
  return response.data;
};
