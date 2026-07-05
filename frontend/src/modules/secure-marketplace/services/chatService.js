import { marketplaceClient as API } from "../../../shared/api/axiosClient";
import { ENDPOINTS } from "../../../shared/api/endpoints";

export async function getChatHistory(itemId) {
  const response = await API.get(ENDPOINTS.MARKETPLACE.CHAT_HISTORY(itemId));
  return response.data.data ?? response.data;
}

export async function getConversations() {
  const response = await API.get(ENDPOINTS.MARKETPLACE.CONVERSATIONS);
  return response.data?.data ?? response.data;
}

export async function getConversationById(conversationId) {
  const response = await API.get(ENDPOINTS.MARKETPLACE.CONVERSATION(conversationId));
  return response.data.data ?? response.data;
}

export async function markConversationRead(conversationId) {
  const response = await API.patch(ENDPOINTS.MARKETPLACE.CHAT_READ(conversationId));
  return response.data.data ?? response.data;
}

/**
 * @param {string} itemId
 * @param {string} userId - pass useAuth().user.id from the calling component
 */
export function createChatWebSocket(itemId, userId) {
  const wsBase = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8003";
  return new WebSocket(`${wsBase}/chat/ws/${itemId}?sender_id=${userId}`);
}