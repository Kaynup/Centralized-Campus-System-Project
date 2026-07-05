import { createContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
} from "../api/notificationService";

export const NotificationContext = createContext(null);

const DEFAULT_TOAST_DURATION_MS = 4000;
const FEED_POLL_INTERVAL_MS = 30000;

export function NotificationProvider({ children }) {
  // ---------------------------------------------------------------
  // 1. TOASTS — client-only, no backend involved
  // ---------------------------------------------------------------
  const [toasts, setToasts] = useState([]);

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

  // ---------------------------------------------------------------
  // 2. FEED — backend-driven notification inbox
  // ---------------------------------------------------------------
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendUpdated, setBackendUpdated] = useState(false);

  const latestIdRef = useRef(null);
  const pollTimerRef = useRef(null);

  const unreadCount = notifications.reduce(
    (count, item) => (item.is_read ? count : count + 1),
    0
  );

  // `silent` is used by the polling loop so background refreshes
  // don't flash the shared loading state or the dropdown/page spinner.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const data = await fetchNotifications();
      const newestId = data?.[0]?.id ?? null;

      if (
        silent &&
        latestIdRef.current !== null &&
        newestId !== null &&
        newestId !== latestIdRef.current
      ) {
        setBackendUpdated(true);
      }

      latestIdRef.current = newestId;
      setNotifications(data ?? []);
    } catch (err) {
      const message =
        err?.response?.data?.message || "Unable to load notifications right now.";
      setError(message);
      if (!silent) notify.error(message);
    } finally {
      if (!silent) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshNotifications = useCallback(() => load({ silent: false }), [load]);

  const markAsRead = useCallback(
    async (id) => {
      const previous = notifications;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );

      try {
        await markNotificationRead(id);
      } catch (err) {
        setNotifications(previous);
        notify.error(
          err?.response?.data?.message || "Could not mark that notification as read."
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications]
  );

  const markAllAsRead = useCallback(async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await markAllNotificationsRead();
    } catch (err) {
      setNotifications(previous);
      notify.error(err?.response?.data?.message || "Could not mark all as read.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  const clearRead = useCallback(async () => {
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => !n.is_read));

    try {
      await clearReadNotifications();
    } catch (err) {
      setNotifications(previous);
      notify.error(err?.response?.data?.message || "Could not clear read notifications.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  const dismissUpdateBanner = useCallback(() => setBackendUpdated(false), []);

  // Load immediately when a user session exists, then poll every 30s.
  // Stops on logout (user becomes falsy) and on unmount.
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setError(null);
      setBackendUpdated(false);
      latestIdRef.current = null;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return undefined;
    }

    load({ silent: false });

    pollTimerRef.current = setInterval(() => {
      load({ silent: true });
    }, FEED_POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [user, load]);

  const value = {
    // toasts
    toasts,
    notify,
    dismissToast,
    // feed
    notifications,
    loading,
    error,
    unreadCount,
    backendUpdated,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    clearRead,
    dismissUpdateBanner,
  };

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}