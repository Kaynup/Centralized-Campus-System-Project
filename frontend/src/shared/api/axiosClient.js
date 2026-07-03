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
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const data = error.response?.data;

      if (data?.error === "session_invalidated") {
        clearAuthToken();
        window.location.href = "/login?reason=session_invalidated";
      } else if (error.response?.status === 401) {
        clearAuthToken();
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }
  );

  return client;
}


export const authClient = createClient("http://localhost:8000"); 
export const equipmentClient = createClient("http://localhost:8001");
export const facilityClient = createClient("http://localhost:8002");
export const marketplaceClient = createClient("http://localhost:8003");