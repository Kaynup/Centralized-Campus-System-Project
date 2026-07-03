export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    ME: "/api/auth/me",
  },
  EQUIPMENT: {
    INVENTORY: "/inventory",
    SINGLE: (id) => `/inventory/${id}`,
  },
  FACILITY: {
    RESERVATIONS: "/reservations",
  },
  MARKETPLACE: {
    LISTINGS: "/listings",
  },
};