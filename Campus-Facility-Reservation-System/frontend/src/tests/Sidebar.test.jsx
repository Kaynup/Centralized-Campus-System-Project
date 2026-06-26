import { render, screen } from '@testing-library/react'
import Sidebar from '../components/layout/Sidebar'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'student' }
  })
}))

test('renders sidebar nav items and respects isCollapsed prop', () => {
  const { rerender } = render(
    <MemoryRouter>
      <Sidebar isCollapsed={false} />
    </MemoryRouter>
  )

  expect(screen.getByLabelText('Main navigation')).toBeInTheDocument()
  expect(screen.getByLabelText('Calendar')).toBeInTheDocument()
  expect(screen.getByLabelText('My Reservations')).toBeInTheDocument()
  
  // When not collapsed, labels should be visible
  expect(screen.getByText('Calendar')).toBeInTheDocument()

  // Re-render as collapsed
  rerender(
    <MemoryRouter>
      <Sidebar isCollapsed={true} />
    </MemoryRouter>
  )
  
  // When collapsed, labels should not be in document/visible
  expect(screen.queryByText('Calendar')).not.toBeInTheDocument()
})
