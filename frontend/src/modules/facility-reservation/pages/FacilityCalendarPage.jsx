/**
 * FacilityCalendarPage — Main Workspace
 *
 * Phase 7: All mock imports removed.
 * - Facilities   → useFacilities() context (DEV: MOCK_FACILITIES | PROD: API)
 * - Slots        → useSlotsForDate() hook  (DEV: generateMock   | PROD: API)
 * - Current user → useAuth().user          (DEV: dev-admin user | PROD: JWT user)
 * - Booking ops  → BookingContext          (DEV: simulated      | PROD: API)
 *
 * The DEV/PROD toggle lives in each context/hook, mirroring AuthContext's pattern.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import PageLayout           from '../components/layout/PageLayout'
import CalendarGrid         from '../components/calendar/CalendarGrid'
import CalendarLegend       from '../components/calendar/CalendarLegend'
import CalendarFilters      from '../components/calendar/CalendarFilters'
import ReservationDrawer    from '../components/calendar/ReservationDrawer'
import ChangeStatusDrawer   from '../components/calendar/ChangeStatusDrawer'
import UnavailableDetailsDrawer from '../components/calendar/UnavailableDetailsDrawer'
import PastDetailsDrawer    from '../components/calendar/PastDetailsDrawer'
import { useBooking } from "../contexts/BookingContext";
import { useFacilities } from "../contexts/FacilityContext";
import { useAuth } from "../../../shared/hooks/useAuth";
import { useNotification } from "../../../shared/hooks/useNotification";
import { useSlotsForDate }  from '../hooks/useSlotsForDate'
import { calculateSlotSpan } from '../utils/bookingHelpers'
import { getLocalDateString } from '../utils/dateHelpers'
import {useWallet} from '../../../shared/hooks/useWallet'



/* ── Loading Skeleton ────────────────────────────────────────────────────────
 * Shown while facilities or slots are loading.
 * Pulse animation is driven by the .skeleton-row keyframe in layout.css.
 * ─────────────────────────────────────────────────────────────────────────── */
