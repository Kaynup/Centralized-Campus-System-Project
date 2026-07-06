/**
 * CancelModal — inline confirmation dialog for booking cancellation
 *
 * Props:
 *   booking     : object|null — the booking being cancelled (null = closed)
 *   onConfirm   : fn(id, reason) — called when user confirms
 *   onClose     : fn — called when user dismisses
 *   isLoading   : bool
 */

import { useState } from 'react';

export default function CancelModal({ booking, onConfirm, onClose, isLoading }) {
  const [reason, setReason] = useState('');

  if (!booking) return null;

  const handleConfirm = () => {
    // Support grouped bookings: booking.ids may be an array of booking ids
    const idArg = booking.ids && Array.isArray(booking.ids) ? booking.ids : booking.id;
    onConfirm(idArg, reason.trim() || 'Cancelled by user');
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 40,
        }}
      />

      {/* Modal card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          width: 'min(440px, 92vw)',
          background: 'var(--color-sidebar-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2
              id="cancel-modal-title"
              style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}
            >
              Cancel Reservation
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
              This action cannot be undone.
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '1.3rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Booking summary */}
        <div
          style={{
            background: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
            {booking.facilityName}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            {booking.date} &nbsp;·&nbsp; {booking.startTime} – {booking.endTime}
          </div>
        </div>

        {/* Reason */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            htmlFor="cancel-reason"
            style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Reason (optional)
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Schedule conflict"
            rows={3}
            style={{
              resize: 'vertical',
              background: 'var(--color-grid-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              padding: '10px 12px',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-sans)',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            id="cancel-modal-dismiss"
            onClick={handleClose}
            disabled={isLoading}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Keep Booking
          </button>
          <button
            id="cancel-modal-confirm"
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.4)',
              background: isLoading ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.15)',
              color: '#f87171',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            {isLoading ? 'Cancelling...' : 'Confirm Cancel'}
          </button>
        </div>
      </div>
    </>
  );
}
