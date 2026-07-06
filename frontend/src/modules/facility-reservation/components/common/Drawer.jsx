import React from 'react'
import '../../styles/layout.css'

export default function Drawer({ isOpen, onClose, title, hideHeader = false, children }) {
  const shouldRenderHeader = !!title && !hideHeader

  return (
    <>
      {isOpen && <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={`drawer ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label={title || 'Drawer'}>
        {shouldRenderHeader && (
          <div className="drawer-header">
            <div className="drawer-title">{title || 'Details'}</div>
            <button type="button" className="drawer-close" onClick={onClose} aria-label="Close drawer">
              ×
            </button>
          </div>
        )}
        <div className="drawer-content">{children}</div>
      </aside>
    </>
  )
}
