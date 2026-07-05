import { marketplaceClient as API } from "../../../shared/api/axiosClient";
import { ENDPOINTS } from "../../../shared/api/endpoints";

export async function purchaseItem(itemId) {
  const response = await API.post(ENDPOINTS.MARKETPLACE.PURCHASE, { item_id: itemId });
  return response.data.data ?? response.data;
}

export async function confirmDelivery(purchaseId) {
  const response = await API.post(ENDPOINTS.MARKETPLACE.DELIVERY_CONFIRM(purchaseId));
  return response.data.data ?? response.data;
}

export async function getMyPurchases(paymentStatus = null, page = 1) {
  const params = { page, pageSize: 20 };
  if (paymentStatus && paymentStatus !== "all") {
    params.paymentStatus = paymentStatus;
  }
  const response = await API.get(ENDPOINTS.MARKETPLACE.PURCHASES, { params });
  return response.data.data ?? response.data;
}