import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { RefreshCw, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import MiniCalendar from './MiniCalendar.jsx'
import { useNotification } from '../../../../shared/hooks/useNotification'
import '../../styles/layout.css'
import './PageLayout.css'

/**
 * PageLayout — rewritten.
 * ------------------------------------------------------------------
 * Previously rendered its own fixed-position Sidebar + TopBar,
 * competing with the central AppShell's Sidebar + Navbar for the same
 * screen space — that's what was covering the whole viewport.
 *
 * Facility's routes already render inside the central AppShell's
 * <main> (via <Outlet/>), which handles its own padding, scroll, and
 * sidebar width. This component's only job now is the CONTENT that's
 * actually specific to the calendar page:
 *   - day navigation + view toggle + today's-stats (was TopBar)
 *   - the mini-calendar + date filter toggle (was in the old Sidebar)
 *
 * Navigation itself (Calendar / My Reservations / Profile / Admin)
 * moved to the central Sidebar.jsx as an expandable "Facilities"
 * subsection — see FACILITY_ITEMS there.
 *
 * Balance and user-avatar/role, previously duplicated in the old
 * TopBar, were dropped entirely rather than relocated — the central
 * Navbar already shows both.
 * ------------------------------------------------------------------
 */
export default function PageLayout({
  children,
  selectedDate,
  onDateChange = () => {},
  viewMode = 'day',
  onViewModeChange = () => {},
  todaySlots = 0,
  pendingBookings = 0,
  activeReservations = 0,
  enableDateFilter,
  onToggleDateFilter,
}) {
  const [showMiniCalendar, setShowMiniCalendar] = useState(false)
  const location = useLocation()
  const hideCalendarChrome = location.pathname === '/facility/profile' || location.pathname === '/facility/settings'

  let notificationsContext = null
  try {
    notificationsContext = useNotification()
  } catch (e) {}
  const backendUpdated = notificationsContext?.backendUpdated
  const dismissUpdateBanner = notificationsContext?.dismissUpdateBanner

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

  const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    const [year, monthStr, dayStr] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[parseInt(monthStr, 10) - 1];
    const day = parseInt(dayStr, 10);
    
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';

    return `${month} ${day}${suffix}, ${year}`;
  };

  return (
    <div className="facility-page">
      {backendUpdated && (
        <div className="facility-update-banner">
          <span>The backend has been updated. Please refresh the page.</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => window.location.reload()} className="facility-update-banner__refresh">
              Refresh
            </button>
            <button onClick={dismissUpdateBanner} className="facility-update-banner__dismiss" aria-label="Dismiss">
              &times;
            </button>
          </div>
        </div>
      )}

      {/* In-flow toolbar — was the fixed TopBar. Hidden on Profile/Settings,
          same as the original isProfileOrSettings check used to do. */}
      {!hideCalendarChrome && (
        <div className="calendar-toolbar">
          <div className="calendar-toolbar__date">
            <button onClick={prevDay} aria-label="Previous day" className="calendar-toolbar__nav-btn">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="calendar-toolbar__date-label">{formatDateString(selectedDate)}</span>
            <button onClick={nextDay} aria-label="Next day" className="calendar-toolbar__nav-btn">
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Popup anchor — panel below is absolutely positioned relative
                to this wrapper, so opening it never pushes the toolbar or
                the calendar grid around. */}
            <div className="calendar-toolbar__popup-anchor">
              <button
                onClick={() => setShowMiniCalendar((prev) => !prev)}
                className="calendar-toolbar__nav-btn"
                aria-label="Toggle date picker"
                title="Pick a date"
              >
                <CalendarDays className="w-4 h-4" />
              </button>

              {showMiniCalendar && (
                <>
                  <div className="calendar-toolbar__popup-backdrop" onClick={() => setShowMiniCalendar(false)} />
                  <div className="calendar-toolbar__popup-panel">
                    <MiniCalendar
                      selectedDate={selectedDate}
                      onDateChange={(date) => {
                        onDateChange(date)
                        setShowMiniCalendar(false)
                      }}
                    />
                    <button
                      onClick={onToggleDateFilter}
                      className={`calendar-toolbar__filter-toggle ${enableDateFilter ? 'is-on' : ''}`}
                    >
                      <span className="calendar-toolbar__filter-dot" />
                      {enableDateFilter ? 'Date Filter: ON' : 'Date Filter: OFF'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="calendar-toolbar__stats">
            <span>Active: {activeReservations}</span>
            <span>Pending: {pendingBookings}</span>
            <span>Today: {todaySlots}</span>
            <button onClick={() => window.location.reload()} className="calendar-toolbar__nav-btn" title="Hard refresh" aria-label="Refresh data">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="facility-page__content">{children}</div>
    </div>
  )
}