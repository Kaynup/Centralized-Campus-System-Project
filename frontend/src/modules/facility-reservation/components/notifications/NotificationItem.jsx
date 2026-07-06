/**
 * NotificationItem — a single notification entry in the feed
 *
 * Props:
 *   notification  : object  — { id, type, title, message, timestamp, read }
 *   onMarkRead    : fn(id)
 */

const TYPE_CONFIG = {
  booking_confirmed: { color: '#22c55e', label: 'Confirmed', borderColor: '#22c55e' },
  booking_rejected:  { color: '#f87171', label: 'Rejected',  borderColor: '#f87171' },
  approval_request:  { color: '#f59e0b', label: 'Approval',  borderColor: '#f59e0b' },
  cancellation:      { color: '#94a3b8', label: 'Cancelled', borderColor: '#94a3b8' },
  system_info:       { color: '#60a5fa', label: 'System',    borderColor: '#60a5fa' },
};

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationItem({ notification, onMarkRead }) {
  const cfg = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system_info;
  const isUnread = !notification.read;

  return (
    <div
      id={`notification-${notification.id}`}
      onClick={() => isUnread && onMarkRead(notification.id)}
      style={{
        display: 'flex',
        gap: '14px',
        padding: '16px 18px',
        borderBottom: '1px solid var(--color-border)',
        background: isUnread ? 'var(--color-surface-subtle)' : 'transparent',
        borderLeft: `3px solid ${isUnread ? cfg.borderColor : 'transparent'}`,
        cursor: isUnread ? 'pointer' : 'default',
        transition: 'background 0.15s',
        opacity: notification.read ? 0.7 : 1,
      }}
      onMouseEnter={(e) => { if (isUnread) e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
      onMouseLeave={(e) => { if (isUnread) e.currentTarget.style.background = 'var(--color-surface-subtle)'; }}
    >
      {/* Unread dot */}
      <div style={{ paddingTop: '4px', flexShrink: 0 }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isUnread ? cfg.color : 'transparent',
            border: isUnread ? 'none' : '1.5px solid var(--color-border)',
            transition: 'all 0.15s',
          }}
        />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: cfg.color,
                flexShrink: 0,
              }}
            >
              {cfg.label}
            </span>
            <span style={{ fontWeight: isUnread ? 700 : 500, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              {notification.title}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
            {formatRelativeTime(notification.createdAt || notification.created_at || notification.timestamp)}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          {notification.message}
        </p>
        {isUnread && (
          <span style={{ fontSize: '0.75rem', color: cfg.color, marginTop: '4px', display: 'block', fontWeight: 500 }}>
            Click to mark as read
          </span>
        )}
      </div>
    </div>
  );
}
