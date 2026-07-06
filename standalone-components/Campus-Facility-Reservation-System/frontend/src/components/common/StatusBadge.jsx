import React from 'react'
import '../../styles/layout.css'
import { SlotStatus } from '../../utils/bookingHelpers'

const LABELS = {
  [SlotStatus.AVAILABLE]: 'Available',
  [SlotStatus.RESERVED]: 'Reserved',
  [SlotStatus.PENDING]: 'Pending',
  [SlotStatus.UNAVAILABLE]: 'Unavailable',
  [SlotStatus.MY_BOOKING]: 'My Booking',
  [SlotStatus.PAST]: 'Past',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status}`} aria-label={LABELS[status] || status}>
      {LABELS[status] || status}
    </span>
  )
}
