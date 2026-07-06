import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SettingsPage from '../pages/SettingsPage'
import { AuthProvider } from '../contexts/AuthContext'
import { NotificationProvider } from '../contexts/NotificationContext'
import * as authApi from '../api/authApi'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../contexts/ToastContext'
import { ThemeProvider } from '../contexts/ThemeContext'

vi.mock('../api/authApi')
// Mock NotificationContext since it relies on notifications API
vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    backendUpdated: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    clearRead: vi.fn(),
    dismissUpdateBanner: vi.fn()
  }),
  NotificationProvider: ({ children }) => <>{children}</>
}))

// Mock out the AuthContext
vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: () => ({
      user: {
        id: 1,
        email: 'test@example.com',
        role: 'student',
        prefEmailNotifications: true,
        prefInappNotifications: false,
        prefBookingReminders: true
      },
      updateUserPreferences: vi.fn()
    })
  }
})

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders with initial preferences from user object', () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter>
            <SettingsPage />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    )

    const emailToggle = document.getElementById('toggle-email-notifications')
    const inappToggle = document.getElementById('toggle-inapp-notifications')

    expect(emailToggle.getAttribute('aria-checked')).toBe('true')
    expect(inappToggle.getAttribute('aria-checked')).toBe('false')
  })

  it('calls API and optimistically updates when a toggle is clicked', async () => {
    authApi.updatePreferences.mockResolvedValueOnce({
      prefEmailNotifications: true,
      prefInappNotifications: true,
      prefBookingReminders: true
    })

    render(
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter>
            <SettingsPage />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    )

    const inappToggle = document.getElementById('toggle-inapp-notifications')
    
    // It starts false
    expect(inappToggle.getAttribute('aria-checked')).toBe('false')

    // Click it to true
    fireEvent.click(inappToggle)

    // It should update optimistically to true
    expect(inappToggle.getAttribute('aria-checked')).toBe('true')

    // And API should have been called
    await waitFor(() => {
      expect(authApi.updatePreferences).toHaveBeenCalledWith({
        prefInappNotifications: true
      })
    })
  })
})
