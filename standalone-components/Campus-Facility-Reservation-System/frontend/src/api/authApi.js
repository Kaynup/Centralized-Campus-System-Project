import apiClient from './apiClient';

/**
 * Log in a user with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
export const loginUser = async (email, password) => {
  const response = await apiClient.post('/api/v1/auth/login', { email, password });
  return response.data;
};

/**
 * Register a new user
 * @param {string} fullName
 * @param {string} email
 * @param {string} password
 * @param {string} role
 * @returns {Promise<Object>}
 */
export const registerUser = async (fullName, email, password, role) => {
  const response = await apiClient.post('/api/v1/auth/register', {
    full_name: fullName,
    email,
    password,
    role
  });
  return response.data;
};

/**
 * Fetch the currently logged-in user profile
 * @returns {Promise<Object>}
 */
export const fetchCurrentUser = async () => {
  const response = await apiClient.get('/api/v1/auth/me');
  return response.data;
};

/**
 * Update user preferences
 * @param {Object} preferences
 * @returns {Promise<Object>}
 */
export const updatePreferences = async (preferences) => {
  const response = await apiClient.patch('/api/v1/auth/me/preferences', preferences);
  return response.data;
};
