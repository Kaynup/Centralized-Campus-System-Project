/**
 * NotificationsFeed — header actions + list of NotificationItem entries
 *
 * Props:
 *   notifications  : Array
 *   onMarkRead     : fn(id)
 *   onMarkAllRead  : fn()
 *   onClearRead    : fn()
 */

import NotificationItem from './NotificationItem';

export default function NotificationsFeed({ notifications, onMarkRead, onMarkAllRead, onClearRead }) {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasRead     = notifications.some((n) => n.read);

  const btnBase = {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    background: 'transparent',
    color: 'var(--color-text-muted)',
    transition: 'all 0.15s',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        maxHeight: 'calc(100vh - 120px)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Feed header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'var(--color-surface-header)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                padding: '2px 9px',
                borderRadius: '999px',
                background: 'rgba(99,102,241,0.2)',
                color: '#a5b4fc',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {unreadCount} unread
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button
              id="mark-all-read-btn"
              onClick={onMarkAllRead}
              style={btnBase}
            >
              Mark all read
            </button>
          )}
          {hasRead && (
            <button
              id="clear-read-btn"
              onClick={onClearRead}
              style={{ ...btnBase, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              Clear read
            </button>
          )}
        </div>
      </div>

      {/* Feed body */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div
            style={{
              padding: '64px 24px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
            }}
          >
            You have no notifications.
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={onMarkRead} />
          ))
        )}
      </div>
    </div>
  );
}
