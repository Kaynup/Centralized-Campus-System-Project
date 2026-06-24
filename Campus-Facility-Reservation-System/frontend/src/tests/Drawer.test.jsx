import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Drawer from '../components/common/Drawer'

test('renders drawer content when open and closes on button click', async () => {
  const handleClose = vi.fn()
  render(
    <Drawer isOpen onClose={handleClose} title="Test Drawer">
      <div>Drawer body</div>
    </Drawer>
  )

  expect(screen.getByRole('dialog', { name: 'Test Drawer' })).toBeInTheDocument()
  expect(screen.getByText('Drawer body')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /close/i }))
  expect(handleClose).toHaveBeenCalledTimes(1)
})
