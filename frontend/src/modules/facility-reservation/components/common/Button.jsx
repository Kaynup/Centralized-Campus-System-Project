import React from 'react'

const spinnerStyle = {
  display: 'inline-block',
  width: '14px',
  height: '14px',
  border: '2px solid rgba(255,255,255,0.3)',
  borderTopColor: 'currentColor',
  borderRadius: '50%',
  animation: 'btn-spin 0.6s linear infinite',
  flexShrink: 0,
}

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('btn-spin-keyframes')) {
  const style = document.createElement('style')
  style.id = 'btn-spin-keyframes'
  style.textContent = '@keyframes btn-spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(style)
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
  className = '',
  type = 'button',
}) {
  const classes = ['btn', `btn-${variant}`, `btn-${size}`, className].filter(Boolean).join(' ')
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <span style={spinnerStyle} aria-hidden="true" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
