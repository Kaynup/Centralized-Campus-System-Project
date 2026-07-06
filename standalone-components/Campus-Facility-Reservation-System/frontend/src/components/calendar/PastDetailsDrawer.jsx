import React, { useState, useEffect } from 'react';
import Drawer from '../common/Drawer';
import { useBooking } from '../../contexts/BookingContext';
import { useToast } from '../../contexts/ToastContext';
import * as adminApi from '../../api/adminApi';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.09em',
      textTransform: 'uppercase',
      color: 'var(--color-text-muted)',
      marginBottom: '0.35rem',
      marginTop: '1.25rem',
    }}>
      {children}
    </div>
  );
}

function InfoCard({ children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.75rem 1rem',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      fontSize: '0.85rem'
    }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function PastDetailsDrawer({ selectedDate }) {
  const {
    isDrawerOpen,
    drawerType,
    closeDrawer,
    selectedSlot,
    selectedFacility,
  } = useBooking();

  const { showError } = useToast();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDrawerOpen && drawerType === 'pastDetails' && selectedSlot) {
      setLoading(true);
      adminApi.getSlotHistory(selectedFacility.id, selectedDate, selectedSlot.id)
        .then(data => setHistory(data))
        .catch(err => {
           showError('Failed to load slot history');
        })
        .finally(() => setLoading(false));
    } else {
      setHistory(null);
    }
  }, [isDrawerOpen, drawerType, selectedSlot, showError]);

  if (!isDrawerOpen || drawerType !== 'pastDetails' || !selectedSlot) return null;

  return (
    <Drawer isOpen={isDrawerOpen} onClose={closeDrawer} title="Past Slot Details">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', marginRight: '-1rem' }}>
          
          <SectionTitle>Slot Info</SectionTitle>
          <InfoCard>
            <Row label="Facility" value={selectedFacility?.name || '—'} />
            <Row label="Date" value={formatDate(selectedDate)} />
            <Row label="Time" value={`${selectedSlot.start_time || selectedSlot.startTime} - ${selectedSlot.end_time || selectedSlot.endTime}`} />
            <Row label="Was Available?" value={history?.is_available ? 'Yes' : 'No'} />
          </InfoCard>

          {history && !history.is_available && history.unavailabilityReason && (
            <>
               <SectionTitle>Unavailability Reason</SectionTitle>
               <div style={{
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.85rem'
               }}>
                 {history.unavailabilityReason}
               </div>
            </>
          )}

          <SectionTitle>Booking History</SectionTitle>
          {loading ? (
             <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
          ) : history?.bookings?.length > 0 ? (
            history.bookings.map((b, idx) => (
              <InfoCard key={idx} style={{ marginBottom: '1rem' }}>
                <Row label="User" value={`${b.userName} (${b.userEmail})`} />
                <Row label="Status" value={b.status} />
                <Row label="Deposit Paid" value={b.depositPaid} />
                {b.cancellationReason && (
                   <Row label="Cancellation Reason" value={b.cancellationReason} />
                )}
              </InfoCard>
            ))
          ) : (
             <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px' }}>
               No bookings recorded for this slot.
             </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
