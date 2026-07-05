import { useNavigate } from 'react-router-dom';
import { Package, Building2, ShoppingBag, ShieldCheck, Circle } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import useNotifications from '../hooks/useNotification';

const DOMAIN_ICON = {
  equipment: Package,
  facility: Building2,
  marketplace: ShoppingBag,
  core: ShieldCheck,
};

const DOMAIN_ROUTE = {
  equipment: '/equipment',
  facility: '/facility',
  marketplace: '/marketplace',
  core: '/dashboard',
};

const DOMAIN_LABEL = {
  equipment: 'Equipment',
  facility: 'Facility',
  marketplace: 'Marketplace',
  core: 'Core',
};

const DOMAIN_TONE = {
  equipment: 'info',
  facility: 'success',
  marketplace: 'gold',
  core: 'default',
};

export function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

export default function NotificationItem({ notification, onAfterAction }) {
  const navigate = useNavigate();
  const { markAsRead } = useNotifications();

  const Icon = DOMAIN_ICON[notification.domain] || ShieldCheck;
  const domainLabel = DOMAIN_LABEL[notification.domain] || notification.domain;
  const domainTone = DOMAIN_TONE[notification.domain] || 'default';

  const handleClick = async () => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.reference_id) {
      const basePath = DOMAIN_ROUTE[notification.domain] || '/dashboard';
      navigate(`${basePath}/${notification.reference_id}`);
    }

    onAfterAction?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left transition-colors hover:bg-slate/5 ${
        notification.is_read ? 'border-l-transparent' : 'border-l-gold bg-gold/5'
      }`}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
        <Icon size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span
            className={`truncate text-sm ${
              notification.is_read ? 'font-medium text-slate/80' : 'font-semibold text-slate'
            }`}
          >
            {notification.title}
          </span>
          {!notification.is_read && (
            <Circle size={8} className="shrink-0 fill-gold text-gold" aria-label="Unread" />
          )}
        </span>

        <span className="mt-0.5 block line-clamp-2 text-sm text-slate/60">
          {notification.message}
        </span>

        <span className="mt-1.5 flex items-center gap-2">
          <StatusBadge status={domainLabel} tone={domainTone} />
          <span className="text-xs text-slate/40">
            {formatRelativeTime(notification.created_at)}
          </span>
        </span>
      </span>
    </button>
  );
}
