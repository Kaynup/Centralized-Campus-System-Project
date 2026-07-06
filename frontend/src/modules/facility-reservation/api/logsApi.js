import { facilityClient } from "../../../shared/api/axiosClient";

/**
 * Fetch system logs
 */
export const fetchSystemLogs = async ({
  level = "",
  page = 1,
  limit = 20,
  date = "",
} = {}) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get(
    "/api/v1/admin/logs",
    {
      params: {
        level,
        page,
        limit,
        date,
      },
    }
  );

  return data;
};