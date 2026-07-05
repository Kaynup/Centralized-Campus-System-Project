import axios from "axios";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

function createClient(baseURL) {
  const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use((config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        clearAuthToken();
        localStorage.removeItem("token");
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export const authClient = createClient(
  import.meta.env.VITE_AUTH_API || "http://localhost:8000"
);

export const equipmentClient = createClient(
  import.meta.env.VITE_EQUIPMENT_API || "http://localhost:8001"
);

export const facilityClient = createClient(
  import.meta.env.VITE_FACILITY_API || "http://localhost:8002"
);

export const marketplaceClient = createClient(
  import.meta.env.VITE_MARKETPLACE_API || "http://localhost:8003"
);

export const walletClient = authClient;