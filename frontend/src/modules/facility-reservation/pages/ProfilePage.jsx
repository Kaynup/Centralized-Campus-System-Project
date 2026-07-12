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
import { useAuth } from '../../../shared/hooks/useAuth';
import { useNotification } from '../../../shared/hooks/useNotification';
import * as bookingApi from '../api/bookingApi';
import { useWallet } from '../../../shared/hooks/useWallet';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const { balance } = useWallet();
  const { notify } = useNotification();

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const user = authUser
    ? { ...authUser, fullName: authUser.fullName || authUser.name, tokenBalance: balance }
    : null;

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await bookingApi.fetchMyBookings();
        setBookings(data);
      } catch (err) {
        console.error('Failed to load profile bookings:', err);
        notify.error('Failed to load booking history.');
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => ({
    total: bookings.length,
    active: bookings.filter((b) => b.status === 'ACTIVE').length,
    pending: bookings.filter((b) => b.status === 'PENDING').length,
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
