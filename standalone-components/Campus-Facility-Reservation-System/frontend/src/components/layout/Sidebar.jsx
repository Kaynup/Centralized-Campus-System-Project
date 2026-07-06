import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import MiniCalendar from './MiniCalendar.jsx'
import '../../styles/layout.css'

export default function Sidebar({ isCollapsed: isCollapsedProp, onToggle, selectedDate, onDateChange, enableDateFilter, onToggleDateFilter }) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const isControlled = typeof isCollapsedProp === 'boolean'
  const isCollapsed = isControlled ? isCollapsedProp : internalCollapsed
  const { user } = useAuth()
  const isAdmin = user && user.role === 'admin'
  const isProfessor = user && user.role === 'professor'
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')

  const navItems = [
    { 
      key: 'calendar', 
      label: 'Calendar', 
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ), 
      href: '/calendar' 
    },
    { key: 'my',            label: 'My Reservations', href: '/reservations',  icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          <line x1="9" y1="9" x2="15" y2="9"></line>
          <line x1="9" y1="13" x2="15" y2="13"></line>
          <line x1="9" y1="17" x2="15" y2="17"></line>
        </svg>
      )
    },
    { key: 'notifications', label: 'Notifications',   href: '/notifications', icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      )
    },
    { key: 'profile',       label: 'Profile',         href: '/profile',       icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    },
    { key: 'settings',      label: 'Settings',        href: '/settings',      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    },
  ]

  const showMiniCalendar = !['/notifications', '/profile', '/settings'].includes(location.pathname)

  return (
    <aside className={isCollapsed ? 'sidebar collapsed' : 'sidebar'}>
      <div className="sidebar-header" style={{ justifyContent: 'center', padding: '0 8px', width: '100%', boxSizing: 'border-box' }}>
        {!isCollapsed && <div className="sidebar-title" style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.05em', textAlign: 'center', width: '100%' }}>FACILITY RESERVATION</div>}
      </div>

      <div className="sidebar-top">
        {!isCollapsed && (
          <>
            {showMiniCalendar && <MiniCalendar selectedDate={selectedDate} onDateChange={onDateChange} />}
            {(isAdminPage || location.pathname === '/reservations') && (
              <div style={{ padding: '8px 12px 12px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={onToggleDateFilter}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: enableDateFilter ? 'var(--color-available)' : 'var(--color-surface-hover)',
                    color: enableDateFilter ? '#fff' : 'var(--color-text-primary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: enableDateFilter ? '#10B981' : '#6B7280',
                    display: 'inline-block'
                  }} />
                  {enableDateFilter ? 'Date Filter: ON' : 'Date Filter: OFF'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sidebar-spacer" />

      <nav className="sidebar-nav" aria-label="Main navigation" style={{ flex: '0 0 auto' }}>
        {!isCollapsed && (
          <div style={{
            padding: '6px 12px 2px',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: '4px',
            marginBottom: '2px',
          }}>
            Navigations
          </div>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <a
              key={item.key}
              href={item.href}
              className="sidebar-nav-item"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              style={isActive ? {
                background: 'rgba(255,255,255,0.08)',
                borderLeft: '2px solid var(--color-my-booking)',
                paddingLeft: '10px',
              } : {}}
            >
              <span className="nav-icon" aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'var(--color-my-booking)' : 'inherit' }}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="nav-label" style={{ color: isActive ? 'var(--color-text-primary)' : 'inherit', fontWeight: isActive ? 700 : 400 }}>{item.label}</span>}
            </a>
          )
        })}

        {/* Admin section — only visible to admins */}
        {isAdmin && (
          <>
            {!isCollapsed && (
              <div style={{
                padding: '6px 12px 2px',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: '8px',
              }}>
                Admin
              </div>
            )}

            {/* Approvals: visible to admins only */}
            <a
              href="/admin/approvals"
              className="sidebar-nav-item"
              aria-label="Approvals"
              title="Approvals"
              style={location.pathname === '/admin/approvals' ? {
                background: 'rgba(255,255,255,0.08)',
                borderLeft: '2px solid var(--color-admin-approvals)',
                paddingLeft: '10px',
                color: 'var(--color-admin-approvals)',
              } : { color: 'var(--color-admin-approvals)' }}
            >
              <span className="nav-icon" aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              {!isCollapsed && <span className="nav-label">Approvals</span>}
            </a>

            {/* System Logs: visible to admins only */}
            <a
              href="/admin/logs"
              className="sidebar-nav-item"
              aria-label="System Logs"
              title="System Logs"
              style={location.pathname === '/admin/logs' ? {
                background: 'rgba(255,255,255,0.08)',
                borderLeft: '2px solid var(--color-admin-logs)',
                paddingLeft: '10px',
                color: 'var(--color-admin-logs)',
              } : { color: 'var(--color-admin-logs)' }}
            >
              <span className="nav-icon" aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5"></polyline>
                  <line x1="12" y1="19" x2="20" y2="19"></line>
                </svg>
              </span>
              {!isCollapsed && <span className="nav-label">System Logs</span>}
            </a>

            <a
              href="/admin/users/upload"
              className="sidebar-nav-item"
              aria-label="User Entries"
              title="User Entries"
              style={location.pathname === '/admin/users/upload' ? {
                background: 'rgba(255,255,255,0.08)',
                borderLeft: '2px solid var(--color-admin-users)',
                paddingLeft: '10px',
                color: 'var(--color-admin-users)',
              } : { color: 'var(--color-admin-users)' }}
            >
              <span className="nav-icon" aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <line x1="19" y1="8" x2="19" y2="14"></line>
                  <line x1="16" y1="11" x2="22" y2="11"></line>
                </svg>
              </span>
              {!isCollapsed && <span className="nav-label">User Entries</span>}
            </a>
          </>
        )}
      </nav>
    </aside>
  )
}

