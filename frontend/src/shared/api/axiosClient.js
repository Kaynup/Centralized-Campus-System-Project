import axios from "axios";

let authToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;

export function setAuthToken(token) {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }
}

export function clearAuthToken() {
  authToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
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
      // Don't fire the global unauthorized event for the login endpoint itself
      // (wrong password returns 401 and should be handled by the login form).
      const url = error.config?.url || "";
      const isLoginRequest = url.includes("/login");
      if (!isLoginRequest) {
        clearAuthToken();
        window.dispatchEvent(new CustomEvent("auth-unauthorized"));
      }
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