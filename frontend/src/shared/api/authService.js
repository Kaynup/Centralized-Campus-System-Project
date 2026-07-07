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

  if (data.user && data.user.full_name && !data.user.name) {
    data.user.name = data.user.full_name;
  }

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
      current_password: currentPassword,
      new_password: newPassword,
    }
  );

  return response.data;
}

export async function getProfile() {
  const response = await authClient.get(ENDPOINTS.AUTH.ME);
  const data = response.data.data;
  if (data && data.full_name && !data.name) {
    data.name = data.full_name;
  }
  return data;
}

export function logout() {
  clearAuthToken();
}