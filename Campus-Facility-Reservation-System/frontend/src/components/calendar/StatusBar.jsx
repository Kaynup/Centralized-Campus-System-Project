import React from 'react'
import '../../styles/layout.css'
import { MOCK_USER } from '../../api/mockData'

export default function StatusBar({ tokenBalance, activeReservations, pendingBookings, todaySlots }) {
  const data = {
    tokenBalance: typeof tokenBalance === 'number' ? tokenBalance : MOCK_USER.tokenBalance,
    activeReservations: typeof activeReservations === 'number' ? activeReservations : MOCK_USER.activeReservations,
    pendingBookings: typeof pendingBookings === 'number' ? pendingBookings : MOCK_USER.pendingBookings,
    todaySlots: typeof todaySlots === 'number' ? todaySlots : 0,
  }

  return (
    <div className="status-bar" role="region" aria-label="Status Bar">
      <div className="status-chip">
        <div className="chip-icon">💰</div>
        <div className="chip-body">
          <div className="chip-label">Token Balance</div>
          <div className="chip-value" aria-live="polite">{data.tokenBalance}</div>
        </div>
      </div>

      <div className="status-chip">
        <div className="chip-icon">✅</div>
        <div className="chip-body">
          <div className="chip-label">Active Reservations</div>
          <div className="chip-value" aria-live="polite">{data.activeReservations}</div>
        </div>
      </div>

      <div className="status-chip">
        <div className="chip-icon">⏳</div>
        <div className="chip-body">
          <div className="chip-label">Pending Bookings</div>
          <div className="chip-value" aria-live="polite">{data.pendingBookings}</div>
        </div>
      </div>

      <div className="status-chip">
        <div className="chip-icon">📅</div>
        <div className="chip-body">
          <div className="chip-label">Today's Slots</div>
          <div className="chip-value" aria-live="polite">{data.todaySlots}</div>
        </div>
      </div>
    </div>
  )
}
