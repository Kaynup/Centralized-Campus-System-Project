/**
 * Mock Data - Campus Facility Reservation System
 *
 * Temporary fixture data for the facility reservation module.
 */

import { SlotStatus } from '../utils/bookingHelpers';

export const MOCK_FACILITIES = [
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
];

export const MOCK_USER = {
  id: 3,
  name: 'Punyak',
  email: 'punyak@gmail.com',
  role: 'student',
  tokenBalance: 42,
  activeReservations: 2,
  pendingBookings: 1,
};

export function generateMockSlots(facilityId, date) {
  const bookings = [];
  const startHour = 7;
  const endHour = 17;
  const totalSlots = (endHour - startHour) * 6;
  const occupied = new Array(totalSlots).fill(false);
  const bookingCount = Math.max(1, Math.floor(Math.random() * 5));

  const facility = MOCK_FACILITIES.find((f) => f.id === facilityId);
  const depositPer10Min = facility ? (facility.tokenCostPerHour / 60) * 10 : 0.1667;

  const idxToTime = (idx) => {
    const minutesFromStart = idx * 10;
    const h = Math.floor((startHour * 60 + minutesFromStart) / 60);
    const m = (startHour * 60 + minutesFromStart) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  let attempts = 0;
  while (bookings.length < bookingCount && attempts < bookingCount * 8) {
    attempts += 1;
    const maxStart = totalSlots - 1;
    const startIdx = Math.floor(Math.random() * (maxStart + 1));
    const possibleSpans = [3, 6, 9, 12];
    const span = possibleSpans[Math.floor(Math.random() * possibleSpans.length)];
    if (startIdx + span > totalSlots) continue;

    let overlap = false;
    for (let j = startIdx; j < startIdx + span; j++) {
      if (occupied[j]) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    for (let j = startIdx; j < startIdx + span; j++) occupied[j] = true;

    const startTime = idxToTime(startIdx);
    const endTime = idxToTime(startIdx + span);

    const rand = Math.random() * 100;
    let status = SlotStatus.RESERVED;
    if (rand < 70) status = SlotStatus.RESERVED;
    else if (rand < 85) status = SlotStatus.PENDING;
    else if (rand < 93) status = SlotStatus.UNAVAILABLE;
    else status = SlotStatus.MY_BOOKING;

    const slotId = `${facilityId}-${date}-${startTime}`;
    bookings.push({
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
    });
  }

  return bookings;
}

export function generateMockSlotsForAllFacilities(date) {
  const slotsMap = {};
  MOCK_FACILITIES.forEach((facility) => {
    slotsMap[facility.id] = generateMockSlots(facility.id, date);
  });
  return slotsMap;
}
