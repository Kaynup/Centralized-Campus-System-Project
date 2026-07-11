/**
 * ReservationDrawer.jsx
 * Phase 4 — Full implementation with 3 modes: new | view | cancel
 *
 * Reads all state from BookingContext and AuthContext — no data props needed.
 * Only accepts `selectedDate` from the parent page for date formatting.
 */

import React, { useState, useEffect } from 'react'
import Drawer from '../common/Drawer'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import { useBooking } from '../../contexts/BookingContext'
import { useAuth } from '../../../../shared/hooks/useAuth'
import { useWallet } from '../../../../shared/hooks/useWallet'
import * as bookingApi from '../../api/bookingApi'
import * as adminApi from '../../api/adminApi'
import { getMinSlotsForFacility, getSlotIndex } from '../../utils/bookingHelpers'

/* ─────────────────────────────────────────
   Date / time helpers
───────────────────────────────────────── */

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00') // avoid UTC shift
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function extractTime(timeStr) {
  if (!timeStr) return '00:00'
  if (timeStr.includes('T')) return timeStr.split('T')[1].slice(0, 5)
  return timeStr.slice(0, 5)
}

function parseMins(timeStr) {
  if (!timeStr) return 0
  const time = extractTime(timeStr)
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function calcDurationMins(start, end) {
  return Math.max(0, parseMins(end) - parseMins(start))
}

function formatDuration(mins) {
  if (mins <= 0) return '—'
  if (mins < 60) return `${mins} minutes`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h !== 1 ? 's' : ''}`
}

function formatCreatedAt(raw) {
  if (!raw) return null
  try {
    return new Date(raw).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return raw
  }
}

/* ─────────────────────────────────────────
   Shared UI primitives
───────────────────────────────────────── */

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
  )
}

function InfoCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '8px',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="drawer-row" style={{ padding: '0.6rem 0.85rem' }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: '0.9rem', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function AlertBox({ color, children }) {
  const colors = {
    orange: { bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.30)', text: '#fb923c' },
    red:    { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.30)',  text: 'var(--color-unavailable)' },
    green:  { bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.30)', text: 'var(--color-available)' },
  }
  const c = colors[color] || colors.orange
  return (
    <div style={{
      margin: '0.75rem 0 0',
      padding: '0.7rem 0.9rem',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      color: c.text,
      fontSize: '0.88rem',
      lineHeight: 1.45,
    }}>
      {children}
    </div>
  )
}

function InlineError({ message }) {
  if (!message) return null
  return (
    <div style={{
      marginTop: '0.75rem',
      padding: '0.6rem 0.85rem',
      background: 'rgba(239,68,68,0.12)',
      border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: '7px',
      color: '#ffffff',
      fontSize: '0.95rem',
      fontWeight: 700,
      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)',
    }}>
      {message}
    </div>
  )
}

/* ─────────────────────────────────────────
   Facility header (shared between modes)
───────────────────────────────────────── */

function FacilityHeader({ facility, slot, onClose }) {
  const facilityName = facility?.name || 'Selected Facility'
  const facilityGroup = facility?.group || 'Facility'

  return (
    <div style={{ marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.45rem' }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.25 }}>
          {facilityName}
        </div>
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close drawer">
          ×
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          background: 'rgba(255,255,255,0.07)',
          color: 'var(--color-text-muted)',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          padding: '0.2rem 0.55rem',
          borderRadius: '999px',
          textTransform: 'uppercase',
        }}>
          {facilityGroup}
        </span>
        {slot?.status && <StatusBadge status={slot.status} />}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Success view
───────────────────────────────────────── */

function SuccessView({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem', color: 'var(--color-available)' }}>✓</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-available)', marginBottom: '0.4rem' }}>
        {message}
      </div>
      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Closing in a moment...
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   MODE: new — Book a new slot
───────────────────────────────────────── */

function NewBookingMode({ slot, facility, startTime, endTime, durationMins, depositTokens, userBalance, balanceAfter, insufficientBalance, requiresApproval, selectedDate, isSubmitting, error, isAutoExpanded, onClose, onConfirm }) {
  return (
    <div>
      <FacilityHeader facility={facility} slot={null} onClose={onClose} />

      {isAutoExpanded && (
        <AlertBox color="orange">
          Minimum booking duration applied. We automatically expanded your selection to meet the requirement.
        </AlertBox>
      )}

      {/* Slot details */}
      <SectionTitle>Slot Details</SectionTitle>
      <InfoCard>
        <Row label="Date"     value={formatDate(selectedDate)} />
        <Row label="Time"     value={`${startTime} - ${endTime}`} />
        <Row label="Duration" value={formatDuration(durationMins)} />
      </InfoCard>

      {/* Token deposit */}
      <SectionTitle>Token Deposit</SectionTitle>
      <InfoCard>
        <Row label="Deposit required" value={
          <strong>{depositTokens} token{depositTokens !== 1 ? 's' : ''}</strong>
        } />
        <Row label="Your balance" value={`${userBalance} tokens`} />
        <Row label="Balance after" value={
          <span style={{ color: insufficientBalance ? 'var(--color-unavailable)' : 'var(--color-available)', fontWeight: 700 }}>
            {balanceAfter} tokens
          </span>
        } />
      </InfoCard>
      {insufficientBalance && (
        <AlertBox color="red">Insufficient token balance. You need {depositTokens} token{depositTokens !== 1 ? 's' : ''} but have only {userBalance}.</AlertBox>
      )}

      {/* Cancellation policy */}
      <SectionTitle>Cancellation Policy</SectionTitle>
      <InfoCard>
        <Row label="Cancel &gt;24h before" value="100% refund" />
        <Row label="Cancel 12–24h before" value="50% refund" />
        <Row label="Cancel &lt;12h before" value="No refund" />
      </InfoCard>

      {/* Approval notice */}
      {requiresApproval && (
        <AlertBox color="orange">
          This booking requires approval. You will be notified once an administrator reviews your request.
        </AlertBox>
      )}

      <InlineError message={error} />

      {/* Actions */}
      <div className="drawer-actions" style={{ marginTop: '1.5rem' }}>
        <Button
          variant="primary"
          size="md"
          disabled={isSubmitting || insufficientBalance}
          loading={isSubmitting}
          onClick={() => onConfirm(selectedDate)}
        >
          {requiresApproval ? 'Request Booking' : 'Confirm Booking'}
        </Button>
        <Button variant="ghost" size="md" disabled={isSubmitting} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   MODE: view — View my booking details
───────────────────────────────────────── */

function ViewBookingMode({ slot, facility, startTime, endTime, durationMins, selectedDate, isLoading, error, onInitiateCancel, onClose, isAdmin, onAdminForceCancel }) {
  const now = new Date()
  const slotStart = selectedDate && startTime
    ? new Date(`${selectedDate}T${startTime}:00`)
    : null
  const isFutureSlot = slotStart ? slotStart > now : false

  const isReserved = slot?.status === 'MY_BOOKING' || slot?.status === 'RESERVED'
  const isPending  = slot?.status === 'PENDING'
  const isClosedOut = slot?.status === 'PAST' || slot?.status === 'COMPLETED' || slot?.status === 'UNAVAILABLE'

  const rawBookingId = slot?.bookingId || slot?.booking_id
  const bookingId = Array.isArray(rawBookingId) ? rawBookingId[0] : rawBookingId
  const createdAt  = slot?.createdAt  || slot?.created_at

  return (
    <div>
      <FacilityHeader facility={facility} slot={slot} onClose={onClose} />

      {/* Booking meta */}
      {(bookingId || createdAt) && (
        <>
          <SectionTitle>Booking Info</SectionTitle>
          <InfoCard>
            {bookingId  && <Row label="Booking ID" value={`#${bookingId}`} />}
            {createdAt  && <Row label="Created at"  value={formatCreatedAt(createdAt)} />}
          </InfoCard>
        </>
      )}

      {/* Slot details */}
      <SectionTitle>Slot Details</SectionTitle>
      <InfoCard>
        <Row label="Date"     value={formatDate(selectedDate)} />
        <Row label="Time"     value={`${startTime} - ${endTime}`} />
        <Row label="Duration" value={formatDuration(durationMins)} />
      </InfoCard>

      {/* Status-specific notices */}
      {isPending && (
        <AlertBox color="orange">Your request is awaiting approval from an administrator.</AlertBox>
      )}
      {isClosedOut && (
        <AlertBox color="orange" style={{ marginTop: '0.75rem' }}>This booking is no longer active.</AlertBox>
      )}

      <InlineError message={error} />

      {/* Actions */}
      <div className="drawer-actions" style={{ marginTop: '1.5rem' }}>
        {slot?.status === 'MY_BOOKING' && isFutureSlot && !isClosedOut && (
          <Button variant="danger" size="md" disabled={isLoading} loading={isLoading} onClick={onInitiateCancel}>
            Cancel Booking
          </Button>
        )}
        {isPending && slot?.status === 'MY_BOOKING' && (
          <Button variant="danger" size="md" disabled={isLoading} loading={isLoading} onClick={onInitiateCancel}>
            Withdraw Request
          </Button>
        )}
        {isAdmin && slot?.status === 'RESERVED' && !isClosedOut && (
          <Button variant="danger" size="md" disabled={isLoading} onClick={onAdminForceCancel}>
            Force Cancel (Admin)
          </Button>
        )}
        <Button variant="ghost" size="md" disabled={isLoading} onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   MODE: cancel — Cancellation preview + confirm
