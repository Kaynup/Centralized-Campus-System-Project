import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationProvider, useNotifications } from '../contexts/NotificationContext'
import { AuthProvider } from '../contexts/AuthContext'
import * as notificationApi from '../api/notificationApi'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../api/notificationApi')
// Mock useAuth to return a logged-in user
vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: () => ({ user: { id: 1, name: 'Test User' }, token: 'fake-token' })
  }
})

// A test component to consume the context
const TestComponent = () => {
  const { notifications, unreadCount, backendUpdated, markAsRead, clearRead } = useNotifications()
  return (
    <div>
      <div data-testid="unread-count">{unreadCount}</div>
      <div data-testid="backend-updated">{backendUpdated ? 'Yes' : 'No'}</div>
      <div data-testid="notifications-count">{notifications.length}</div>
      <button onClick={() => markAsRead(1)}>Mark Read</button>
      <button onClick={clearRead}>Clear</button>
    </div>
  )
}

describe('NotificationContext', () => {
  let originalSetInterval;
  let intervalCallback;

  beforeEach(() => {
    vi.resetAllMocks()
    originalSetInterval = global.setInterval
    global.setInterval = vi.fn((cb) => {
      intervalCallback = cb
      return 123
    })
  })

  afterEach(() => {
    global.setInterval = originalSetInterval
  })

  it('fetches notifications on mount', async () => {
    const mockNotifs = [
      { id: 1, read: false },
      { id: 2, read: true }
    ]
    notificationApi.fetchNotifications.mockResolvedValue(mockNotifs)

    render(
      <MemoryRouter>
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      </MemoryRouter>
    )

    const unreadCountEl = await screen.findByTestId('unread-count', {}, { timeout: 2000 })
    expect(unreadCountEl.textContent).toBe('1')

    // It might be called 1 or 2 times depending on StrictMode, so just check it was called.
    expect(notificationApi.fetchNotifications.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByTestId('notifications-count').textContent).toBe('2')
    expect(screen.getByTestId('backend-updated').textContent).toBe('No')
  })

  it('dispatches refreshBookings event if new notifications arrive during poll', async () => {
    const initialNotifs = [{ id: 1, read: true }]
    const updatedNotifs = [{ id: 2, read: false }, { id: 1, read: true }]
    
    notificationApi.fetchNotifications
      .mockResolvedValueOnce(initialNotifs) // First StrictMode render
      .mockResolvedValueOnce(initialNotifs) // Second StrictMode render
      .mockResolvedValue(updatedNotifs)     // Poll and any subsequent calls

    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')

    render(
      <MemoryRouter>
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      </MemoryRouter>
    )

    // Wait for the initial load to complete
    await waitFor(() => {
      expect(screen.getByTestId('notifications-count').textContent).toBe('1')
    })

    // Trigger poll manually
    expect(intervalCallback).toBeDefined()
    await act(async () => {
      intervalCallback()
    })

    const countEl2 = await screen.findByTestId('notifications-count', {}, { timeout: 2000 })
    expect(countEl2.textContent).toBe('2')

    await waitFor(() => {
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'refreshBookings'
      }))
    })
    
    dispatchEventSpy.mockRestore()
  })
})
