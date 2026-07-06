import { render, screen } from '@testing-library/react'
import CalendarGrid from '../components/calendar/CalendarGrid'

test('renders current-time indicator when selectedDate is today', () => {
  const today = new Date().toISOString().split('T')[0]
  const facilities = [{ id: 1, name: 'F1', group: 'G1' }]
  render(<CalendarGrid selectedDate={today} facilities={facilities} slotsMap={{ 1: [] }} />)
  // indicator element should be in the document (may be display:none if outside time range)
  const el = document.querySelector('.current-time-indicator')
  expect(el).toBeInTheDocument()
})
