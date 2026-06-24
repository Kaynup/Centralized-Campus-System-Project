import React from 'react'
import '../../styles/calendar.css'

// Legend items per TASKS_3.md (finalized): keep only the six statuses
// Note: END status is internal/hidden from legend
const LEGEND_ITEMS = [
  { key: 'AVAILABLE', label: 'Available' },
  { key: 'RESERVED', label: 'Reserved' },
  { key: 'PENDING', label: 'Pending Approval' },
  { key: 'UNAVAILABLE', label: 'Unavailable' },
  { key: 'MY_BOOKING', label: 'My Booking' },
  { key: 'PAST', label: 'Past Slot' },
]

export default function CalendarLegend() {
  return (
    <div className="calendar-legend" role="list" aria-label="Calendar legend">
      {LEGEND_ITEMS.map((it) => (
        <div key={it.key} className="legend-item" role="listitem" aria-label={it.label}>
          <span className={`legend-swatch booking-${it.key}`} aria-hidden="true" />
          <span className="legend-label">{it.label}</span>
        </div>
      ))}
    </div>
  )
}
