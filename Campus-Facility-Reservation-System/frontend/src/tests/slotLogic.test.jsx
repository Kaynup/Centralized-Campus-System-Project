import { describe, expect, test, vi, afterEach } from 'vitest'
import { markPastBookings, isSlotBeforeNow } from '../utils/slotLogic'
import { SlotStatus } from '../utils/bookingHelpers'

describe('slotLogic', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('converts started pending bookings into a past one-slot block', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 3, 10, 20))

    const bookings = [
      {
        id: '1-2026-06-03-09:30',
        facilityId: 1,
        startTime: '09:30',
        endTime: '10:30',
        date: '2026-06-03',
        status: SlotStatus.PENDING,
        bookingId: 123,
        userName: 'Pending Approval',
        deposit: 2,
      },
    ]

    const result = markPastBookings(bookings, '2026-06-03')

    expect(result).toHaveLength(1)
    expect(result[0].status).toBe(SlotStatus.PAST)
    expect(result[0].endTime).toBe('09:40')
    expect(result[0].userName).toBe('Canceled pending')
  })

  test('marks current-day repeated unavailable bookings as past when start time is in the past', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 3, 11, 0))

    const bookings = [
      {
        id: '1-2026-06-03-08:00',
        facilityId: 1,
        startTime: '08:00',
        endTime: '09:00',
        date: '2026-06-03',
        status: SlotStatus.UNAVAILABLE,
      },
    ]

    const result = markPastBookings(bookings, '2026-06-03')

    expect(result[0].status).toBe('UNAVAILABLE-END')
  })

  test('marks empty slots before now as past on the current day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 3, 12, 10))

    expect(isSlotBeforeNow(21, '2026-06-03')).toBe(true)
    expect(isSlotBeforeNow(31, '2026-06-03')).toBe(false)
  })
})
