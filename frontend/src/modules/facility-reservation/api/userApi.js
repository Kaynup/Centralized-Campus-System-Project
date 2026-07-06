import { facilityClient } from "../../../shared/api/axiosClient";

/**
 * Upload a CSV file for bulk user creation.
 */
export const uploadUsersCSV = async (file) => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await facilityClient.post(
    "/api/v1/admin/users/bulk-upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
};

/**
 * Fetch all registered users.
 */
export const getAllUsers = async () => {
  // TODO: move to ENDPOINTS.FACILITY once that section exists
  const { data } = await facilityClient.get(
    "/api/v1/admin/users"
  );

  return data;
};