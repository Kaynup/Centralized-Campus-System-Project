import apiClient from './apiClient';

import { formatTime } from '../utils/slotUtils';

const normalizeFacility = (facility) => ({
  ...facility,
  group: facility.group || facility.facilityGroup || facility.facility_group,
  tokenCostPerHour: facility.tokenCostPerHour ?? facility.token_cost_per_hour,
})

const normalizeSlot = (slot) => {
  const startTime = formatTime(slot.startTimeOfDay || slot.start_time_of_day || slot.startTime)
  const endTime = formatTime(slot.endTimeOfDay || slot.end_time_of_day || slot.endTime)
  const isAvailable = slot.status === 'AVAILABLE'
  const status = slot.status || (isAvailable ? 'AVAILABLE' : 'RESERVED')

  return {
    ...slot,
    startTime,
    endTime,
    status,
    isAvailable,
  }
}

/**
 * Fetch all facilities with optional filters
 * @param {Object} params
 * @param {string} [params.group]
 * @param {boolean} [params.activeOnly]
 * @returns {Promise<Array>}
 */
export const fetchFacilities = async (params = {}) => {
  const response = await apiClient.get('/api/v1/facilities', { params });
  return Array.isArray(response.data)
    ? response.data.map(normalizeFacility)
    : response.data
}

/**
 * Fetch facility by ID
 * @param {number|string} facilityId
 * @returns {Promise<Object>}
 */
export const fetchFacilityById = async (facilityId) => {
  const response = await apiClient.get(`/api/v1/facilities/${facilityId}`);
  return normalizeFacility(response.data);
};

/**
 * Fetch slots for a facility on a given date
 * @param {number|string} facilityId
 * @param {string} date - Date formatted as YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export const fetchFacilitySlots = async (facilityId, date) => {
  const response = await apiClient.get(`/api/v1/facilities/${facilityId}/slots`, {
    params: { date }
  });

  return Array.isArray(response.data)
    ? response.data.map(normalizeSlot)
    : []
};
