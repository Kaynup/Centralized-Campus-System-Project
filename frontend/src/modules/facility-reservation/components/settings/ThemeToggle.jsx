/**
 * ThemeToggle — light/dark mode switch for the Settings page
 *
 * Consumes ThemeContext. Renders a pill-style toggle with sun/moon icons.
 */

import { useTheme } from '../../../../shared/context/ThemeContext';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12"  x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 22px',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {isDark
            ? 'Easy on the eyes in low-light environments.'
            : 'High contrast for bright environments.'}
        </div>
      </div>

      {/* Toggle pill */}
      <button
        id="theme-toggle-btn"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={!isDark}
        style={{
          position: 'relative',
          width: '56px',
          height: '30px',
          borderRadius: '999px',
          border: '1px solid var(--color-border)',
          background: isDark ? '#1e3a5f' : '#fde68a',
          cursor: 'pointer',
          transition: 'background 0.25s ease',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 4px',
        }}
      >
        {/* Knob */}
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: isDark ? '3px' : '27px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: isDark ? '#93c5fd' : '#f59e0b',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            transition: 'left 0.25s ease, background 0.25s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#1e3a5f' : '#7c3c00',
          }}
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </span>
      </button>
    </div>
  );
}
