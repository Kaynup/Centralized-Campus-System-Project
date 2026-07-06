import { render, screen, fireEvent } from '@testing-library/react'
import CalendarGrid from '../components/calendar/CalendarGrid'

test('renders facility group and rows, and slot click triggers callback', () => {
  const facility = { id: 99, name: 'Test Facility', group: 'Tests', requiresApproval: false }
  const onSlotClick = vi.fn()

  render(<CalendarGrid facilities={[facility]} slotsMap={{ 99: [] }} onSlotClick={onSlotClick} selectedDate="2026-06-02" />)

  expect(screen.getByText('Tests')).toBeInTheDocument()
  expect(screen.getByText('Test Facility')).toBeInTheDocument()

  const buttons = screen.getAllByRole('button')
  expect(buttons.length).toBeGreaterThan(0)
  fireEvent.click(buttons[0])
  expect(onSlotClick).toHaveBeenCalledWith(
    expect.objectContaining({
      startTime: '07:00',
      endTime: '07:10',
      status: 'PAST'
    }),
    facility
  )
})
