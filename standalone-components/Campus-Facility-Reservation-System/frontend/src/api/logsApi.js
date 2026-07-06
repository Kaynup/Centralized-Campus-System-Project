import apiClient from './apiClient'

/**
 * Fetch system logs (admin only)
 * 
 * Calls GET /api/v1/admin/logs with query parameters.
 * 
 * @param {object} params - { level, page, limit, date }
 * @returns {Promise<{logs: Array, total: number, pages: number}>}
 */
export const fetchSystemLogs = async ({ level = '', page = 1, limit = 20, date = '' } = {}) => {
  const response = await apiClient.get('/api/v1/admin/logs', {
    params: { level, page, limit, date }
  })
  return response.data
}
