/**
 * ReservationsTable — displays filtered bookings in a table
 *
 * Props:
 *   bookings   : Array   — list of booking objects
 *   onCancel   : fn(id)  — called when user clicks Cancel on a row
 *   isLoading  : bool
 */

const STATUS_STYLES = {
  ACTIVE:    { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e',  label: 'Active' },
  PENDING:   { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b',  label: 'Pending' },
  CANCELLED: { bg: 'rgba(239,68,68,0.12)',  color: '#f87171',  label: 'Cancelled' },
  COMPLETED: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: 'Completed' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.COMPLETED;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(5)].map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div
            style={{
              height: '14px',
              borderRadius: '4px',
              background: 'var(--color-facility-header-bg)',
              opacity: 0.7,
              width: i === 0 ? '60%' : i === 4 ? '30%' : '80%',
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function ReservationsTable({ bookings, onCancel, isLoading }) {
  const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--color-text-muted)',
    background: 'var(--color-surface-header)',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '14px 16px',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.875rem',
    verticalAlign: 'middle',
  };

  return (
    <div
      style={{
        overflowX: 'auto',
        overflowY: 'auto',
        flex: 1,
        minHeight: 0,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: '640px',
          tableLayout: 'fixed',
        }}
      >
        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          <tr>
            <th style={{ ...thStyle, width: '32%' }}>Facility</th>
            <th style={{ ...thStyle, width: '14%' }}>Date</th>
            <th style={{ ...thStyle, width: '16%' }}>Time</th>
            <th style={{ ...thStyle, width: '14%' }}>Status</th>
            <th style={{ ...thStyle, width: '24%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            : bookings.length === 0
            ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.9rem',
                  }}
                >
                  No reservations found for this filter.
                </td>
              </tr>
            )
            : (() => {
              // Merge consecutive bookings that belong to the same facility/date/status
              const toMins = (t) => {
                if (!t) return 0;
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
              };

              const sorted = [...bookings].sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                if (a.facilityName !== b.facilityName) return a.facilityName.localeCompare(b.facilityName);
                return toMins(a.startTime) - toMins(b.startTime);
              });

              const merged = [];
              for (const b of sorted) {
                const last = merged.length ? merged[merged.length - 1] : null;
                if (
                  last &&
                  last.facilityName === b.facilityName &&
                  last.date === b.date &&
                  last.status === b.status &&
                  toMins(last.endTime) === toMins(b.startTime)
                ) {
                  // extend last
                  last.endTime = b.endTime;
                  last.ids.push(b.id);
                } else {
                  merged.push({ ...b, ids: [b.id] });
                }
              }

              return merged.map((b, idx) => (
              <tr
                key={b.ids.join('-')}
                style={{
                  background: 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.facilityName}
                  </div>
                  {b.facilityGroup && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {b.facilityGroup}
                    </div>
                  )}
                </td>
                <td style={{ ...tdStyle, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {formatDate(b.date)}
                </td>
                <td style={{ ...tdStyle, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                  {b.startTime} – {b.endTime}
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={b.status} />
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {(b.status === 'ACTIVE' || b.status === 'PENDING') ? (
                    <button
                      id={`cancel-booking-${b.ids.join('-')}`}
                      onClick={() => onCancel(b)}
                      style={{
                        padding: '5px 14px',
                        borderRadius: '6px',
                        border: '1px solid rgba(239,68,68,0.4)',
                        background: 'rgba(239,68,68,0.1)',
                        color: '#f87171',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                    >
                      Cancel
                    </button>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
                  )}
                </td>
              </tr>
            ))
            })()
          }
        </tbody>
      </table>
    </div>
  );
}
