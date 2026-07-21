/**
 * SystemLogsPage — Admin Only
 *
 * Route: /admin/logs
 *
 * - Only accessible to users with admin/professor role. Students redirected to /calendar.
 * - Displays a paginated audit log of system events.
 * - Supports filtering by Log Level (INFO, DEBUG, WARNING, ERROR).
 * - PAGINATION: 20 logs per page.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import PageLayout from '../components/layout/PageLayout'
import { useAuth } from '../../../shared/hooks/useAuth'
import * as logsApi from '../api/logsApi'
import { getLocalDateString } from '../utils/dateHelpers'

/* ── Log level colors & badges ─────────────────────────────────────────────── */
const LEVEL_COLORS = {
  INFO: { bg: 'rgba(19,103,50,0.15)', color: '#6bcf8f', border: '1px solid rgba(19,103,50,0.3)' },
  DEBUG: { bg: 'rgba(107,109,111,0.15)', color: '#94a3b8', border: '1px solid rgba(107,109,111,0.3)' },
  WARNING: { bg: 'rgba(156,86,36,0.15)', color: '#f4a861', border: '1px solid rgba(156,86,36,0.3)' },
  ERROR: { bg: 'rgba(124,34,34,0.15)', color: '#f87171', border: '1px solid rgba(124,34,34,0.3)' }
}

function LevelBadge({ level }) {
  const style = LEVEL_COLORS[level] || LEVEL_COLORS.INFO
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '0.7rem',
      fontWeight: 700,
      background: style.bg,
      color: style.color,
      border: style.border,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {level}
    </span>
  )
}

/* ── Log Table Row ──────────────────────────────────────────────────────────── */
function LogRow({ log }) {
  const formattedTime = new Date(log.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      {/* Level */}
      <td style={{ padding: '8px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
        <LevelBadge level={log.level} />
      </td>

      {/* Action */}
      <td style={{ padding: '8px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--color-text-primary)',
          background: 'rgba(45, 45, 78, 0.4)',
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)'
        }}>
          {log.action}
        </span>
      </td>

      {/* User */}
      <td style={{ padding: '8px 16px', verticalAlign: 'middle' }}>
        <div style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>
          {log.userEmail || 'System'}
        </div>
        {log.userId && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            ID: {log.userId}
          </div>
        )}
      </td>

      {/* Message */}
      <td style={{ padding: '8px 16px', verticalAlign: 'middle', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
        {log.message}
      </td>

      {/* Timestamp */}
      <td style={{ padding: '8px 16px', verticalAlign: 'middle', color: 'var(--color-text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
        {formattedTime}
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
        background: 'rgba(107, 109, 111, 0.15)',
        border: '2px solid var(--color-past)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1.5rem',
      }}>
        <svg viewBox="0 0 24 24" width="32" height="32" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </div>
      <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-primary)', fontWeight: 700 }}>No Logs</h3>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>No system logs matched the selected filter criteria.</p>
    </div>
  )
}

/* ── System Logs Page ───────────────────────────────────────────────────────── */
function SystemLogsPage() {
  const { user } = useAuth()

  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [showAll, setShowAll] = useState(true)
  const [enableDateFilter, setEnableDateFilter] = useState(false)
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLevel, setSelectedLevel] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const limit = 20

  const handleToggleDateFilter = () => {
    setEnableDateFilter(prev => {
      const next = !prev
      if (next) {
        setShowAll(false)
      }
      return next
    })
  }

  /* ── Role guard ─────────────────────────────────────────────────────────── */
  const isSuperAdmin = user?.accountType === "admin" && user?.role === "super_admin";
  const isFacilityAdmin = isSuperAdmin || user?.role === "facility_admin";

  if (user && !isFacilityAdmin) {
    return <Navigate to="/calendar" replace />
  }

  /* ── Load logs ──────────────────────────────────────────────────────────── */
  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await logsApi.fetchSystemLogs({
        level: showAll ? '' : selectedLevel,
        page: currentPage,
        limit,
        date: (showAll || !enableDateFilter) ? '' : selectedDate
      })
      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setTotalPages(data.pages || 1)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load system logs')
    } finally {
      setIsLoading(false)
    }
  }, [selectedLevel, currentPage, selectedDate, showAll, enableDateFilter])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handleLevelChange = (e) => {
    setSelectedLevel(e.target.value)
    setShowAll(false)
    setCurrentPage(1) // Reset to first page
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

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
        boxSizing: 'border-box'
      }}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              System Audit Logs
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              View and filter system operations and security audit events
            </p>
          </div>

          {/* Filter options: Show All & Level Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                setShowAll(prev => {
                  const next = !prev
                  if (next) {
                    setEnableDateFilter(false)
                    setSelectedLevel('')
                  }
                  return next
                })
              }}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="level-filter" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Level:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <select
                  id="level-filter"
                  value={showAll ? '' : selectedLevel}
                  onChange={handleLevelChange}
                  disabled={showAll}
                  title={showAll ? "First turn off 'Show All' to filter by level" : ""}
                  style={{
                    background: showAll ? 'rgba(255,255,255,0.02)' : 'var(--color-facility-header-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: showAll ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    padding: '6px 12px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    cursor: showAll ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">All Levels</option>
                  <option value="INFO">INFO</option>
                  <option value="DEBUG">DEBUG</option>
                  <option value="WARNING">WARNING</option>
                  <option value="ERROR">ERROR</option>
                </select>
                {showAll && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-pending)', position: 'absolute', top: '100%', right: 0, whiteSpace: 'nowrap', marginTop: '2px' }}>
                    Turn off "Show All" to filter
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

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
              onClick={loadLogs}
              style={{
                padding: '8px 20px', borderRadius: 'var(--radius-md)', border: 'none',
                background: 'var(--color-available)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Empty State ──────────────────────────────────────────────────── */}
        {!isLoading && !error && logs.length === 0 && <EmptyState />}

        {/* ── Table & Pagination ───────────────────────────────────────────── */}
        {!isLoading && !error && logs.length > 0 && (
          <>
            <div style={{
              background: 'var(--color-surface-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              overflowX: 'auto',
              overflowY: 'auto',
              /* ADJUST TABLE HEIGHT HERE: Change maxHeight or height to set the table scroll height (e.g. maxHeight: '400px') */
              maxHeight: 'calc(100vh - 260px)',
              boxShadow: 'var(--shadow-card)',
              marginBottom: '1.5rem'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ 
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface-header)'
                  }}>
                    {['Level', 'Action', 'User', 'Message', 'Timestamp'].map(col => (
                      <th key={col} style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem'
            }}>
              <div>
                Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)} of {total} entries
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: currentPage === 1 ? 'transparent' : 'var(--color-facility-header-bg)',
                    color: currentPage === 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  Previous
                </button>

                <span style={{ padding: '0 8px' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: currentPage === totalPages ? 'transparent' : 'var(--color-facility-header-bg)',
                    color: currentPage === totalPages ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}

export default SystemLogsPage
