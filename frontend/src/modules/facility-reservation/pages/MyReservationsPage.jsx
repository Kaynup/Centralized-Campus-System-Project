/**
 * MyReservationsPage — /reservations
 *
 * Lists all bookings for the current user with status-based filtering
 * and an inline cancel confirmation modal.
 *
 * DEV:  renders MOCK_BOOKINGS — no API calls.
 * PROD: calls bookingApi.fetchMyBookings() / bookingApi.cancelBooking().
 */

import { useState, useEffect, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import StatusFilter from '../components/reservations/StatusFilter';
import ReservationsTable from '../components/reservations/ReservationsTable';
import CancelModal from '../components/reservations/CancelModal';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useNotification } from '../../../shared/hooks/useNotification';
import * as bookingApi from '../api/bookingApi';



export default function MyReservationsPage() {
  const { user } = useAuth();
  const { notify } = useNotification();

  const [bookings, setBookings]           = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [activeFilter, setActiveFilter]   = useState('all');
  const [cancelTarget, setCancelTarget]   = useState(null);
  const [isCancelling, setIsCancelling]   = useState(false);

  // Date filter states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [enableDateFilter, setEnableDateFilter] = useState(false);

  const handleToggleDateFilter = () => {
    setEnableDateFilter(prev => !prev);
  };

  /* ── Load bookings ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await bookingApi.fetchMyBookings();
        setBookings(data);
      } catch (err) {
        console.error('Failed to load bookings:', err);
        notify.error('Failed to load reservations.');
      }
      setIsLoading(false);
    };
    load();
  }, []);

  /* ── Counts for filter tabs ──────────────────────────────────────────────── */
  const counts = useMemo(() => {
    // Determine which bookings are visible after date filtering (for accurate status counts)
    const dateFiltered = enableDateFilter ? bookings.filter(b => b.date === selectedDate) : bookings;
    return {
      all:       dateFiltered.length,
      active:    dateFiltered.filter((b) => b.status === 'ACTIVE').length,
      pending:   dateFiltered.filter((b) => b.status === 'PENDING').length,
      cancelled: dateFiltered.filter((b) => b.status === 'CANCELLED').length,
    };
  }, [bookings, enableDateFilter, selectedDate]);

  /* ── Filtered list ───────────────────────────────────────────────────────── */
  const filteredBookings = useMemo(() => {
    let result = bookings;
    if (activeFilter !== 'all') {
      result = result.filter((b) => b.status === activeFilter.toUpperCase());
    }
    if (enableDateFilter) {
      result = result.filter(b => b.date === selectedDate);
    }
    return result;
  }, [bookings, activeFilter, selectedDate, enableDateFilter]);

  /* ── Cancel flow ─────────────────────────────────────────────────────────── */
  const handleCancelConfirm = async (id, reason) => {
    setIsCancelling(true);
    try {
      // Support cancelling single id or array of ids
      const ids = Array.isArray(id) ? id : [id];

      for (const bid of ids) {
        await bookingApi.cancelBooking(bid, reason);
      }
      setBookings((prev) => prev.map((b) => {
        const isMatch = Array.isArray(b.id) ? b.id.some(i => ids.includes(i)) : ids.includes(b.id);
        return isMatch ? { ...b, status: 'CANCELLED' } : b;
      }));
      notify.success('Booking(s) cancelled successfully.');
    } catch (err) {
      console.error('Cancel failed:', err);
      notify.error('Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
      setCancelTarget(null);
    }
  };

  return (
    <PageLayout
      currentUser={user}
      selectedDate={selectedDate}
      onDateChange={(date) => {
        setSelectedDate(date);
        setEnableDateFilter(true);
      }}
      enableDateFilter={enableDateFilter}
      onToggleDateFilter={handleToggleDateFilter}
    >
      {/* Page wrapper — fills main content area */}
      <div
        style={{
          padding: '1.5rem 2rem',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-primary)',
          height: 'calc(100vh - var(--topbar-height))',
          overflowY: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Filter tabs */}
        <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
          <StatusFilter
            activeFilter={activeFilter}
            onChange={setActiveFilter}
            counts={counts}
          />
        </div>

        {/* Table card */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 160px)', // Slightly expanded since header is removed
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <ReservationsTable
            bookings={filteredBookings}
            onCancel={setCancelTarget}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Cancel confirmation modal */}
      <CancelModal
        booking={cancelTarget}
        onConfirm={handleCancelConfirm}
        onClose={() => setCancelTarget(null)}
        isLoading={isCancelling}
      />
    </PageLayout>
  );
}
