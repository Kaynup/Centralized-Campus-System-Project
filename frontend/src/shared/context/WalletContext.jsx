import { createContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

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

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  // "idle" | "loading" | "ready" | "error"
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  // Mirrors GET /api/wallet (balance + recent transactions in one call).
  // MOCK: returns a fixed starter balance and empty history.
  const fetchWallet = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      await wait(MOCK_DELAY_MS);
      setBalance(2500); // MOCK — replace with response.data.balance
      setTransactions([]); // MOCK — replace with response.data.transactions
      setStatus("ready");
    } catch (err) {
      setError(err.message || "Could not load wallet");
      setStatus("error");
    }
  }, []);

  const resetWallet = useCallback(() => {
    setBalance(0);
    setTransactions([]);
    setStatus("idle");
    setError(null);
  }, []);

  // Fetch on login, clear on logout — keeps this in sync with AuthContext
  // without any module needing to call fetchWallet itself.
  useEffect(() => {
    if (isAuthenticated) {
      fetchWallet();
    } else {
      resetWallet();
    }
  }, [isAuthenticated, fetchWallet, resetWallet]);

  // Mirrors POST /api/wallet/topup
  const topUp = useCallback(async ({ amount, method = "card" }) => {
    if (!amount || amount <= 0) {
      const err = new Error("Enter an amount greater than zero.");
      err.code = "invalid_amount";
      throw err;
    }

    await wait(MOCK_DELAY_MS);

    let updatedBalance;
    setBalance((current) => {
      updatedBalance = current + amount;
      return updatedBalance;
    });

    const transaction = makeTransaction({
      type: "top_up",
      amount,
      description: `Top-up via ${method}`,
      balanceAfter: updatedBalance,
    });
    setTransactions((current) => [transaction, ...current]);

    return { balance: updatedBalance, transaction };
  }, []);

  // Mirrors POST /api/wallet/charge — used by other modules to pay for
  // a rental, a booking, or a marketplace purchase.
  const chargeWallet = useCallback(
    async ({ amount, description, module }) => {
      if (!amount || amount <= 0) {
        const err = new Error("Charge amount must be greater than zero.");
        err.code = "invalid_amount";
        throw err;
      }

      await wait(MOCK_DELAY_MS);

      if (amount > balance) {
        const err = new Error("Insufficient wallet balance.");
        err.code = "insufficient_funds";
        throw err;
      }

      let updatedBalance;
      setBalance((current) => {
        updatedBalance = current - amount;
        return updatedBalance;
      });

      const transaction = makeTransaction({
        type: "charge",
        amount,
        description: description || `Charge from ${module || "campus system"}`,
        balanceAfter: updatedBalance,
      });
      setTransactions((current) => [transaction, ...current]);

      return { balance: updatedBalance, transaction };
    },
    [balance]
  );

  const value = {
    balance,
    transactions,
    isLoading: status === "loading",
    isReady: status === "ready",
    error,
    fetchWallet,
    topUp,
    chargeWallet,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}