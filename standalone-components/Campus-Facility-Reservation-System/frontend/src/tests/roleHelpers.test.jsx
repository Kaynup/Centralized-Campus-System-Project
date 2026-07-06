import { describe, expect, test } from 'vitest'
import { isAdmin, isProfessor, canManageApprovals, getMaxReservations } from '../utils/roleHelpers'

describe('roleHelpers', () => {
  test('recognizes admin users', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true)
    expect(isAdmin({ role: 'student' })).toBe(false)
  })

  test('recognizes professor users', () => {
    expect(isProfessor({ role: 'professor' })).toBe(true)
    expect(isProfessor({ role: 'admin' })).toBe(false)
  })

  test('determines approval capability', () => {
    expect(canManageApprovals({ role: 'admin' })).toBe(true)
    expect(canManageApprovals({ role: 'professor' })).toBe(true)
    expect(canManageApprovals({ role: 'student' })).toBe(false)
  })

  test('returns max reservations by role', () => {
    expect(getMaxReservations({ role: 'admin' })).toBe(100)
    expect(getMaxReservations({ role: 'professor' })).toBe(20)
    expect(getMaxReservations({ role: 'student' })).toBe(5)
    expect(getMaxReservations({ role: 'guest' })).toBe(null)
  })
})
