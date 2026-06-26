/**
 * ProfilePage — /profile
 *
 * Displays the current user's identity, booking statistics, and recent activity.
 *
 * DEV:  uses useAuth() dev-admin user + MOCK_BOOKINGS.
 * PROD: uses useAuth() real user + calls bookingApi.fetchMyBookings().
 */

import { useState, useEffect, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import ProfileHeader from '../components/profile/ProfileHeader';
import BookingStats from '../components/profile/BookingStats';
import RecentActivity from '../components/profile/RecentActivity';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import * as bookingApi from '../api/bookingApi';

/* ── DEV mock booking data ───────────────────────────────────────────────── */
const MOCK_BOOKINGS = [
  { id: 1, facilityName: 'Advanced CS Research Laboratory', date: '2026-06-10', startTime: '10:00', endTime: '11:30', status: 'ACTIVE' },
  { id: 2, facilityName: 'Seminar Auditorium 303',           date: '2026-06-12', startTime: '14:00', endTime: '16:00', status: 'PENDING' },
  { id: 3, facilityName: 'Main Conference Grand Hall',        date: '2026-05-28', startTime: '09:00', endTime: '12:00', status: 'CANCELLED' },
  { id: 4, facilityName: 'Physics Laboratory B',             date: '2026-06-15', startTime: '13:00', endTime: '14:00', status: 'ACTIVE' },
  { id: 5, facilityName: 'Study Room 201',                   date: '2026-05-20', startTime: '11:00', endTime: '12:00', status: 'CANCELLED' },
  { id: 6, facilityName: 'Sports Court A',                   date: '2026-06-11', startTime: '16:00', endTime: '17:30', status: 'PENDING' },
];

/* Augment dev user with a token balance for display */
const DEV_USER_DISPLAY = { tokenBalance: 99999 };

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const { showError } = useToast();

  const [bookings, setBookings]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Merge token balance for dev user (not returned by mock auth)
  const user = authUser
    ? { ...DEV_USER_DISPLAY, ...authUser, fullName: authUser.fullName || authUser.name }
    : null;

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      if (import.meta.env.DEV) {
        await new Promise((r) => setTimeout(r, 350));
        setBookings(MOCK_BOOKINGS);
      } else {
        try {
          const data = await bookingApi.fetchMyBookings();
          setBookings(data);
        } catch (err) {
          console.error('Failed to load profile bookings:', err);
          showError('Failed to load booking history.');
        }
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => ({
    total:     bookings.length,
    active:    bookings.filter((b) => b.status === 'ACTIVE').length,
    pending:   bookings.filter((b) => b.status === 'PENDING').length,
    cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
  }), [bookings]);

  // Sort by date descending for recent activity
  const sortedBookings = useMemo(() =>
    [...bookings].sort((a, b) => b.date.localeCompare(a.date)), [bookings]
  );

  return (
    <PageLayout currentUser={user}>
      <div
        style={{
          padding: '1.5rem 2rem',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-primary)',
          height: 'calc(100vh - var(--topbar-height))',
          overflowY: 'auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Page title */}
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Profile
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Your account overview and booking history.
          </p>
        </div>

        {/* Identity card */}
        <ProfileHeader user={user} />

        {/* Stats grid */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
            Booking Summary
          </div>
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: '88px', borderRadius: '10px', background: 'var(--color-facility-header-bg)', opacity: 0.6 }} />
              ))}
            </div>
          ) : (
            <BookingStats stats={stats} />
          )}
        </div>

        {/* Recent activity */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
            Recent Activity
          </div>
          {isLoading ? (
            <div style={{ height: '120px', borderRadius: '10px', background: 'var(--color-facility-header-bg)', opacity: 0.6 }} />
          ) : (
            <RecentActivity bookings={sortedBookings} />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
