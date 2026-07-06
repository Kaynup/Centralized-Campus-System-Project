/**
 * NotificationsPage — /notifications
 *
 * Displays a feed of system notifications for the current user.
 * Supports mark-as-read, mark-all-read, and clear-read-items interactions.
 *
 * NOTE: No backend notifications API exists yet.
 * Both DEV and PROD render the same mock data until the endpoint is available.
 */

import PageLayout from '../components/layout/PageLayout';
import NotificationsFeed from '../components/notifications/NotificationsFeed';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useNotification } from '../../../shared/hooks/useNotification';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead, clearRead } = useNotification();

  return (
    <PageLayout currentUser={user}>
      <div
        style={{
          padding: '1.5rem 2rem',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-primary)',
          height: 'calc(100vh - var(--topbar-height))',
          overflowY: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <NotificationsFeed
          notifications={notifications}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onClearRead={clearRead}
        />
      </div>
    </PageLayout>
  );
}
