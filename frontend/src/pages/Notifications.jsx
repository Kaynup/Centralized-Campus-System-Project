// Full notifications page at /notifications. Same layout as before,
// refined spacing/typography/hierarchy, built only from real shared
// components (Card, Button, StatusBadge) — no new UI components added.

import { useEffect } from 'react';
import { Bell, RefreshCw, CheckCheck, Trash2 } from 'lucide-react';
import Card from '../shared/ui/Card';
import Button from '../shared/ui/Button';
import StatusBadge from '../shared/ui/StatusBadge';
import NotificationsFeed from '../shared/notifications/NotificationsFeed';
import useNotifications from '../shared/hooks/useNotification';

export default function Notifications() {
  const {
    notifications,
    loading,
    unreadCount,
    backendUpdated,
    refreshNotifications,
    markAllAsRead,
    clearRead,
    dismissUpdateBanner,
  } = useNotifications();

  useEffect(() => {
    refreshNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasReadItems = notifications.some((n) => n.is_read);

  // Button.jsx has no `disabled` prop, so "disabled" states are enforced
  // here as no-op guards instead of a visual disabled style.
  const handleRefresh = () => {
    if (loading) return;
    refreshNotifications();
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    markAllAsRead();
  };

  const handleClearRead = () => {
    if (!hasReadItems) return;
    clearRead();
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest/10 text-forest">
            <Bell size={20} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate sm:text-xl">Notifications</h1>
            <p className="text-sm text-slate/50">
              {notifications.length} total
              {unreadCount > 0 ? ` · ${unreadCount} unread` : ' · all caught up'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && <StatusBadge status={`${unreadCount} unread`} tone="gold" />}
      </div>

      {/* Backend-updated banner */}
      {backendUpdated && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-slate">
          <span>New notifications have arrived.</span>
          <button
            type="button"
            onClick={dismissUpdateBanner}
            className="shrink-0 font-medium text-forest hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={handleRefresh}>
          <span className="inline-flex items-center gap-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </span>
        </Button>
        <Button variant="secondary" onClick={handleMarkAllRead}>
          <span className="inline-flex items-center gap-2">
            <CheckCheck size={16} />
            Mark all read
          </span>
        </Button>
        <Button variant="secondary" onClick={handleClearRead}>
          <span className="inline-flex items-center gap-2">
            <Trash2 size={16} />
            Clear read
          </span>
        </Button>
      </div>

      <Card className="overflow-hidden !p-0">
        <NotificationsFeed />
      </Card>
    </div>
  );
}

