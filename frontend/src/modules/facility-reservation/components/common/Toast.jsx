import React, { useEffect } from 'react'

/* ── Toast Icons ───────────────────────────────────────────────────────────── */
const TOAST_ICONS = {
  success: (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
}

const TOAST_COLORS = {
  success: '#10b981',
  error: '#ef4444',
  info: '#3b82f6',
  warning: '#f59e0b',
}

/* ── Individual Toast Card ─────────────────────────────────────────────────── */
function Toast({ toast, onDismiss }) {
  const { id, message, type } = toast

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id)
    }, 4000)
    return () => clearTimeout(timer)
  }, [id, onDismiss])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 16px',
        background: 'rgba(26, 26, 46, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${TOAST_COLORS[type] || '#3b82f6'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.875rem',
        minWidth: '280px',
        maxWidth: '380px',
        animation: 'toastSlideIn 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <span style={{ display: 'flex', shrink: 0 }}>
          {TOAST_ICONS[type] || TOAST_ICONS.info}
        </span>
        <span style={{ lineHeight: '1.4', fontWeight: 500 }}>{message}</span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onDismiss(id)
        }}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          fontSize: '1.2rem',
          fontWeight: 700,
          padding: '0 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color var(--transition-fast)',
          pointerEvents: 'auto',
        }}
        onMouseEnter={(e) => (e.target.style.color = 'var(--color-text-primary)')}
        onMouseLeave={(e) => (e.target.style.color = 'var(--color-text-muted)')}
      >
        ×
      </button>
    </div>
  )
}

/* ── Container for rendering toasts at bottom right ─────────────────────────── */
export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'auto',
      }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}

      {/* Global CSS animation definitions */}
      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
