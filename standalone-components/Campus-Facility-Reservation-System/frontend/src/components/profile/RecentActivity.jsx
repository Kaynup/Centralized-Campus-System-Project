/**
 * RecentActivity — small table showing the 3 most recent bookings
 *
 * Props:
 *   bookings : Array — full booking list; component takes top 3
 */

const STATUS_COLOR = {
  ACTIVE:    '#22c55e',
  PENDING:   '#f59e0b',
  CANCELLED: '#f87171',
  COMPLETED: '#94a3b8',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RecentActivity({ bookings }) {
  const recent = (bookings || []).slice(0, 3);

  const thStyle = {
    padding: '12px 14px',
    textAlign: 'left',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    background: 'var(--color-surface-header)',
    color: 'var(--color-text-primary)',
    borderBottom: '1px solid var(--color-border)',
  };

  const tdStyle = {
    padding: '12px 14px',
    fontSize: '0.84rem',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle',
  };

  if (recent.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.875rem',
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        No recent booking activity.
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--color-surface-card)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Facility</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Time</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((b, idx) => (
            <tr
              key={b.id}
              style={{
                background: 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                  {b.facilityName}
                </div>
              </td>
              <td style={{ ...tdStyle, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontFamily: 'Consolas, Monaco, monospace' }}>
                {formatDate(b.date)}
              </td>
              <td style={{ ...tdStyle, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontFamily: 'Consolas, Monaco, monospace' }}>
                {b.startTime} – {b.endTime}
              </td>
              <td style={tdStyle}>
                <span style={{ fontWeight: 700, color: STATUS_COLOR[b.status] || '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {b.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
