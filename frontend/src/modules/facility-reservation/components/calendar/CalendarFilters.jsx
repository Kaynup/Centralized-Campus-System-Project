import React, { useState, useEffect } from 'react'
import Button from '../common/Button'

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0,
          margin: 0,
        }}
      />
      <div style={{
        position: 'relative',
        width: '38px',
        height: '22px',
        background: checked ? 'var(--color-available)' : 'var(--color-surface-active)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: '999px',
        transition: 'background-color 0.2s ease',
      }}>
        <div style={{
          position: 'absolute',
          top: '1px',
          left: checked ? '17px' : '1px',
          width: '18px',
          height: '18px',
          background: '#ffffff',
          borderRadius: '50%',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</span>
    </label>
  )
}

export default function CalendarFilters({
  filters = {},
  onChange = () => {},
  multiSelectMode = false,
  onMultiSelectModeChange = () => {},
  selectedSlotsCount = 0,
  onReserveSelected = () => {},
  onChangeStatusSelected = () => {},
  isAdmin = false,
}) {
  const [searchVal, setSearchVal] = useState(filters.searchQuery || '')

  // Debounce search query update
  useEffect(() => {
    const handler = setTimeout(() => {
      if ((filters.searchQuery || '') !== searchVal) {
        onChange({ ...filters, searchQuery: searchVal })
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [searchVal, filters.searchQuery, onChange])

  // Sync searchVal if filters are updated externally (e.g. cleared)
  useEffect(() => {
    setSearchVal(filters.searchQuery || '')
  }, [filters.searchQuery])

  const defaultFilters = {
    group: 'All',
    availableOnly: false,
    myReservationsOnly: false,
    approvalState: 'All',
    searchQuery: '',
  }

  const hasActiveFilters =
    (filters.group && filters.group !== 'All') ||
    filters.availableOnly ||
    filters.myReservationsOnly ||
    (filters.approvalState && filters.approvalState !== 'All') ||
    (filters.searchQuery && filters.searchQuery.trim() !== '')

  return (
    <section className="calendar-filters" aria-label="Calendar filters" style={{
      background: 'var(--color-surface-faint)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem',
      marginBottom: '1rem',
    }}>
      <div className="filters-row" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center', flex: 1 }}>
          
          {/* Search bar */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '180px' }}>
            <input
              type="search"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search facilities..."
              aria-label="Search facilities"
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-surface-subtle)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {/* SVG Search Icon */}
            <svg
              style={{
                position: 'absolute',
                left: '0.8rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '14px',
                height: '14px',
                fill: 'none',
                stroke: 'var(--color-text-muted)',
                strokeWidth: '2',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          {/* Group dropdown */}
          <select
            value={filters.group || 'All'}
            onChange={(e) => onChange({ ...filters, group: e.target.value })}
            style={{
              padding: '0.6rem 1.8rem 0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border-subtle)',
              background: 'var(--color-surface-subtle)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.6rem center',
              backgroundSize: '12px',
            }}
          >
            <option value="All" style={{ background: 'var(--color-surface-subtle)' }}>All Groups</option>
            <option value="Courts" style={{ background: 'var(--color-surface-subtle)' }}>Courts</option>
            <option value="Classrooms" style={{ background: 'var(--color-surface-subtle)' }}>Classrooms</option>
            <option value="Labs" style={{ background: 'var(--color-surface-subtle)' }}>Labs</option>
            <option value="Halls" style={{ background: 'var(--color-surface-subtle)' }}>Halls</option>
          </select>

          {/* Approval State dropdown */}
          <select
            value={filters.approvalState || 'All'}
            onChange={(e) => onChange({ ...filters, approvalState: e.target.value })}
            style={{
              padding: '0.6rem 1.8rem 0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border-subtle)',
              background: 'var(--color-surface-subtle)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.6rem center',
              backgroundSize: '12px',
            }}
          >
            <option value="All" style={{ background: 'var(--color-surface-subtle)' }}>All Approvals</option>
            <option value="Pending Only" style={{ background: 'var(--color-surface-subtle)' }}>Pending Only</option>
            <option value="Approved Only" style={{ background: 'var(--color-surface-subtle)' }}>Approved Only</option>
          </select>

          {/* Toggles wrapper */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginLeft: '0.5rem' }}>
            <Toggle
              label="Available Only"
              checked={!!filters.availableOnly}
              onChange={() => onChange({ ...filters, availableOnly: !filters.availableOnly })}
            />
            <Toggle
              label="My Reservations"
              checked={!!filters.myReservationsOnly}
              onChange={() => onChange({ ...filters, myReservationsOnly: !filters.myReservationsOnly })}
            />
            <Toggle
              label={multiSelectMode ? `Multi-select (${selectedSlotsCount})` : 'Multi-select'}
              checked={multiSelectMode}
              onChange={() => onMultiSelectModeChange(!multiSelectMode)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {multiSelectMode && (
            <>
              <Button
                variant="primary"
                size="sm"
                disabled={selectedSlotsCount === 0}
                onClick={onReserveSelected}
              >
                Reserve Selected{selectedSlotsCount > 0 ? ` (${selectedSlotsCount})` : ''}
              </Button>
              {isAdmin && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={selectedSlotsCount === 0}
                  onClick={onChangeStatusSelected}
                  style={{
                    backgroundColor: 'rgba(153, 27, 27, 0.9)', // dark reddish
                    borderColor: 'rgba(127, 29, 29, 1)',
                  }}
                >
                  Change Status{selectedSlotsCount > 0 ? ` (${selectedSlotsCount})` : ''}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Clear filters action */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchVal('')
              onChange(defaultFilters)
            }}
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.82rem',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              color: 'var(--color-unavailable)',
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>
    </section>
  )
}
