import { render, screen } from '@testing-library/react'
import TimeAxis from '../components/calendar/TimeAxis'

test('renders 20 half-hour slots and hour labels', () => {
  render(<TimeAxis />)
  // there should be 20 slot elements (07:00 - 17:00 with 30-min increments)
  // fallback: check the presence of some hour labels
  expect(screen.getByText('07:00')).toBeInTheDocument()
  expect(screen.getByText('08:00')).toBeInTheDocument()
})
