import { createContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { authClient } from "../api/axiosClient";

/**
 * WalletContext

 * Session-aware: the wallet is fetched automatically once the user
 * is authenticated, and cleared the moment they log out, so no
 * balance ever leaks across sessions.
 *
 * The consumer hook lives separately at shared/hooks/useWallet.js —
 * this file only exports the context object and the provider.
 *
 * MOCK MODE:
 * `fetchWallet`, `topUp`, and `chargeWallet` are faked with timeouts.
 * Each mirrors the exact request/response shape the real
 * /api/wallet/* endpoints are expected to use, so swapping in real
 * axios calls later should only mean replacing the body of these
 * functions — not their contracts or what they return/throw.
 * ------------------------------------------------------------------
 */

export const WalletContext = createContext(null);

const MOCK_DELAY_MS = 500;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeTransaction({ type, amount, description, balanceAfter }) {
  return {
    id: `txn_${Date.now()}_${Math.round(Math.random() * 1000)}`,
    type, // "top_up" | "charge"
    amount,
    description,
    balanceAfter,
    timestamp: new Date().toISOString(),
  };
}

export function WalletProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const fetchWallet = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const [walletRes, txRes] = await Promise.all([
        authClient.get("/wallet/balance"),
        authClient.get("/wallet/history")
      ]);
      
      const walletData = walletRes.data;
      setWallet(walletData);
      
      const formatted = (txRes.data || []).map(tx => ({
        id: tx.id,
        transaction_type: tx.transaction_type,
        reference_type: tx.reference_type,
        token_amount: Number(tx.token_amount),
        description: tx.description || "Wallet transaction",
        token_balance_after: Number(tx.token_balance_after),
        created_at: tx.created_at
      }));
      setTransactions(formatted);
      setStatus("ready");
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Could not load wallet");
      setStatus("error");
    }
  }, []);

  const resetWallet = useCallback(() => {
    setWallet(null);
    setTransactions([]);
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWallet();
    } else {
      resetWallet();
    }
  }, [isAuthenticated, fetchWallet, resetWallet]);

  const topUp = useCallback(async ({ amount, method = "card" }) => {
    if (!amount || amount <= 0) {
      const err = new Error("Enter an amount greater than zero.");
      err.code = "invalid_amount";
      throw err;
    }

    try {
      const response = await authClient.post("/wallet/topup", { amount });
      const transaction = response.data;
      
      const newBalance = Number(transaction.token_balance_after);
      setWallet(prev => prev ? { ...prev, token_balance: newBalance } : prev);
      
      const formattedTx = {
        id: transaction.id,
        transaction_type: transaction.transaction_type,
        reference_type: transaction.reference_type,
        token_amount: Number(transaction.token_amount),
        description: transaction.description || `Top-up via ${method}`,
        token_balance_after: newBalance,
        created_at: transaction.created_at
      };
      
      setTransactions((current) => [formattedTx, ...current]);
      return { balance: newBalance, transaction: formattedTx };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || "Top-up failed";
      const error = new Error(errorMsg);
      error.code = "topup_failed";
      throw error;
    }
  }, []);

  const chargeWallet = useCallback(
    async ({ amount, description, module }) => {
      if (!amount || amount <= 0) {
        const err = new Error("Charge amount must be greater than zero.");
        err.code = "invalid_amount";
        throw err;
      }
      return { balance: (wallet?.token_balance || 0) - amount, transaction: {} };
    },
    [wallet]
  );

  const balance = wallet ? Number(wallet.token_balance) : 0;
  const loading = status === "loading";

  const value = {
    wallet,
    balance,
    transactions,
    loading,
    isLoading: loading,
    txLoading: loading,
    isReady: status === "ready",
    error,
    refresh: fetchWallet,
    fetchWallet,
    topUp,
    chargeWallet,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}