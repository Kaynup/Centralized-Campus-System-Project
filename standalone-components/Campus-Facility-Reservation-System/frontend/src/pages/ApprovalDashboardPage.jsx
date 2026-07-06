/**
 * ApprovalDashboardPage — Admin / Professor Only
 *
 * Route: /admin/approvals
 *
 * - Redirects students to /calendar
 * - DEV: renders mock pending approval data (no backend required)
 * - PROD: fetches from GET /api/v1/approvals/pending
 * - Approve: POST /api/v1/bookings/{id}/approve
 * - Reject : POST /api/v1/bookings/{id}/reject  (requires a reason)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import { useAuth } from '../contexts/AuthContext'
import * as approvalApi from '../api/approvalApi'
import { getLocalDateString } from '../utils/dateHelpers'

/* ── DEV mock data ─────────────────────────────────────────────────────────── */
const MOCK_APPROVALS = [
  {
    id: 1,
    bookingId: 101,
    requesterName: 'Punyak',
    requesterEmail: 'punyak@xyz.edu',
    facilityName: 'Advanced CS Research Laboratory (Cybersecurity & Systems)',
    facilityGroup: 'Labs',
    date: '2026-06-11',
    startTime: '10:00',
    endTime: '11:30',
    requestedAt: '2026-06-09T08:15:00Z',
  },
  {
    id: 2,
    bookingId: 102,
    requesterName: 'Anjali Mehta',
    requesterEmail: 'anjali@campus.edu',
    facilityName: 'Advanced Seminar Auditorium 303',
    facilityGroup: 'Classrooms',
    date: '2026-06-12',
    startTime: '14:00',
    endTime: '16:00',
    requestedAt: '2026-06-09T09:45:00Z',
  },
  {
    id: 3,
    bookingId: 103,
    requesterName: 'Rohan Das',
    requesterEmail: 'rohan@campus.edu',
    facilityName: 'Main Conference Grand Exhibition Hall',
    facilityGroup: 'Halls',
    date: '2026-06-13',
    startTime: '09:00',
    endTime: '12:00',
    requestedAt: '2026-06-09T11:00:00Z',
  },
  {
    id: 4,
    bookingId: 104,
    requesterName: 'Priya Nair',
    requesterEmail: 'priya@campus.edu',
    facilityName: 'Molecular Biology & Genetics Core Laboratory',
    facilityGroup: 'Labs',
    date: '2026-06-14',
    startTime: '13:00',
    endTime: '15:00',
    requestedAt: '2026-06-09T10:30:00Z',
  },
  {
    id: 5,
    bookingId: 105,
    requesterName: 'Vikram Bose',
    requesterEmail: 'vikram@campus.edu',
    facilityName: 'Student Multi-purpose Activity & Recreation Hall',
    facilityGroup: 'Halls',
    date: '2026-06-15',
    startTime: '18:00',
    endTime: '21:00',
    requestedAt: '2026-06-09T07:50:00Z',
  },
]

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function calcDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRequestedAt(isoStr) {
  const d = new Date(isoStr)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* ── Group badge colors ─────────────────────────────────────────────────────── */
const GROUP_COLORS = {
  Labs: { bg: 'rgba(101,49,150,0.25)', color: '#b48be8' },
  Classrooms: { bg: 'rgba(25,63,125,0.25)', color: '#7aafff' },
  Halls: { bg: 'rgba(156,86,36,0.25)', color: '#f4a861' },
  Courts: { bg: 'rgba(19,103,50,0.25)', color: '#6bcf8f' },
}

/* ── Reject Modal ───────────────────────────────────────────────────────────── */
function RejectModal({ approval, onConfirm, onCancel, isSubmitting }) {
  const [reason, setReason] = useState('')

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 'var(--z-modal-overlay)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          width: '100%',
          maxWidth: '440px',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>
          Reject Booking Request
        </h3>
        <p style={{ margin: '0 0 1.25rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {approval.requesterName} — {approval.facilityName}
        </p>

        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Reason for rejection
        </label>
        <textarea
          autoFocus
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Provide a reason so the requester understands..."
          rows={4}
          style={{
            width: '100%',
            background: 'var(--color-grid-bg)',
            border: `1px solid ${reason.trim() ? 'var(--color-border)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            fontSize: '0.875rem',
            padding: '0.75rem',
            resize: 'vertical',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Go Back
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={isSubmitting || !reason.trim()}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: reason.trim() && !isSubmitting ? 'var(--color-unavailable)' : '#555',
              color: '#fff',
              cursor: reason.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'background var(--transition-fast)',
            }}
          >
            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

/* ── Row ────────────────────────────────────────────────────────────────────── */
function ApprovalRow({ approval, onApprove, onReject, fadingOut }) {
  const badge = GROUP_COLORS[approval.facilityGroup] || GROUP_COLORS.Labs

  return (
    <tr
      style={{
        borderBottom: '1px solid var(--color-border)',
        opacity: fadingOut ? 0 : 1,
        transform: fadingOut ? 'translateX(20px)' : 'none',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      {/* Requester */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
          {approval.requesterName}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {approval.requesterEmail}
        </div>
      </td>

      {/* Facility */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <div style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem', marginBottom: '4px', maxWidth: '260px' }}>
          {approval.facilityName}
        </div>
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '0.7rem',
          fontWeight: 700,
          background: badge.bg,
          color: badge.color,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {approval.facilityGroup}
        </span>
      </td>

      {/* Date & Time */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
        <div style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>
          {formatDate(approval.date)}
        </div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
          {approval.startTime} – {approval.endTime}
        </div>
      </td>

      {/* Duration */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle', color: 'var(--color-text-muted)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
        {calcDuration(approval.startTime, approval.endTime)}
      </td>

      {/* Requested At */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle', color: 'var(--color-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
        {formatRequestedAt(approval.requestedAt)}
      </td>

      {/* Actions */}
      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id={`approve-btn-${approval.id}`}
            onClick={() => onApprove(approval)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--color-available)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'opacity var(--transition-fast)',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => e.target.style.opacity = '0.85'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            Approve
          </button>
          <button
            id={`reject-btn-${approval.id}`}
            onClick={() => onReject(approval)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-unavailable)',
              background: 'rgba(124,34,34,0.15)',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'background var(--transition-fast)',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(124,34,34,0.3)'}
            onMouseLeave={e => e.target.style.background = 'rgba(124,34,34,0.15)'}
          >
            Reject
          </button>
        </div>
      </td>
    </tr>
  )
}

/* ── Empty State ────────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--color-text-muted)' }}>
      <div style={{
        width: '72px', height: '72px',
        borderRadius: '50%',
        background: 'rgba(19,103,50,0.15)',
        border: '2px solid var(--color-available)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1.5rem',
      }}>
        <svg viewBox="0 0 24 24" width="32" height="32" stroke="#136732" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-primary)', fontWeight: 700 }}>All clear</h3>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>No pending approval requests at this time.</p>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
function ApprovalDashboardPage() {
  const { user } = useAuth()

  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [showAll, setShowAll] = useState(true)
  const [enableDateFilter, setEnableDateFilter] = useState(false)
  const [approvals, setApprovals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fadingIds, setFadingIds] = useState(new Set())
  const [rejectTarget, setRejectTarget] = useState(null)   // approval being rejected
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)

  const handleToggleDateFilter = () => {
    setEnableDateFilter(prev => {
      const next = !prev
      if (next) {
        setShowAll(false)
      }
      return next
    })
  }

  const handleToggleShowAll = () => {
    setShowAll(prev => {
      const next = !prev
      if (next) {
        setEnableDateFilter(false)
      }
      return next
    })
  }

  // Filter approvals by selected date (unless showAll is active or date filter is disabled)
  const filteredApprovals = useMemo(() => {
    if (showAll || !enableDateFilter) return approvals
    return approvals.filter(a => a.date === selectedDate)
  }, [approvals, selectedDate, showAll, enableDateFilter])

  /* ── Role guard ─────────────────────────────────────────────────────────── */
  if (user && user.role !== 'admin') {
    return <Navigate to="/calendar" replace />
  }

  /* ── Load approvals ─────────────────────────────────────────────────────── */
  const loadApprovals = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    /* DEV PATH */
    if (import.meta.env.DEV) {
      await new Promise(r => setTimeout(r, 400)) // simulate network
      setApprovals(MOCK_APPROVALS)
      setIsLoading(false)
      return
    }

    /* PROD PATH */
    try {
      const data = await approvalApi.fetchPendingApprovals()
      setApprovals(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load approvals')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadApprovals() }, [loadApprovals])

  /* ── Animate row out then remove ────────────────────────────────────────── */
  const removeRow = (id) => {
    const rowKey = Array.isArray(id) ? id.join(',') : id
    setFadingIds(prev => new Set([...prev, rowKey]))
    setTimeout(() => {
      setApprovals(prev => prev.filter(a => a.id !== id))
      setFadingIds(prev => { const s = new Set(prev); s.delete(rowKey); return s })
    }, 380)
  }

  /* ── Approve ────────────────────────────────────────────────────────────── */
  const handleApprove = async (approval) => {
    setActionError(null)

    if (import.meta.env.DEV) {
      removeRow(approval.id)
      return
    }

    try {
      const bIds = Array.isArray(approval.bookingId) ? approval.bookingId : [approval.bookingId]
      for (const bid of bIds) {
        await approvalApi.approveBooking(bid)
      }
      removeRow(approval.id)
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Approval failed')
    }
  }

  /* ── Reject ─────────────────────────────────────────────────────────────── */
  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return
    setIsSubmitting(true)
    setActionError(null)

    if (import.meta.env.DEV) {
      await new Promise(r => setTimeout(r, 500))
      removeRow(rejectTarget.id)
      setRejectTarget(null)
      setIsSubmitting(false)
      return
    }

    try {
      const bIds = Array.isArray(rejectTarget.bookingId) ? rejectTarget.bookingId : [rejectTarget.bookingId]
      for (const bid of bIds) {
        await approvalApi.rejectBooking(bid, reason)
      }
      removeRow(rejectTarget.id)
      setRejectTarget(null)
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Rejection failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <PageLayout
      selectedDate={selectedDate}
      onDateChange={(date) => {
        setSelectedDate(date)
        setEnableDateFilter(true)
        setShowAll(false)
      }}
      enableDateFilter={enableDateFilter}
      onToggleDateFilter={handleToggleDateFilter}
      currentUser={user ? {
        ...user,
        name: user.fullName || user.full_name || user.name || user.email || 'Admin',
        tokenBalance: user.token_balance ?? user.tokenBalance ?? 0,
      } : null}
    >
      <div style={{
        padding: '1.5rem 2rem',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-primary)',
        height: 'calc(100vh - var(--topbar-height))',
        overflowY: 'hidden',
        boxSizing: 'border-box',
      }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Pending Approval Requests
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Review and action booking requests for restricted facilities
            </p>
          </div>

          {/* Header controls: Show All toggle & Pending count badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleToggleShowAll}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                background: showAll ? 'var(--color-my-booking)' : 'transparent',
                border: '1px solid var(--color-border)',
                color: showAll ? '#fff' : 'var(--color-text-muted)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => { if (!showAll) e.target.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!showAll) e.target.style.background = 'transparent' }}
            >
              {showAll ? 'Showing All' : 'Show All'}
            </button>

            {!isLoading && approvals.length > 0 && (
              <div style={{
                padding: '6px 16px',
                borderRadius: '999px',
                background: 'rgba(156,86,36,0.2)',
                border: '1px solid var(--color-pending)',
                color: '#f4a861',
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}>
                {approvals.length} pending
              </div>
            )}
          </div>
        </div>

        {/* ── Action error ─────────────────────────────────────────────────── */}
        {actionError && (
          <div style={{
            marginBottom: '1rem',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>×</button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                height: '68px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-facility-header-bg)',
                animation: `skeletonPulse 1.4s ease-in-out ${i * 0.12}s infinite`,
              }} />
            ))}
            <style>{`@keyframes skeletonPulse { 0%,100%{opacity:.35} 50%{opacity:.75} }`}</style>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && !isLoading && (
          <div style={{
            marginTop: '1rem',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            textAlign: 'center',
          }}>
            <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>
            <button
              onClick={loadApprovals}
              style={{
                padding: '8px 20px', borderRadius: 'var(--radius-md)', border: 'none',
                background: 'var(--color-available)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!isLoading && !error && filteredApprovals.length === 0 && <EmptyState />}

        {/* ── Table ────────────────────────────────────────────────────────── */}
        {!isLoading && !error && filteredApprovals.length > 0 && (
          <div style={{
            background: 'var(--color-surface-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflowX: 'auto',
            overflowY: 'auto',
            /* ADJUST TABLE HEIGHT HERE: Change maxHeight or height to set the table scroll height (e.g. maxHeight: '400px') */
            maxHeight: 'calc(100vh - 220px)',
            boxShadow: 'var(--shadow-card)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-header)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Requester', 'Facility', 'Date & Time', 'Duration', 'Requested At', 'Actions'].map(col => (
                    <th key={col} style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map(approval => {
                  const rowKey = Array.isArray(approval.id) ? approval.id.join(',') : approval.id;
                  return (
                    <ApprovalRow
                      key={rowKey}
                      approval={approval}
                      onApprove={handleApprove}
                      onReject={a => setRejectTarget(a)}
                      fadingOut={fadingIds.has(rowKey)}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Reject Modal (portal-like overlay inside page) ─────────────────── */}
      {rejectTarget && (
        <RejectModal
          approval={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => { if (!isSubmitting) setRejectTarget(null) }}
          isSubmitting={isSubmitting}
        />
      )}
    </PageLayout>
  )
}

export default ApprovalDashboardPage
