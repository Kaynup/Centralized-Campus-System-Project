/**
 * BookingStats — 4-card stat summary for the profile page
 *
 * Props:
 *   stats : { total, active, pending, cancelled }
 */

const STAT_CONFIG = [
  { key: 'total',     label: 'Total Bookings',  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)' },
  { key: 'active',    label: 'Active',           color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)' },
  { key: 'pending',   label: 'Pending Approval', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
  { key: 'cancelled', label: 'Cancelled',        color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)' },
];

export default function BookingStats({ stats }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '14px',
      }}
    >
      {STAT_CONFIG.map(({ key, label, color, bg, border }) => (
        <div
          key={key}
          style={{
            background: 'var(--color-facility-header-bg)',
            border: `1px solid ${border}`,
            borderRadius: '10px',
            padding: '20px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'Consolas, Monaco, monospace',
            }}
          >
            {stats?.[key] ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
