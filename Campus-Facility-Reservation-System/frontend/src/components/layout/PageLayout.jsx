import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'
import '../../styles/layout.css'

import { useNotifications } from '../../contexts/NotificationContext'

export default function PageLayout({ children, selectedDate, onDateChange, viewMode, onViewModeChange, currentUser, todaySlots = 0, pendingBookings = 0, activeReservations = 0, enableDateFilter, onToggleDateFilter }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()
  
  // Safe extraction to avoid crashes if Context isn't fully ready in tests
  let notificationsContext = null;
  try {
    notificationsContext = useNotifications();
  } catch (e) {}
  
  const backendUpdated = notificationsContext?.backendUpdated;
  const dismissUpdateBanner = notificationsContext?.dismissUpdateBanner;

  useEffect(() => {
    // toggle a body class so topbar positioning can react via CSS
    document.body.classList.toggle('sidebar-collapsed', isCollapsed)
    return () => {
      document.body.classList.remove('sidebar-collapsed')
    }
  }, [isCollapsed])

  const handleToggle = (next) => {
    setIsCollapsed(Boolean(next))
  }

  const isProfileOrSettings = location.pathname === '/profile' || location.pathname === '/settings'

  const mainStyle = {
    marginLeft: isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
    paddingTop: isProfileOrSettings ? 0 : 'var(--topbar-height)',
    height: '100vh',
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div className="page-layout">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={handleToggle}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        currentUser={currentUser}
        enableDateFilter={enableDateFilter}
        onToggleDateFilter={onToggleDateFilter}
      />
      {!isProfileOrSettings && (
        <TopBar
          onToggleSidebar={() => handleToggle(!isCollapsed)}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          currentUser={currentUser}
          todaySlots={todaySlots}
          pendingBookings={pendingBookings}
          activeReservations={activeReservations}
        />
      )}

      <main style={mainStyle}>
        {backendUpdated && (
          <div style={{
            backgroundColor: 'var(--brand-primary, #60a5fa)',
            color: 'white',
            padding: '8px 16px',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 100,
            flexShrink: 0
          }}>
            <span>The backend has been updated. Please refresh the page.</span>
            <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
              <button 
                onClick={() => window.location.reload()} 
                style={{background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'}}
              >
                Refresh
              </button>
              <button 
                onClick={dismissUpdateBanner} 
                style={{background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0}}
              >
                &times;
              </button>
            </div>
          </div>
        )}
        <div style={{flex: 1, overflow: 'auto'}}>
          {children}
        </div>
      </main>
    </div>
  )
}
