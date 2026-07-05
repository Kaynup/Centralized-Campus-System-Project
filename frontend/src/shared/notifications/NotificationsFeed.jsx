// Reusable list of notifications, shared by the Navbar dropdown (limited,
// compact) and the full /notifications page (unlimited).

import { AlertTriangle, Bell } from 'lucide-react';
import NotificationItem from './NotificationItem';
import EmptyState from '../ui/EmptyState';
import useNotifications from '../hooks/useNotification';

function FeedSkeleton() {
  return (
    <div className="divide-y divide-slate/10" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 px-4 py-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-slate/10" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-3.5 w-1/3 rounded bg-slate/10" />
            <div className="h-3 w-2/3 rounded bg-slate/10" />
            <div className="h-2.5 w-1/4 rounded bg-slate/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsFeed({ limit, onItemClick }) {
  const { notifications, loading, error } = useNotifications();

  const items = typeof limit === 'number' ? notifications.slice(0, limit) : notifications;

  if (loading && notifications.length === 0) {
    return <FeedSkeleton />;
  }

  if (error && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={20} />
        </span>
        <p className="text-sm font-medium text-slate">Couldn&apos;t load notifications</p>
        <p className="text-sm text-slate/50">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bell size={32} className="mx-auto text-slate/30" />}
        title="No notifications yet"
        message="You're all caught up. Updates from Equipment, Facility, Marketplace, and Core will show up here."
      />
    );
  }

  return (
    <div className="divide-y divide-slate/10">
      {items.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onAfterAction={onItemClick}
        />
      ))}
    </div>
  );
}

