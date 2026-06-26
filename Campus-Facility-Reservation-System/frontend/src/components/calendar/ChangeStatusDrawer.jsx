import React, { useState } from 'react';
import Drawer from '../common/Drawer';
import Button from '../common/Button';
import { useBooking } from '../../contexts/BookingContext';
import { useAuth } from '../../contexts/AuthContext';
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
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function ChangeStatusDrawer({ selectedDate }) {
  const {
    isDrawerOpen,
    drawerType,
    closeDrawer,
    selectedSlot,
    selectedFacility,
    selectedSlots,
    drawerMode,
    triggerRefresh,
    setMultiSelectMode,
    multiSelectFacility
  } = useBooking();
  
  const { showError, showSuccess } = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if single or multi
  const isMulti = drawerMode === 'multi';
  const slotsToManage = isMulti ? selectedSlots : (selectedSlot ? [selectedSlot] : []);
  const facility = isMulti ? multiSelectFacility : selectedFacility;
  
  if (!isDrawerOpen || drawerType !== 'changeStatus' || slotsToManage.length === 0) return null;

  const currentAvailable = slotsToManage[0].is_available ?? (slotsToManage[0].status === 'AVAILABLE');
  // If mixed, we will just force to either based on toggles
  
  const handleToggle = async (makeAvailable) => {
    if (!makeAvailable && !reason.trim()) {
      showError('You must provide a reason when making slots unavailable.');
      return;
    }
    
    if (!makeAvailable && reason.length > 150) {
      showError('Reason cannot exceed 150 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.toggleSlotAvailability({
        facility_id: facility.id,
        booking_date: selectedDate,
        slot_ids: slotsToManage.map(s => s.id),
        is_available: makeAvailable,
        reason: makeAvailable ? '' : reason
      });
      showSuccess(`Successfully marked ${slotsToManage.length} slot(s) as ${makeAvailable ? 'available' : 'unavailable'}.`);
      setReason('');
      triggerRefresh();
      closeDrawer();
      setMultiSelectMode(false);
      
      // Force a full page reload to clear out any stale UI state completely, as requested.
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to toggle slots');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer isOpen={isDrawerOpen} onClose={closeDrawer} title="Manage Slot Status">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', marginRight: '-1rem' }}>
          
          <SectionTitle>Selection Details</SectionTitle>
          <InfoCard>
            <Row label="Facility" value={facility?.name || '—'} />
            <Row label="Date" value={formatDate(selectedDate)} />
            <Row label="Slots Selected" value={slotsToManage.length} />
            {slotsToManage.length === 1 && (
               <Row label="Time" value={`${slotsToManage[0].start_time || slotsToManage[0].startTime} - ${slotsToManage[0].end_time || slotsToManage[0].endTime}`} />
            )}
            <Row label="Current Status" value={currentAvailable ? 'Available' : 'Unavailable'} />
          </InfoCard>

          {!currentAvailable && (
             <>
               <SectionTitle>Current Unavailability Reason</SectionTitle>
               <div style={{
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.85rem'
               }}>
                 {slotsToManage[0].unavailability_reason || 'No reason provided.'}
               </div>
             </>
          )}

          <SectionTitle>{currentAvailable ? 'Make Unavailable' : 'Update Reason'}</SectionTitle>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              marginBottom: '0.5rem'
            }}>
              Reason for Unavailability (Required, max 150 chars)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Maintenance, Facility closed, Special event..."
              disabled={isSubmitting}
              maxLength={150}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.9rem',
                minHeight: '80px',
                resize: 'vertical',
                outline: 'none'
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {reason.length}/150
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <Button variant="secondary" onClick={closeDrawer} disabled={isSubmitting}>
            Cancel
          </Button>

          {currentAvailable ? (
            <Button variant="primary" onClick={() => handleToggle(false)} disabled={isSubmitting || !reason.trim()}>
              {isSubmitting ? 'Updating...' : 'Make Unavailable'}
            </Button>
          ) : (
            <>
              <Button variant="primary" onClick={() => handleToggle(false)} disabled={isSubmitting || !reason.trim()}>
                Update Reason
              </Button>
              <Button variant="secondary" onClick={() => handleToggle(true)} disabled={isSubmitting} style={{ border: '1px solid var(--color-reserved)', color: 'var(--color-reserved)' }}>
                {isSubmitting ? 'Updating...' : 'Make Available'}
              </Button>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
