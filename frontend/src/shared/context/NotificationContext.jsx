import { createContext, useState, useCallback } from "react";

/**
 * NotificationContext
 * ------------------------------------------------------------------
 * Two separate concerns live here, both "notifications" in the
 * everyday sense but different in shape:
 *
 * 1. TOASTS — transient, client-only messages ("Signed in from
 *    another device", "Wallet top-up successful", "Insufficient
 *    funds"). Any module calls notify.error(...) / notify.success(...)
 *    without needing to render its own toast markup — Person 3's
 *    <Toast/> component just renders whatever's in `toasts`.
 *
 * 2. FEED — the persisted, backend-driven notification list for the
 *    bell icon in the Navbar and the full pages/Notifications.jsx
 *    inbox (GET /api/notifications/*, Section 5.1). Mocked for now.
 *
 * This is the natural home for reacting to parseApiError results:
 * whenever a context catches a "session_invalidated" or
 * "insufficient_funds" error, it can call notify.error(message)
 * instead of every component managing its own error banner.
 * ------------------------------------------------------------------
 */

export const NotificationContext = createContext(null);

const MOCK_DELAY_MS = 400;
const DEFAULT_TOAST_DURATION_MS = 4000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [feed, setFeed] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (variant, message, { duration = DEFAULT_TOAST_DURATION_MS } = {}) => {
      const id = `toast_${Date.now()}_${Math.round(Math.random() * 1000)}`;
      setToasts((current) => [...current, { id, variant, message }]);

      if (duration) {
        setTimeout(() => dismissToast(id), duration);
      }
      return id;
    },
    [dismissToast]
  );

  const notify = {
    success: (message, options) => pushToast("success", message, options),
    error: (message, options) => pushToast("error", message, options),
    info: (message, options) => pushToast("info", message, options),
  };

  // Mirrors GET /api/notifications — mocked for now.
  const fetchFeed = useCallback(async () => {
    setIsLoadingFeed(true);
    await wait(MOCK_DELAY_MS);
    setFeed([]); // MOCK — replace with response.data.notifications
    setUnreadCount(0); // MOCK — replace with response.data.unreadCount
    setIsLoadingFeed(false);
  }, []);

  // Mirrors PATCH /api/notifications/:id/read — mocked for now.
  const markAsRead = useCallback(async (notificationId) => {
    await wait(150);
    setFeed((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
    );
    setUnreadCount((current) => Math.max(0, current - 1));
  }, []);

  const value = {
    toasts,
    notify,
    dismissToast,
    feed,
    unreadCount,
    isLoadingFeed,
    fetchFeed,
    markAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}