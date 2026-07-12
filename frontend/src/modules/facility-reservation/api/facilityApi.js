import { facilityClient } from "../../../shared/api/axiosClient";
import { formatTime } from "../utils/slotUtils";

const normalizeFacility = (facility) => ({
  ...facility,
  group: facility.group || facility.facilityGroup || facility.facility_group,
  tokenCostPerHour:
    facility.tokenCostPerHour ?? facility.token_cost_per_hour,
});

const normalizeSlot = (slot) => {
  const startTime = formatTime(
    slot.startTimeOfDay || slot.start_time_of_day || slot.startTime
  );

  const endTime = formatTime(
    slot.endTimeOfDay || slot.end_time_of_day || slot.endTime
  );

  let status = slot.status || "AVAILABLE";
  if (status === "BOOKED") status = "RESERVED";
  if (status === "MAINTENANCE") status = "UNAVAILABLE";

  return {
    ...slot,
    startTime,
    endTime,
    status,
    isAvailable: status === "AVAILABLE",
  };
};

/**
 * Fetch all facilities
 */
export const fetchFacilities = async (params = {}) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get("/api/v1/facilities", {
    params,
  });

  return Array.isArray(data)
    ? data.map(normalizeFacility)
    : data;
};

/**
 * Fetch one facility
 */
export const fetchFacilityById = async (facilityId) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get(
    `/api/v1/facilities/${facilityId}`
  );

  return normalizeFacility(data);
};

/**
 * Fetch facility slots
 */
export const fetchFacilitySlots = async (facilityId, date) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get(
    `/api/v1/facilities/${facilityId}/slots`,
    {
      params: { date },
    }
  );

  return Array.isArray(data)
    ? data.map(normalizeSlot)
    : [];
};