import { render, screen, fireEvent } from '@testing-library/react'
import FacilityRow from '../components/calendar/FacilityRow'

test('renders facility label and empty slots clickable', () => {
  const facility = { id: 99, name: 'Test Facility', group: 'Tests', requiresApproval: true }
  const onSlotClick = vi.fn()
  render(<FacilityRow facility={facility} slots={[]} onSlotClick={onSlotClick} />)

  expect(screen.getByText('Test Facility')).toBeInTheDocument()
  const empty = screen.getAllByRole('button')
  // there should be many empty slot buttons; click the first
  fireEvent.click(empty[0])
  expect(onSlotClick).toHaveBeenCalled()
})
