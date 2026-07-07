import { marketplaceClient as API } from "../../../shared/api/axiosClient";
import { ENDPOINTS } from "../../../shared/api/endpoints";

export async function getItems(params = {}) {
  const response = await API.get(ENDPOINTS.MARKETPLACE.ITEMS, { params });
  return response.data.data ?? response.data;
}

export async function getItemById(itemId) {
  const response = await API.get(ENDPOINTS.MARKETPLACE.ITEM(itemId));
  return response.data.data ?? response.data;
}

export async function createItem(itemData) {
  try {
    const response = await API.post(ENDPOINTS.MARKETPLACE.ITEMS, itemData);
    return response.data;
  } catch (err) {
    console.log(JSON.stringify(err.response.data, null, 2));
    throw err;
  }
}

export async function updateItem(itemId, itemData) {
  const response = await API.patch(ENDPOINTS.MARKETPLACE.ITEM(itemId), itemData);
  return response.data.data ?? response.data;
}

export async function deleteItem(itemId) {
  const response = await API.delete(ENDPOINTS.MARKETPLACE.ITEM(itemId));
  return response.data.data ?? response.data;
}

export async function updateItemStatus(itemId, newStatus) {
  const response = await API.patch(ENDPOINTS.MARKETPLACE.ITEM_STATUS(itemId), {
    status: newStatus,
  });
  return response.data.data ?? response.data;
}

export async function saveItem(itemId) {
  const response = await API.post(ENDPOINTS.MARKETPLACE.SAVE_ITEM(itemId));
  return response.data.data ?? response.data;
}

export async function unsaveItem(itemId) {
  const response = await API.delete(ENDPOINTS.MARKETPLACE.SAVE_ITEM(itemId));
  return response.data.data ?? response.data;
}

export async function getSavedItems() {
  // NOTE: endpoints.js has no entry for this yet — ask whoever owns it to add
  // ENDPOINTS.MARKETPLACE.SAVED_ITEMS rather than leaving this hardcoded.
  const response = await API.get("/marketplace/items/saved");
  return response.data.data ?? response.data;
}

export async function incrementView(itemId) {
  const response = await API.post(ENDPOINTS.MARKETPLACE.VIEW_ITEM(itemId));
  return response.data.data ?? response.data;
}

export async function getMyListings(statusFilter = null) {
  const params = statusFilter ? { status: statusFilter } : {};
  const response = await API.get(ENDPOINTS.MARKETPLACE.MY_ITEMS, { params });
  return response.data.data ?? response.data;
}