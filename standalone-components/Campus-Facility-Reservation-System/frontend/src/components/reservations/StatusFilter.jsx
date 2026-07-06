/**
 * StatusFilter — filter tabs for My Reservations page
 *
 * Props:
 *   activeFilter : string  — current active tab key
 *   onChange     : fn      — called with new filter key
 *   counts       : object  — { all, active, pending, cancelled }
 */

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'pending',   label: 'Pending' },
  { key: 'cancelled', label: 'Cancelled' },
];

const TAB_COLORS = {
  active:    { active: '#15803d', dot: '#22c55e' },
  pending:   { active: '#b45309', dot: '#f59e0b' },
  cancelled: { active: '#991b1b', dot: '#f87171' },
  all:       { active: '#2563eb', dot: '#60a5fa' },
};

export default function StatusFilter({ activeFilter, onChange, counts }) {
  return (
    <div
      role="tablist"
      aria-label="Filter reservations by status"
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      {TABS.map(({ key, label }) => {
        const isActive = activeFilter === key;
        const colors = TAB_COLORS[key];
        const count = counts?.[key] ?? 0;

        return (
          <button
            key={key}
            role="tab"
            id={`reservations-tab-${key}`}
            aria-selected={isActive}
            onClick={() => onChange(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 16px',
              borderRadius: '999px',
              border: isActive
                ? `1px solid ${colors.active}44`
                : '1px solid var(--color-border)',
              background: isActive
                ? `${colors.active}22`
                : 'var(--color-surface-subtle)',
              color: isActive ? colors.dot : 'var(--color-text-muted)',
              fontSize: '0.82rem',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {isActive && (
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: colors.dot,
                  flexShrink: 0,
                }}
              />
            )}
            {label}
            <span
              style={{
                marginLeft: '2px',
                padding: '1px 7px',
                borderRadius: '999px',
                background: isActive ? `${colors.active}33` : 'var(--color-surface-hover)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: isActive ? colors.dot : 'var(--color-text-muted)',
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
