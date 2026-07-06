// Role helper utilities for authorization and reservation rules.

export function isAdmin(user) {
  return user?.role === 'admin'
}

export function isProfessor(user) {
  return user?.role === 'professor'
}

export function canManageApprovals(user) {
  return isAdmin(user) || isProfessor(user)
}

export function getMaxReservations(user) {
  if (!user || !user.role) return null
  if (isAdmin(user)) return 100
  if (isProfessor(user)) return 20
  if (user.role === 'student') return 5
  return null
}