function CalendarLoadingSkeleton() {
  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{
            height: '52px',
            borderRadius: '8px',
            background: 'var(--color-facility-header-bg)',
            opacity: 0.7,
            animation: `skeletonPulse 1.4s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

/* ── Error State ─────────────────────────────────────────────────────────────
 * Shown when the API fails.  Exposes a Retry callback.
 * ─────────────────────────────────────────────────────────────────────────── */
function CalendarError({ message, onRetry }) {
  return (
    <div
      style={{
        marginTop: '2rem',
        padding: '2rem',
        borderRadius: '12px',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.3)',
        textAlign: 'center',
        color: 'var(--color-text-primary)',
      }}
    >
      <p style={{ marginBottom: '1rem', color: 'var(--color-reserved)' }}>
        {message || 'Failed to load facility data. Please try again.'}
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: '8px 20px',
          borderRadius: '6px',
          border: 'none',
          background: 'var(--color-primary)',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.85rem',
        }}
      >
        Retry
      </button>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
function FacilityCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return sessionStorage.getItem('calendarSelectedDate') || getLocalDateString()
  })

  useEffect(() => {
    sessionStorage.setItem('calendarSelectedDate', selectedDate)
  }, [selectedDate])

  const [viewMode, setViewMode]         = useState('day')
  const [filters, setFilters]           = useState({
    group:              'All',
    availableOnly:      false,
    myReservationsOnly: false,
    approvalState:      'All',
    searchQuery:        '',
  })

  /* ── Contexts ─────────────────────────────────────────────────────────── */
  const {
    openBookingDrawer,
    refreshTrigger,
    multiSelectMode,
    selectedSlots,
    multiSelectFacility,
    setMultiSelectMode,
    toggleSlotSelection,
    selectSlotRange,
    reserveSelectedSlots,
    changeStatusSelectedSlots,
    drawerType
  } = useBooking()
  const { facilities, isLoading: facilitiesLoading, error: facilitiesError, loadFacilities } = useFacilities()
  const { user } = useAuth()
  const { balance } = useWallet();
  /* ── Slots (DEV → mock, PROD → API) ──────────────────────────────────── */
  const {
    slotsMap,
    isLoading: slotsLoading,
    error:     slotsError,
    refetch:   refetchSlots,
  } = useSlotsForDate(facilities, selectedDate, refreshTrigger)

  /* ── Normalise auth user → shape TopBar/Sidebar expect ───────────────── *
   * Auth user (DEV)  has { id, fullName, email, role }
   * Auth user (PROD) may have { id, full_name, email, role, token_balance }
   * TopBar reads: currentUser?.name, currentUser?.tokenBalance
   * ────────────────────────────────────────────────────────────────────── */
  const currentUser = useMemo(() => {
    if (!user) return null
    return {
      ...user,
      name:         user.fullName || user.full_name || user.name || user.email || 'User',
      tokenBalance: balance,
    }
  }, [user])

const { notify } = useNotification();

  useEffect(() => {
    if (currentUser && currentUser.tokenBalance !== undefined && currentUser.tokenBalance < 5) {
      notify.warning(`Low token balance: only ${currentUser.tokenBalance} tokens remaining.`);
    }
  }, [currentUser, notify])

  /* ── Derived stats for TopBar StatusBar ──────────────────────────────── */
  const todaySlots = useMemo(() => {
    const totalPerFacility = 60 // 10 hours × 6 (10-min slots)
    let free = 0
    Object.values(slotsMap).forEach((slots) => {
      let booked = 0
      slots.forEach((s) => { booked += calculateSlotSpan(s.startTime, s.endTime, 10) })
      free += Math.max(0, totalPerFacility - booked)
    })
    return free
  }, [slotsMap])

  const bookingStats = useMemo(() => {
    let pending = 0
    let active  = 0
    Object.values(slotsMap).forEach((slots) => {
      slots.forEach((s) => {
        if (s.status === 'PENDING')    pending += 1
        if (s.status === 'MY_BOOKING') active  += 1
      })
    })
    return { pendingBookings: pending, activeReservations: active }
  }, [slotsMap])

  /* ── Slot click → BookingContext opens drawer or toggles multi-select ── */
  const handleSlotClick = useCallback((slot, facility) => {
    if (multiSelectMode) {
      toggleSlotSelection(slot, facility)
      return
    }
    openBookingDrawer(slot, facility)
  }, [multiSelectMode, openBookingDrawer, toggleSlotSelection])

  /* ── Combined loading / error states ─────────────────────────────────── */
  const isLoading = facilitiesLoading || slotsLoading
  const error     = facilitiesError   || slotsError

  const handleRetry = useCallback(() => {
    loadFacilities()
    refetchSlots()
  }, [loadFacilities, refetchSlots])

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <PageLayout
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      currentUser={currentUser}
      todaySlots={todaySlots}
      pendingBookings={bookingStats.pendingBookings}
      activeReservations={bookingStats.activeReservations}
    >
      <div
        className="calendar-page-content"
        style={{ padding: '1rem 2rem', fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}
      >
        <CalendarFilters
          filters={filters}
          onChange={setFilters}
          multiSelectMode={multiSelectMode}
          onMultiSelectModeChange={setMultiSelectMode}
          selectedSlotsCount={selectedSlots.length}
          onReserveSelected={reserveSelectedSlots}
          onChangeStatusSelected={changeStatusSelectedSlots}
          isAdmin={user?.role === 'admin'}
        />

        <CalendarLegend />

        {/* ── Error state ──────────────────────────────────────────────── */}
        {error && !isLoading && (
          <CalendarError message={error} onRetry={handleRetry} />
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────── */}
        {isLoading && !error && <CalendarLoadingSkeleton />}

        {/* ── Calendar grid (only when data is ready) ──────────────────── */}
        {!isLoading && !error && (
          <section style={{ marginTop: '1rem' }}>
            <h2>Facility Calendar</h2>
            <CalendarGrid
              facilities={facilities}
              slotsMap={slotsMap}
              selectedDate={selectedDate}
              onSlotClick={handleSlotClick}
              onSlotRangeSelect={selectSlotRange}
              filters={filters}
              multiSelectMode={multiSelectMode}
              selectedSlots={selectedSlots}
              selectedFacility={multiSelectFacility}
            />
          </section>
        )}

        {/* Drawers conditionally rendered based on drawerType */}
        {drawerType === 'reservation' && <ReservationDrawer selectedDate={selectedDate} slotsMap={slotsMap} />}
        {drawerType === 'changeStatus' && <ChangeStatusDrawer selectedDate={selectedDate} />}
        {drawerType === 'unavailableDetails' && <UnavailableDetailsDrawer selectedDate={selectedDate} />}
        {drawerType === 'pastDetails' && <PastDetailsDrawer selectedDate={selectedDate} />}
      </div>
    </PageLayout>
  )
}

export default FacilityCalendarPage
