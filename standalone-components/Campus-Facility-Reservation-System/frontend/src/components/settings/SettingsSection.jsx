/**
 * SettingsSection — reusable titled section card for Settings page
 *
 * Props:
 *   title    : string
 *   subtitle : string (optional)
 *   children : ReactNode
 */

export default function SettingsSection({ title, subtitle, children }) {
  return (
    <section
      style={{
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      {/* Section header */}
      <div
        style={{
          padding: '12px 22px',
          background: 'var(--color-surface-header)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '6px 0' }}>
        {children}
      </div>
    </section>
  );
}
