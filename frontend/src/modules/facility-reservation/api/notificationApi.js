import { facilityClient } from "../../../shared/api/axiosClient";

/**
 * Fetch notifications
 */
export const fetchNotifications = async () => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get(
    "/api/v1/notifications"
  );

  return data;
};

/**
 * Mark one notification as read
 */
export const markNotificationRead = async (
  notificationId
) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.post(
    `/api/v1/notifications/${notificationId}/read`
  );

  return data;
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async () => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.post(
    "/api/v1/notifications/read-all"
  );

  return data;
};

/**
 * Clear read notifications
 */
export const clearReadNotifications = async () => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.delete(
    "/api/v1/notifications/clear-read"
  );

  return data;
};