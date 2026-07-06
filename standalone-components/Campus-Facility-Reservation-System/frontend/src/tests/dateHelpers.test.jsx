import { describe, expect, test } from 'vitest'
import { formatDate, formatTime, formatTimeRange, isToday, isFuture, getDayOfWeek, getWeekDates, minutesSince0700 } from '../utils/dateHelpers'

describe('dateHelpers', () => {
  test('formats dates into readable strings', () => {
    expect(formatDate('2026-06-02')).toContain('2026')
  })

  test('formats time from ISO and plain time strings', () => {
    expect(formatTime('2026-06-02T07:30:00')).toBe('07:30')
    expect(formatTime('09:15')).toBe('09:15')
  })

  test('formats time ranges', () => {
    expect(formatTimeRange('07:00', '07:30')).toBe('07:00–07:30')
  })

  test('detects today correctly', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(isToday(today)).toBe(true)
    expect(isToday('2000-01-01')).toBe(false)
  })

  test('detects future dates', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(isFuture(future)).toBe(true)
  })

  test('returns day of week', () => {
    expect(getDayOfWeek('2026-06-02')).toBe('Tuesday')
  })

  test('returns 5 workweek dates for a week anchor', () => {
    const dates = getWeekDates('2026-06-02')
    expect(dates).toHaveLength(5)
    expect(dates[0]).toBe('2026-06-01')
  })

  test('calculates minutes since 07:00', () => {
    expect(minutesSince0700('08:30')).toBe(90)
    expect(minutesSince0700('07:00')).toBe(0)
  })
})
