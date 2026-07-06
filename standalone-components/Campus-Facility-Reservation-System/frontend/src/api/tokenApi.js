import apiClient from './apiClient';

/**
 * Fetch token balance of the current user
 * @returns {Promise<Object>}
 */
export const fetchTokenBalance = async () => {
  const response = await apiClient.get('/api/v1/tokens/balance');
  return response.data;
};

/**
 * Fetch token transactions history of the current user
 * @returns {Promise<Array>}
 */
export const fetchTokenTransactions = async () => {
  const response = await apiClient.get('/api/v1/tokens/transactions');
  return response.data;
};
