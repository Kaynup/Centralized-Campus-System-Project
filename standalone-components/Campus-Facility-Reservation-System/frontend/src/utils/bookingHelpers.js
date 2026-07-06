// Utility helpers for booking slot calculations

export const SlotStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  PENDING: 'PENDING',
  UNAVAILABLE: 'UNAVAILABLE',
  MY_BOOKING: 'MY_BOOKING',
  PAST: 'PAST',
  END: 'END',
}

const STATUS_COLORS = {
  [SlotStatus.AVAILABLE]: 'var(--color-available)',
  [SlotStatus.RESERVED]: 'var(--color-reserved)',
  [SlotStatus.PENDING]: 'var(--color-pending)',
  [SlotStatus.UNAVAILABLE]: 'var(--color-unavailable)',
  [SlotStatus.MY_BOOKING]: 'var(--color-my-booking)',
  [SlotStatus.PAST]: 'var(--color-past)',
}

const STATUS_LABELS = {
  [SlotStatus.AVAILABLE]: 'Available',
  [SlotStatus.RESERVED]: 'Reserved',
  [SlotStatus.PENDING]: 'Pending Approval',
  [SlotStatus.UNAVAILABLE]: 'Unavailable',
  [SlotStatus.MY_BOOKING]: 'My Booking',
  [SlotStatus.PAST]: 'Past Slot',
}

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const time = timeStr.includes('T') ? timeStr.split('T')[1].slice(0, 5) : timeStr.slice(0, 5)
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function getSlotIndex(timeStr, start = '07:00', slotMinutes = 10) {
  const diff = timeToMinutes(timeStr) - timeToMinutes(start)
  return Math.floor(diff / slotMinutes)
}

export function calculateSlotSpan(startTime, endTime, slotMinutes = 10) {
  const span = Math.round((timeToMinutes(endTime) - timeToMinutes(startTime)) / slotMinutes)
  return Math.max(1, span)
}

export function formatTimeRange(startTime, endTime) {
  return `${startTime}–${endTime}`
}

export function getStatusColor(status) {
  return STATUS_COLORS[status] || 'var(--color-text-muted)'
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || 'Unknown Status'
}

export function isSlotClickable(slot) {
  if (!slot || !slot.status) return false
  return [SlotStatus.AVAILABLE, SlotStatus.PENDING, SlotStatus.MY_BOOKING].includes(slot.status)
}

export function computeDepositPreview(facility, startTime, endTime) {
  const costPerHour = facility?.tokenCostPerHour ?? 1
  const minutes = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime))
  return Math.round((minutes / 60) * costPerHour * 100) / 100
}

/**
 * Returns the minimum number of 10-minute slots required for a booking
 * based on the facility's group.
 */
export function getMinSlotsForFacility(facilityGroup) {
  switch (facilityGroup) {
    case 'Courts':
    case 'Halls':
      return 6 // 60 minutes
    case 'Classrooms':
    case 'Labs':
      return 3 // 30 minutes
    default:
      return 3 // Default 30 minutes
  }
}

