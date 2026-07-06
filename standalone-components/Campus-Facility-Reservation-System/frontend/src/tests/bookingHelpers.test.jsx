import { describe, expect, test } from 'vitest'
import { SlotStatus, getStatusColor, getStatusLabel, isSlotClickable, computeDepositPreview } from '../utils/bookingHelpers'

describe('bookingHelpers', () => {
  test('exports slot status constants', () => {
    expect(SlotStatus.AVAILABLE).toBe('AVAILABLE')
  })

  test('returns status colors and labels', () => {
    expect(getStatusColor(SlotStatus.RESERVED)).toContain('var(--color-reserved)')
    expect(getStatusLabel(SlotStatus.PENDING)).toBe('Pending Approval')
  })

  test('identifies clickable slots', () => {
    expect(isSlotClickable({ status: SlotStatus.AVAILABLE })).toBe(true)
    expect(isSlotClickable({ status: SlotStatus.PAST })).toBe(false)
    expect(isSlotClickable({ status: SlotStatus.RESERVED })).toBe(false)
  })

  test('calculates deposit preview correctly', () => {
    const facility = { tokenCostPerHour: 2 }
    expect(computeDepositPreview(facility, '07:00', '08:30')).toBe(3)
  })
})
