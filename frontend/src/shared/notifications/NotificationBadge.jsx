import useNotifications from '../hooks/useNotification';

export default function NotificationBadge({ className = '' }) {
    const { unreadCount } = useNotifications();

    if (unreadCount === 0) return null;

    return (
        <span
            className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-none text-slate ${className}`}
        >
            {unreadCount > 9 ? '9+' : unreadCount}
        </span>
    );
}
