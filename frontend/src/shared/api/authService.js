import {
  authClient,
  setAuthToken,
  clearAuthToken,
} from "./axiosClient";

import { ENDPOINTS } from "./endpoints";

export async function login(loginId, password) {
  const response = await authClient.post(
    ENDPOINTS.AUTH.LOGIN,
    {
      login_id: loginId,
      password,
    }
  );

  const data = response.data.data;

  setAuthToken(data.access_token);

  return data;
}

export async function changePassword(
  currentPassword,
  newPassword
) {
  const response = await authClient.post(
    ENDPOINTS.AUTH.CHANGE_PASSWORD,
    {
      old_password: currentPassword,
      new_password: newPassword,
    }
  );

  return response.data.data;
}

export async function getProfile() {
  const response = await authClient.get(ENDPOINTS.AUTH.ME);
  return response.data.data;
}

export function logout() {
  clearAuthToken();
}