import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import '../../styles/layout.css'

export default function TopBar({
  selectedDate,
  onDateChange = () => { },
  viewMode = 'day',
  onViewModeChange = () => { },
  onToggleSidebar = () => { },
  currentUser,
  todaySlots = 0,
  pendingBookings = 0,
  activeReservations = 0,
}) {
  const [showStatsDropdown, setShowStatsDropdown] = useState(false)
  const location = useLocation()

  const pageTitles = {
    '/': 'Calendar',
    '/calendar': 'Calendar',
    '/reservations': 'My Reservations',
    '/notifications': 'Notifications',
    '/profile': 'Profile',
    '/settings': 'Settings',
    '/admin/approvals': 'Pending Approval Requests',
    '/admin/logs': 'System Audit Logs'
  }

  const activeTitle = pageTitles[location.pathname] || 'Calendar'
  const isAdminPage = location.pathname.startsWith('/admin')
  const isCalendarPage = location.pathname === '/calendar'

  const prevDay = () => {
    if (!selectedDate) return
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    onDateChange(d.toISOString().slice(0, 10))
  }

  const nextDay = () => {
    if (!selectedDate) return
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    onDateChange(d.toISOString().slice(0, 10))
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const userDispName = currentUser?.fullName || currentUser?.full_name || currentUser?.name || currentUser?.email || 'User'
  const dayIndex = selectedDate ? selectedDate.split('-')[2] : ''

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button className="hamburger" aria-label="Toggle sidebar" onClick={onToggleSidebar}>☰</button>
        <div className="topbar-title">{activeTitle}</div>
      </div>

      <div className="topbar-center">
        {isCalendarPage && (
          <div className="date-nav">
            <button onClick={prevDay} aria-label="Previous day">‹</button>
            <div className="current-date" style={{ fontSize: '1.4rem', fontWeight: 800 }}>{dayIndex}</div>
            <button onClick={nextDay} aria-label="Next day">›</button>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {isCalendarPage && (
          <div className="stats-display" style={{ position: 'relative', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Hard Refresh"
              aria-label="Refresh Data"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M16 16h5v5"/>
              </svg>
            </button>
            <button
              className="stats-badge"
              onClick={() => setShowStatsDropdown(!showStatsDropdown)}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              <span>Balance: {currentUser?.tokenBalance ?? 0}</span>
              <span>Active: {activeReservations}</span>
              <span>Pending: {pendingBookings}</span>
              <span>Today: {todaySlots}</span>
            </button>

            {showStatsDropdown && (
              <div
                className="stats-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'var(--color-facility-header-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  minWidth: '200px',
                  zIndex: 100,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Token Balance</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-available)' }}>{currentUser?.tokenBalance ?? 0} tokens</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Active Reservations</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-my-booking)' }}>{activeReservations}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Pending Bookings</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-pending)' }}>{pendingBookings}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Available Today</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-available)' }}>{todaySlots} slots</span>
                  </div>
                </div>
              </div>
            )}

            {showStatsDropdown && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 99,
                }}
                onClick={() => setShowStatsDropdown(false)}
              />
            )}
          </div>
        )}

        {currentUser?.role && (
          <div style={{
            padding: '4px 10px',
            borderRadius: '4px',
            background: currentUser.role === 'admin' ? 'rgba(25,63,125,0.25)' 
                      : currentUser.role === 'professor' ? 'rgba(156,86,36,0.25)'
                      : 'rgba(19,103,50,0.25)',
            border: `1px solid ${
                      currentUser.role === 'admin' ? '#7aafff' 
                    : currentUser.role === 'professor' ? '#f4a861'
                    : '#6bcf8f'}`,
            color: currentUser.role === 'admin' ? '#7aafff' 
                 : currentUser.role === 'professor' ? '#f4a861'
                 : '#6bcf8f',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            height: 'fit-content',
          }}>
            {currentUser.role}
          </div>
        )}

        <div className="avatar" title={userDispName} style={{ fontWeight: 700 }}>
          {getInitials(userDispName)}
        </div>
      </div>
    </header>
  )
}
