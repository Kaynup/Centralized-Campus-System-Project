import axiosClient from './axiosClient';
import { ENDPOINTS } from './endpoints';

export const walletService = {
  getWallet: () => axiosClient.get(ENDPOINTS.WALLET.ME).then((r) => r.data),

  getTransactions: ({ limit = 20, offset = 0, reference_type, transaction_type } = {}) =>
    axiosClient
      .get(ENDPOINTS.WALLET.TRANSACTIONS, { params: { limit, offset, reference_type, transaction_type } })
      .then((r) => r.data),

  topUp: (amount) =>
    axiosClient.post(ENDPOINTS.WALLET.TOPUP, { amount }).then((r) => r.data),
};

export default walletService;