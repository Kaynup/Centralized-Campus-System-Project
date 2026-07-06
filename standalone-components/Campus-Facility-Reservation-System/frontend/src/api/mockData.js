/**
 * Mock Data - Campus Facility Reservation System
 * 
 * TEMPORARY - This file will be replaced with real API calls
 * To be replaced by generateMockSlots and MOCK_USER with API calls
 * 
 * Used for frontend development before backend is ready
 */

import { SlotStatus } from '../utils/bookingHelpers'

/**
 * Mock Facilities (8 total across 4 groups)
 * Groups: Courts, Classrooms, Labs, Halls
 * 
 * @type {Array<{id: number, name: string, group: string, capacity: number, requiresApproval: boolean, tokenCostPerHour: number}>}
 */
export const MOCK_FACILITIES = [
  // Courts (4)
  {
    id: 1,
    name: 'Basketball Court A (Main Arena)',
    group: 'Courts',
    capacity: 10,
    requiresApproval: false,
    tokenCostPerHour: 1,
  },
  {
    id: 2,
    name: 'Tennis Court B (Outdoor Clay)',
    group: 'Courts',
    capacity: 4,
    requiresApproval: false,
    tokenCostPerHour: 1,
  },
  {
    id: 9,
    name: 'Badminton Court C (Indoor Hall)',
    group: 'Courts',
    capacity: 4,
    requiresApproval: false,
    tokenCostPerHour: 1,
  },
  {
    id: 10,
    name: 'Volleyball Court D (Multipurpose Beach Arena)',
    group: 'Courts',
    capacity: 12,
    requiresApproval: false,
    tokenCostPerHour: 1,
  },

  // Classrooms (4)
  {
    id: 3,
    name: 'Lecture Room 101 (Physics Wing)',
    group: 'Classrooms',
    capacity: 40,
    requiresApproval: false,
    tokenCostPerHour: 1,
  },
  {
    id: 4,
    name: 'Lecture Room 202 (Arts & Humanities Section)',
    group: 'Classrooms',
    capacity: 30,
    requiresApproval: false,
    tokenCostPerHour: 1,
  },
  {
    id: 11,
    name: 'Advanced Seminar Auditorium 303',
    group: 'Classrooms',
    capacity: 50,
    requiresApproval: true,
    tokenCostPerHour: 2,
  },
  {
    id: 12,
    name: 'Interactive Learning Studio 104',
    group: 'Classrooms',
    capacity: 25,
    requiresApproval: false,
    tokenCostPerHour: 1,
  },

  // Labs (4)
  {
    id: 5,
    name: 'Advanced CS Research Laboratory (Cybersecurity & Systems)',
    group: 'Labs',
    capacity: 20,
    requiresApproval: true,
    tokenCostPerHour: 1,
  },
  {
    id: 6,
    name: 'Molecular Biology & Genetics Core Laboratory',
    group: 'Labs',
    capacity: 15,
    requiresApproval: true,
    tokenCostPerHour: 1,
  },
  {
    id: 13,
    name: 'Organic Chemistry & Biochemistry Synthesis Lab',
    group: 'Labs',
    capacity: 18,
    requiresApproval: true,
    tokenCostPerHour: 1,
  },
  {
    id: 14,
    name: 'Quantum Physics & Optical Measurement Facility',
    group: 'Labs',
    capacity: 8,
    requiresApproval: true,
    tokenCostPerHour: 2,
  },

  // Halls (4)
  {
    id: 7,
    name: 'Main Conference Grand Exhibition Hall',
    group: 'Halls',
    capacity: 100,
    requiresApproval: true,
    tokenCostPerHour: 1,
  },
  {
    id: 8,
    name: 'Seminar Hall B (North Wing)',
    group: 'Halls',
    capacity: 60,
    requiresApproval: false,
    tokenCostPerHour: 1,
  },
  {
    id: 15,
    name: 'Student Multi-purpose Activity & Recreation Hall',
    group: 'Halls',
    capacity: 150,
    requiresApproval: true,
    tokenCostPerHour: 3,
  },
  {
    id: 16,
    name: 'Visual Arts Exhibition & Gallery Lounge',
    group: 'Halls',
    capacity: 80,
    requiresApproval: false,
    tokenCostPerHour: 1,
  },
]

