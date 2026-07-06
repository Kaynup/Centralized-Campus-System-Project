import React from 'react';
import Drawer from '../common/Drawer';
import { useBooking } from '../../contexts/BookingContext';

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
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function UnavailableDetailsDrawer({ selectedDate }) {
  const {
    isDrawerOpen,
    drawerType,
    closeDrawer,
    selectedSlot,
    selectedFacility,
  } = useBooking();

  if (!isDrawerOpen || drawerType !== 'unavailableDetails' || !selectedSlot) return null;

  return (
    <Drawer isOpen={isDrawerOpen} onClose={closeDrawer} title="Slot Unavailable">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', marginRight: '-1rem' }}>
          
          <SectionTitle>Details</SectionTitle>
          <InfoCard>
            <Row label="Facility" value={selectedFacility?.name || '—'} />
            <Row label="Date" value={formatDate(selectedDate)} />
            <Row label="Time" value={`${selectedSlot.start_time || selectedSlot.startTime} - ${selectedSlot.end_time || selectedSlot.endTime}`} />
            <Row label="Status" value="Unavailable" />
          </InfoCard>

          <SectionTitle>Reason for Unavailability</SectionTitle>
          <div style={{
            padding: '1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            color: 'var(--color-text-primary)',
            fontSize: '0.9rem',
            lineHeight: 1.5
          }}>
            {selectedSlot.unavailability_reason || 'This slot is currently unavailable for booking. Please select another time or facility.'}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
