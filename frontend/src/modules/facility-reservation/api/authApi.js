import { authClient } from "../../../shared/api/axiosClient";

export const updatePreferences = async (prefs) => {
  const { data } = await authClient.patch("/api/v1/users/me", { preferences: prefs });
  return data;
};