───────────────────────────────────────── */

function CancelBookingMode({ cancellationPreview, cancelReason, onReasonChange, isSubmitting, error, onConfirm, onGoBack, onClose }) {
  const preview = cancellationPreview
  const refundAmount = preview?.refundAmount ?? preview?.refund_amount ?? 0
  const penaltyAmount = preview?.penaltyAmount ?? preview?.penalty_amount ?? 0
  const refundPct = preview?.refundPct ?? preview?.refund_pct ?? 0
  const penaltyPct = preview?.penaltyPct ?? preview?.penalty_pct ?? 0
  const hoursUntilStart = preview?.hoursUntilStart ?? preview?.hours_until_start
  
  const hasRefund  = refundAmount > 0
  const hasPenalty = penaltyAmount > 0
  const totalDeposit = refundAmount + penaltyAmount

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Confirm Cancellation
        </div>
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close drawer">
          ×
        </button>
      </div>

      {/* Preview spinner */}
      {!preview ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
          Loading cancellation preview...
        </div>
      ) : (
        <>
          {/* Summary card */}
          <SectionTitle>Refund Summary</SectionTitle>
          <InfoCard>
            <Row label="Deposit paid" value={`${totalDeposit} token${totalDeposit !== 1 ? 's' : ''}`} />
            <Row label="Refund" value={
              <span style={{ color: hasRefund ? 'var(--color-available)' : 'var(--color-text-muted)', fontWeight: 700 }}>
                {refundAmount} tokens ({refundPct}%)
              </span>
            } />
            <Row label="Penalty" value={
              <span style={{ color: hasPenalty ? 'var(--color-unavailable)' : 'var(--color-text-muted)', fontWeight: 700 }}>
                {penaltyAmount} tokens ({penaltyPct}%)
              </span>
            } />
            {hoursUntilStart !== undefined && (
              <div style={{ padding: '0.6rem 0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                You are cancelling {Math.round(hoursUntilStart)}h before the booking starts
              </div>
            )}
          </InfoCard>

          {/* Penalty warning */}
          {hasPenalty && (
            <AlertBox color="red">
              You will forfeit <strong>{penaltyAmount} token{penaltyAmount !== 1 ? 's' : ''}</strong> as a cancellation penalty.
            </AlertBox>
          )}

          {/* Optional reason */}
          <SectionTitle>Reason (optional)</SectionTitle>
          <textarea
            placeholder="Reason for cancellation (optional)"
            value={cancelReason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '8px',
              padding: '0.7rem 0.85rem',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem',
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />

          <InlineError message={error} />

          {/* Actions */}
          <div className="drawer-actions" style={{ marginTop: '1.25rem' }}>
            <Button variant="danger" size="md" disabled={isSubmitting} loading={isSubmitting} onClick={onConfirm}>
              Confirm Cancellation
            </Button>
            <Button variant="ghost" size="md" disabled={isSubmitting} onClick={onGoBack}>
              Go Back
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   MODE: multi — Reserve multiple selected slots
───────────────────────────────────────── */

function MultiBookingMode({ facility, selectedSlots, selectedDate, userBalance, isSubmitting, error, onConfirm, onClose }) {
  const sortedSlots = [...selectedSlots].sort((a, b) => (a.startTime || a.start_time).localeCompare(b.startTime || b.start_time))
  const startTime = sortedSlots[0]?.startTime || sortedSlots[0]?.start_time || ''
  const endTime = sortedSlots[sortedSlots.length - 1]?.endTime || sortedSlots[sortedSlots.length - 1]?.end_time || ''
  const durationMins = sortedSlots.reduce((sum, slot) => {
    const start = slot.startTime || slot.start_time
    const end = slot.endTime || slot.end_time
    return sum + calcDurationMins(start, end)
  }, 0)

  const estimatedCostPerHour = facility
    ? (facility.tokenCostPerHour ?? facility.token_cost_per_hour ?? 1)
    : 1

  const depositTokens = Math.max(1, Math.round(estimatedCostPerHour * (durationMins / 60)))
  const balanceAfter = userBalance - depositTokens
  const insufficientBalance = balanceAfter < 0
  const requiresApproval = !!(facility?.requiresApproval ?? facility?.requires_approval)

  return (
    <div>
      <FacilityHeader facility={facility} slot={null} onClose={onClose} />

      {!facility && (
        <AlertBox color="orange">
          Facility details were not available for the selected slots. The booking drawer is using the selected slot range and estimated cost.
        </AlertBox>
      )}

      <SectionTitle>Selected Slots</SectionTitle>
      <InfoCard>
        <Row label="Slot count" value={`${sortedSlots.length} slot${sortedSlots.length !== 1 ? 's' : ''}`} />
        <Row label="Date" value={formatDate(selectedDate)} />
        <Row label="Time" value={`${extractTime(startTime)} - ${extractTime(endTime)}`} />
        <Row label="Duration" value={formatDuration(durationMins)} />
      </InfoCard>

      <SectionTitle>Token Deposit</SectionTitle>
      <InfoCard>
        <Row label="Deposit required" value={
          <strong>{depositTokens} token{depositTokens !== 1 ? 's' : ''}</strong>
        } />
        <Row label="Your balance" value={`${userBalance} tokens`} />
        <Row label="Balance after" value={
          <span style={{ color: insufficientBalance ? 'var(--color-unavailable)' : 'var(--color-available)', fontWeight: 700 }}>
            {balanceAfter} tokens
          </span>
        } />
      </InfoCard>

      {insufficientBalance && (
        <AlertBox color="red">Insufficient token balance. You need {depositTokens} token{depositTokens !== 1 ? 's' : ''} but have only {userBalance}.</AlertBox>
      )}

      <SectionTitle>Cancellation Policy</SectionTitle>
      <InfoCard>
        <Row label="Cancel >24h before" value="100% refund" />
        <Row label="Cancel 12–24h before" value="50% refund" />
        <Row label="Cancel <12h before" value="No refund" />
      </InfoCard>

      <InlineError message={error} />

      <div className="drawer-actions" style={{ marginTop: '1.5rem' }}>
        <Button
          variant="primary"
          size="md"
          disabled={isSubmitting || insufficientBalance}
          loading={isSubmitting}
          onClick={() => onConfirm(selectedDate)}
        >
          {requiresApproval ? 'Request Booking' : 'Confirm Booking'}
        </Button>
        <Button variant="ghost" size="md" disabled={isSubmitting} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function AdminCancelMode({ cancelReason, onReasonChange, isSubmitting, error, onConfirm, onGoBack, onClose }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Force Cancel Booking
        </div>
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close drawer">
          ×
        </button>
      </div>

      <div style={{
          padding: '1rem',
          background: 'rgba(239, 100, 68, 0.1)',
          border: '1px solid rgba(239, 100, 68, 0.3)',
          borderRadius: '6px',
          color: 'var(--color-text-primary)',
          fontSize: '0.9rem',
          marginBottom: '1rem'
      }}>
        As an admin, you are bypassing the cancellation policy. The user will receive a 100% refund.
      </div>

      <SectionTitle>Reason for Cancellation (Required)</SectionTitle>
      <textarea
        placeholder="Reason for force cancellation"
        value={cancelReason}
        onChange={(e) => onReasonChange(e.target.value)}
        rows={3}
        maxLength={150}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '8px',
          padding: '0.7rem 0.85rem',
          color: 'var(--color-text-primary)',
          fontSize: '0.9rem',
          resize: 'vertical',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />
      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
        {cancelReason.length}/150
      </div>

      <div className="drawer-actions" style={{ marginTop: '1.25rem' }}>
        <Button variant="danger" size="md" disabled={isSubmitting || !cancelReason.trim()} loading={isSubmitting} onClick={onConfirm}>
          Force Cancel
        </Button>
        <Button variant="ghost" size="md" disabled={isSubmitting} onClick={onGoBack}>
          Go Back
        </Button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Root component
───────────────────────────────────────── */

export default function ReservationDrawer({ selectedDate, slotsMap = {} }) {
  const {
    selectedSlot,
    selectedFacility,
    multiSelectFacility,
    selectedSlots,
    isDrawerOpen,
    drawerMode,
    setDrawerMode,
    cancellationPreview,
    isBookingInProgress,
    bookingError,
    closeDrawer,
    initiateCancellation,
    triggerRefresh,
    loadMyBookings,
    confirmMultiSelectBooking,
    getSelectedSlotsStats,
  } = useBooking()

  const { user } = useAuth()
  const { balance } = useWallet()

  // Local UI state
  const [successMsg,  setSuccessMsg]  = useState(null)
  const [localError,  setLocalError]  = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Reset local state whenever drawer opens/closes
  useEffect(() => {
    if (!isDrawerOpen) {
      setSuccessMsg(null)
      setLocalError(null)
      setIsSubmitting(false)
      setCancelReason('')
    }
  }, [isDrawerOpen])

  const slot     = selectedSlot
  const facility = selectedFacility || multiSelectFacility
  const facilitySlots = facility ? (slotsMap?.[facility.id] || []) : []
  const slotMap = {}
  facilitySlots.forEach(s => {
    const idx = getSlotIndex(s.startTime || s.start_time, '07:00', 10)
    slotMap[idx] = s
  })

  // Normalise field names (mock data vs real API may differ)
  let startTime = extractTime(slot?.startTime || slot?.start_time || '')
  let endTime   = extractTime(slot?.endTime   || slot?.end_time   || '')
  let durationMins = calcDurationMins(startTime, endTime)
  let baseEndSlotId = slot?.id
  
  if (drawerMode === 'multi') {
    const sortedSlots = [...selectedSlots].sort((a, b) => (a.startTime || a.start_time).localeCompare(b.startTime || b.start_time))
    startTime = extractTime(sortedSlots[0]?.startTime || sortedSlots[0]?.start_time || '')
    endTime = extractTime(sortedSlots[sortedSlots.length - 1]?.endTime || sortedSlots[sortedSlots.length - 1]?.end_time || '')
    durationMins = calcDurationMins(startTime, endTime)
    baseEndSlotId = sortedSlots[sortedSlots.length - 1]?.id
  }

  let finalEndTime = endTime
  let finalDurationMins = durationMins
  let finalEndSlotId = baseEndSlotId
  let isAutoExpanded = false
  let canBook = true
  let minSlotsReq = 1

  if (facility && (drawerMode === 'new' || drawerMode === 'multi')) {
    minSlotsReq = getMinSlotsForFacility(facility.facilityGroup || facility.facility_group)
    const currentSlotsCount = drawerMode === 'multi' ? selectedSlots.length : 1
    
    if (currentSlotsCount < minSlotsReq) {
      isAutoExpanded = true
      const startIdx = getSlotIndex(startTime, '07:00', 10)
      
      let valid = true
      for (let i = startIdx; i < startIdx + minSlotsReq; i++) {
        const s = slotMap[i]
        if (!s || (s.status !== 'AVAILABLE' && s.status !== 'PENDING')) {
          valid = false
          break
        }
      }

      if (valid) {
        const endSlotObj = slotMap[startIdx + minSlotsReq - 1]
        finalEndTime = extractTime(endSlotObj?.endTime || endSlotObj?.end_time || '')
        finalDurationMins = minSlotsReq * 10
        finalEndSlotId = endSlotObj?.id || endSlotObj?.booking_id || endSlotObj?.bookingId
      } else {
        canBook = false
      }
    }
  }

  // Token deposit calculation
  const depositTokens = facility
    ? Math.max(1, Math.round((facility.tokenCostPerHour ?? facility.token_cost_per_hour ?? 1) * (finalDurationMins / 60)))
    : 1
  const userBalance      = balance ?? 0
  const balanceAfter     = userBalance - depositTokens
  const insufficientBalance = balanceAfter < 0
  const requiresApproval = !!(facility?.requiresApproval ?? facility?.requires_approval)
  const bookingId        = slot?.bookingId ?? slot?.booking_id ?? slot?.id

  const drawerTitle = facility?.name ?? 'Reservation Details'

  /* ── Confirm new booking ── */
  const handleConfirmBooking = async () => {
    setLocalError(null)
    setIsSubmitting(true)
    try {
      await bookingApi.createBooking({
        facility_id: facility.id,
        booking_date: selectedDate,
        start_slot_id: drawerMode === 'multi' ? getSelectedSlotsStats().startSlotId : slot?.id,
        end_slot_id: finalEndSlotId,
      })
      triggerRefresh()
      await loadMyBookings()
      setSuccessMsg(
        requiresApproval
          ? 'Booking request submitted! Awaiting approval.'
          : 'Booking confirmed!'
      )
      setTimeout(() => closeDrawer(), 1800)
    } catch (err) {
      setLocalError(err.response?.data?.message || err.message || 'Booking failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Initiate cancellation (fetch preview → switch mode) ── */
  const handleInitiateCancel = async () => {
    setLocalError(null)
    try {
      await initiateCancellation(bookingId)
    } catch {
      setLocalError('Failed to fetch cancellation details. Please try again.')
    }
  }

  /* ── Confirm cancellation ── */
  const handleConfirmCancellation = async () => {
    setLocalError(null)
    setIsSubmitting(true)
    try {
      await bookingApi.cancelBooking(bookingId, cancelReason || undefined)
      triggerRefresh()
      await loadMyBookings()
      const refundAmt = cancellationPreview?.refund_amount ?? 0
      setSuccessMsg(
        refundAmt > 0
          ? `Booking cancelled. ${refundAmt} token${refundAmt !== 1 ? 's' : ''} refunded.`
          : 'Booking cancelled.'
      )
      setTimeout(() => closeDrawer(), 1800)
    } catch (err) {
      setLocalError(err.response?.data?.message || err.message || 'Cancellation failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Confirm Admin Force Cancellation ── */
  const handleAdminForceCancel = async () => {
    setLocalError(null)
    setIsSubmitting(true)
    console.log("DEBUG Admin Force Cancel using bookingId:", bookingId, "from slot:", slot)
    try {
      await adminApi.forceCancelBooking(bookingId, { reason: cancelReason })
      triggerRefresh()
      await loadMyBookings()
      setSuccessMsg('Booking force-cancelled successfully. 100% refunded.')
      setTimeout(() => closeDrawer(), 1800)
    } catch (err) {
      setLocalError(err.response?.data?.message || err.message || 'Force cancellation failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isDrawerOpen} onClose={closeDrawer} title={drawerTitle} hideHeader>

      {/* Multi-slot drawer can render even when a single selectedSlot is not present */}
      {drawerMode === 'multi' && (!selectedSlots || selectedSlots.length === 0) ? (
        <div style={{ color: 'var(--color-text-muted)', padding: '1rem 0', fontSize: '0.9rem' }}>
          Select slots on the calendar to view booking details.
        </div>
      ) : drawerMode === 'new' && (!slot || !facility) ? (
        <div style={{ color: 'var(--color-text-muted)', padding: '1rem 0', fontSize: '0.9rem' }}>
          Select a slot on the calendar to view booking details.
        </div>
      ) : successMsg ? (
        <SuccessView message={successMsg} />
      ) : drawerMode === 'multi' ? (
        <NewBookingMode
          slot={slot}
          facility={facility}
          startTime={startTime}
          endTime={finalEndTime}
          durationMins={finalDurationMins}
          depositTokens={depositTokens}
          userBalance={userBalance}
          balanceAfter={balanceAfter}
          insufficientBalance={insufficientBalance}
          requiresApproval={requiresApproval}
          selectedDate={selectedDate}
          isSubmitting={isSubmitting}
          isAutoExpanded={isAutoExpanded}
          error={localError || bookingError || (!canBook ? `Minimum duration is ${minSlotsReq * 10} minutes, but upcoming slots are unavailable.` : null)}
          onConfirm={handleConfirmBooking}
          onClose={closeDrawer}
        />
      ) : drawerMode === 'new' ? (
        <NewBookingMode
          slot={slot}
          facility={facility}
          startTime={startTime}
          endTime={finalEndTime}
          durationMins={finalDurationMins}
          depositTokens={depositTokens}
          userBalance={userBalance}
          balanceAfter={balanceAfter}
          insufficientBalance={insufficientBalance}
          requiresApproval={requiresApproval}
          selectedDate={selectedDate}
          isSubmitting={isSubmitting}
          isAutoExpanded={isAutoExpanded}
          error={localError || bookingError || (!canBook ? `Minimum duration is ${minSlotsReq * 10} minutes, but upcoming slots are unavailable.` : null)}
          onConfirm={handleConfirmBooking}
          onClose={closeDrawer}
        />
      ) : drawerMode === 'view' ? (
        <ViewBookingMode
          slot={slot}
          facility={facility}
          startTime={startTime}
          endTime={endTime}
          durationMins={durationMins}
          selectedDate={selectedDate}
          isLoading={isBookingInProgress || isSubmitting}
          error={localError || bookingError}
          onInitiateCancel={handleInitiateCancel}
          onClose={closeDrawer}
          isAdmin={user?.role === 'admin'}
          onAdminForceCancel={() => setDrawerMode('admin_cancel')}
        />
      ) : drawerMode === 'cancel' ? (
        <CancelBookingMode
          cancellationPreview={cancellationPreview}
          cancelReason={cancelReason}
          onReasonChange={setCancelReason}
          isSubmitting={isSubmitting || isBookingInProgress}
          error={localError || bookingError}
          onConfirm={handleConfirmCancellation}
          onGoBack={() => setDrawerMode('view')}
          onClose={closeDrawer}
        />
      ) : drawerMode === 'admin_cancel' ? (
        <AdminCancelMode
          cancelReason={cancelReason}
          onReasonChange={setCancelReason}
          isSubmitting={isSubmitting}
          error={localError}
          onConfirm={handleAdminForceCancel}
          onGoBack={() => setDrawerMode('view')}
          onClose={closeDrawer}
        />
      ) : null}

    </Drawer>
  )
}
