import { render, screen } from '@testing-library/react'
import StatusBadge from '../components/common/StatusBadge'

test('renders status badge with readable label', () => {
  render(<StatusBadge status="RESERVED" />)
  expect(screen.getByText('Reserved')).toBeInTheDocument()
})
