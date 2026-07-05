export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/users/login",
    LOGOUT: "/users/logout",
    CHANGE_PASSWORD: "/users/change-password",
    ME: "/users/me",
  },

  WALLET: {
    SUMMARY: "/wallet/summary",
    TRANSACTIONS: "/wallet/transactions",
    TOPUP: (userId) => `/wallet/${userId}/topup`,
    USER: (userId) => `/wallet/${userId}`,
    HOLDING_RECORDS: (userId) =>
      `/transactions/holding-records/${userId}`,
  },

  MARKETPLACE: {
    DASHBOARD: "/marketplace/dashboard",

    ITEMS: "/marketplace/items",

    ITEM: (id) => `/marketplace/items/${id}`,

    MY_ITEMS: "/marketplace/items/me",

    ITEM_STATUS: (id) =>
      `/marketplace/items/${id}/status`,

    SAVE_ITEM: (id) =>
      `/marketplace/items/${id}/save`,

    VIEW_ITEM: (id) =>
      `/marketplace/items/${id}/view`,

    PURCHASE: "/marketplace/transactions/purchase",

    PURCHASES: "/marketplace/purchases/me",

    DELIVERY_CONFIRM: (purchaseId) =>
      `/marketplace/delivery/confirm/${purchaseId}`,

    CONVERSATIONS:
      "/marketplace/chat/conversations",

    CONVERSATION: (id) =>
      `/marketplace/chat/conversations/${id}`,

    CHAT_HISTORY: (id) =>
      `/marketplace/chat/${id}/history`,

    CHAT_READ: (id) =>
      `/marketplace/chat/${id}/read`,
  },

  EQUIPMENT: {
    INVENTORY: "/inventory",
    INVENTORY_SINGLE: (id) => `/inventory/${id}`,
    CHECKOUT: "/checkout",
    RETURN: "/return",
    RENTALS: (studentId) => `/rentals/${studentId}`,
    RENTALS_ACTIVE: (studentId) => `/rentals/${studentId}/active`,
    WALLET: (studentId) => `/wallet/${studentId}`,
    WALLET_TRANSACTIONS: (studentId) => `/wallet/${studentId}/transactions`,
    AUTH_REGISTER: "/auth/register",
    AUTH_LOGIN: "/auth/login",
    AUTH_FORGOT_PASSWORD: "/auth/forgot-password",
    ADMIN_LOGIN: "/admin/login",
    ADMIN_STUDENTS: "/admin/students",
    ADMIN_STUDENT_ACTIVATE: (studentId) => `/admin/students/${studentId}/activate`,
    ADMIN_STUDENT_DEACTIVATE: (studentId) => `/admin/students/${studentId}/deactivate`,
    ADMIN_STUDENT_ADD_BALANCE: (studentId) => `/admin/students/${studentId}/add-balance`,
    ADMIN_EQUIPMENTS: "/admin/equipments",
    ADMIN_EQUIPMENT_UPDATE: (equipmentId) => `/admin/equipments/${equipmentId}`,
    ADMIN_EQUIPMENT_ACTIVATE: (equipmentId) => `/admin/equipments/${equipmentId}/activate`,
    ADMIN_EQUIPMENT_DEACTIVATE: (equipmentId) => `/admin/equipments/${equipmentId}/deactivate`,
    ADMIN_EQUIPMENT_CATEGORIES: "/admin/equipment-categories",
    ADMIN_RENTALS: "/admin/rentals",
    ADMIN_RENTALS_LATE: "/admin/rentals/late",
    ADMIN_DASHBOARD: "/admin/dashboard",
    ADMIN_TRANSACTIONS: "/admin/transactions",
  },
};