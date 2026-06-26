import { render, screen } from '@testing-library/react'
import StatusBar from '../components/calendar/StatusBar'

describe('StatusBar', () => {
  test('renders four chips with provided props', () => {
    render(<StatusBar tokenBalance={10} activeReservations={2} pendingBookings={1} todaySlots={5} />)

    expect(screen.getByText(/Token Balance/i)).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()

    expect(screen.getByText(/Active Reservations/i)).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    expect(screen.getByText(/Pending Bookings/i)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()

    expect(screen.getByText(/Today's Slots/i)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
