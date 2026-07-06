import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '../api/apiClient'
import * as bookingApi from '../api/bookingApi'

vi.mock('../api/apiClient')

describe('bookingApi', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('createBooking', () => {
    it('sends correct unified block payload', async () => {
      const payload = { facility_id: 1, booking_date: '2026-01-01', start_slot_id: 10, end_slot_id: 15 }
      apiClient.post.mockResolvedValueOnce({ data: { id: 10 } })

      const result = await bookingApi.createBooking(payload)
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/bookings', payload)
      expect(result).toEqual({ id: 10 })
    })
  })

  describe('fetchMyBookings', () => {
    it('fetches unified bookings without any grouping logic', async () => {
      const mockBookings = [
        {
          id: 1,
          facilityName: 'Lab A',
          date: '2026-01-01',
          startTime: '10:00',
          endTime: '13:00',
          status: 'RESERVED',
          deposit: 15
        },
        {
          id: 4,
          facilityName: 'Lab B',
          date: '2026-01-01',
          startTime: '10:00',
          endTime: '11:00',
          status: 'RESERVED',
          deposit: 10
        }
      ]

      apiClient.get.mockResolvedValueOnce({ data: mockBookings })

      const result = await bookingApi.fetchMyBookings()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[0].startTime).toBe('10:00')
      expect(result[0].endTime).toBe('13:00')
      
      expect(result[1].id).toBe(4)
      expect(result[1].startTime).toBe('10:00')
    })
  })
})
