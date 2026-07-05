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
};