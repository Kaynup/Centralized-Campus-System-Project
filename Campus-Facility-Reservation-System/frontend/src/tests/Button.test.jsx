import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../components/common/Button'

test('renders button with text and calls onClick', async () => {
  const handleClick = vi.fn()
  render(<Button onClick={handleClick}>Click me</Button>)
  const button = screen.getByRole('button', { name: 'Click me' })
  await userEvent.click(button)
  expect(handleClick).toHaveBeenCalledTimes(1)
})

test('renders disabled button and does not call click handler', async () => {
  const handleClick = vi.fn()
  render(<Button disabled onClick={handleClick}>Submit</Button>)
  const button = screen.getByRole('button', { name: 'Submit' })
  expect(button).toBeDisabled()
  await userEvent.click(button)
  expect(handleClick).not.toHaveBeenCalled()
})
