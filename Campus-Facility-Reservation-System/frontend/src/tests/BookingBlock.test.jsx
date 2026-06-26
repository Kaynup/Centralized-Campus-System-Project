import { render, screen, fireEvent } from '@testing-library/react'
import BookingBlock from '../components/calendar/BookingBlock'

test('renders booking block with title and handles click', () => {
  const slot = { startTime: '10:00', endTime: '10:30', status: 'RESERVED', userName: 'Other User' }
  const onClick = vi.fn()
  render(<BookingBlock slot={slot} onClick={onClick} />)

  expect(screen.getByText('10:00')).toBeInTheDocument()
  expect(screen.getByText(/Other User/)).toBeInTheDocument()
  const el = screen.getByRole('button')
  fireEvent.click(el)
  expect(onClick).toHaveBeenCalledWith(slot)
})
