/**
 * ProfileHeader — displays user avatar, identity info, and token balance
 *
 * Props:
 *   user : { fullName, email, role, tokenBalance }
 */

const ROLE_STYLES = {
  admin:     { label: 'Admin',     color: '#f4a861', bg: 'rgba(244,168,97,0.15)' },
  professor: { label: 'Professor', color: '#b48be8', bg: 'rgba(180,139,232,0.15)' },
  student:   { label: 'Student',   color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
};

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfileHeader({ user }) {
  const role = ROLE_STYLES[user?.role] || ROLE_STYLES.student;

  return (
    <div
      style={{
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        flexWrap: 'wrap',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Avatar */}
      <div
        aria-hidden="true"
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'var(--color-surface-header)',
          border: '2px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          flexShrink: 0,
          letterSpacing: '0.05em',
        }}
      >
        {getInitials(user?.fullName)}
      </div>

      {/* Identity */}
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
            }}
          >
            {user?.fullName || 'Unknown User'}
          </h1>
          <span
            style={{
              padding: '3px 12px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              background: role.bg,
              color: role.color,
            }}
          >
            {role.label}
          </span>
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          {user?.email || '—'}
        </div>

        {/* Token balance chip */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '999px',
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.25)',
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="#22c55e" strokeWidth="2" fill="none">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#22c55e' }}>
            <span style={{ fontFamily: 'Consolas, Monaco, monospace' }}>{user?.tokenBalance ?? 0}</span> tokens remaining
          </span>
        </div>
      </div>
    </div>
  );
}
