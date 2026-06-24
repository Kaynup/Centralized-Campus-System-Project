import { render, screen } from '@testing-library/react'
import CalendarLegend from '../components/calendar/CalendarLegend'

test('renders all legend items and swatches', () => {
  const { container } = render(<CalendarLegend />)

  expect(screen.getByText('Available')).toBeInTheDocument()
  expect(screen.getByText('Reserved')).toBeInTheDocument()
  expect(screen.getByText('Pending Approval')).toBeInTheDocument()
  expect(screen.getByText('Unavailable')).toBeInTheDocument()
  expect(screen.getByText('My Booking')).toBeInTheDocument()
  expect(screen.getByText('Past Slot')).toBeInTheDocument()

  expect(container.querySelector('.legend-swatch.booking-AVAILABLE')).not.toBeNull()
})