/**
 * Mock Current User
 * Represents the logged-in student
 * 
 * @type {{id: number, name: string, email: string, role: string, tokenBalance: number, activeReservations: number, pendingBookings: number}}
 */
export const MOCK_USER = {
  id: 3,
  name: 'Punyak',
  email: 'punyak@gmail.com',
  role: 'student',
  tokenBalance: 42,
  activeReservations: 2,
  pendingBookings: 1,
}

/**
 * Generate mock slots for a facility on a given date
 * 
 * TEMPORARY - Team Member 4 will replace this with API call to GET /facilities/{id}/slots
 * 
 * Generates 10-minute slots from 07:00 to 17:00 (60 slots total)
 * Randomly assigns statuses:
 *   - 70% AVAILABLE
 *   - 15% RESERVED
 *   - 5% PENDING
 *   - 5% MY_BOOKING
 *   - 5% PAST (if before current time)
 * 
 * @param {number} facilityId - ID of facility
 * @param {string} date - Date in YYYY-MM-DD format (e.g., "2025-07-04")
 * @returns {Array<{id: string, facilityId: number, startTime: string, endTime: string, date: string, status: string, bookingId?: number, userName?: string, deposit?: number}>}
 */
export function generateMockSlots(facilityId, date) {
  const bookings = []
  const startHour = 7 // 07:00
  const endHour = 17 // 17:00 (10 hours)
  const totalSlots = (endHour - startHour) * 6 // 10 hours * 6 = 60 slots (10-min)

  // Track occupied indices so bookings do not overlap
  const occupied = new Array(totalSlots).fill(false)

  // Number of bookings per facility (1-5)
  const bookingCount = Math.max(1, Math.floor(Math.random() * 5))

  const facility = MOCK_FACILITIES.find((f) => f.id === facilityId)
  const depositPer10Min = facility ? (facility.tokenCostPerHour / 60) * 10 : 0.1667

  const idxToTime = (idx) => {
    const minutesFromStart = idx * 10
    const h = Math.floor((startHour * 60 + minutesFromStart) / 60)
    const m = (startHour * 60 + minutesFromStart) % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  let attempts = 0
  while (bookings.length < bookingCount && attempts < bookingCount * 8) {
    attempts += 1
    // pick random start index
    const maxStart = totalSlots - 1
    const startIdx = Math.floor(Math.random() * (maxStart + 1))

    // pick duration in 10-min multiples: 3,6,9,12 (30min,60,90,120)
    const possibleSpans = [3, 6, 9, 12]
    const span = possibleSpans[Math.floor(Math.random() * possibleSpans.length)]
    if (startIdx + span > totalSlots) continue

    // check overlap
    let overlap = false
    for (let j = startIdx; j < startIdx + span; j++) {
      if (occupied[j]) { overlap = true; break }
    }
    if (overlap) continue

    // Reserve indices
    for (let j = startIdx; j < startIdx + span; j++) occupied[j] = true

    const startTime = idxToTime(startIdx)
    const endTime = idxToTime(startIdx + span)

    const rand = Math.random() * 100
    let status = SlotStatus.RESERVED
    if (rand < 70) status = SlotStatus.RESERVED
    else if (rand < 85) status = SlotStatus.PENDING
    else if (rand < 93) status = SlotStatus.UNAVAILABLE
    else status = SlotStatus.MY_BOOKING

    const slotId = `${facilityId}-${date}-${startTime}`
    const booking = {
      id: slotId,
      facilityId,
      startTime,
      endTime,
      date,
      status,
      bookingId: Math.floor(Math.random() * 10000),
      userName:
        status === SlotStatus.MY_BOOKING
          ? 'My Booking'
          : status === SlotStatus.PENDING
            ? 'Pending Approval'
            : status === SlotStatus.UNAVAILABLE
              ? 'Blocked'
              : 'Other User',
      deposit: Math.round(depositPer10Min * span * 10) / 10,
    }

    bookings.push(booking)
  }

  // Return raw bookings; consumer should apply `markPastBookings` centrally.
  return bookings
}

/**
 * Generate mock slots for all facilities on a given date
 * 
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object<number, Array>} - Map of facilityId → slots array
 */
export function generateMockSlotsForAllFacilities(date) {
  const slotsMap = {}

  MOCK_FACILITIES.forEach((facility) => {
    slotsMap[facility.id] = generateMockSlots(facility.id, date)
  })

  return slotsMap
}
