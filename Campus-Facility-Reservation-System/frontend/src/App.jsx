/**
 * App.jsx - Main Application Entry Point
 * Sets up routing and context providers for the Campus Facility Reservation System
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { FacilityProvider } from './contexts/FacilityContext'
import { BookingProvider } from './contexts/BookingContext'
import { NotificationProvider } from './contexts/NotificationContext'
import FacilityCalendarPage from './pages/FacilityCalendarPage'
import MyReservationsPage from './pages/MyReservationsPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ApprovalDashboardPage from './pages/ApprovalDashboardPage'
import SystemLogsPage from './pages/SystemLogsPage'
import AdminUserUploadPage from './pages/AdminUserUploadPage'
import NotFoundPage from './pages/NotFoundPage'

/**
 * Provider order: Theme -> Toast -> Auth -> Notification -> Facility -> Booking
 *
 * Routes:
 *   /               -> redirect to /calendar
 *   /calendar       -> FacilityCalendarPage (Protected)
 *   /reservations   -> MyReservationsPage   (Protected)
 *   /notifications  -> NotificationsPage    (Protected)
 *   /profile        -> ProfilePage          (Protected)
 *   /settings       -> SettingsPage         (Protected)
 *   /login          -> LoginPage (Public)
 *   /register       -> RegisterPage (Public)
 *   /admin/approvals -> ApprovalDashboardPage (Protected)
 *   /admin/logs      -> SystemLogsPage        (Protected)
 *   *               -> 404
 */
function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <FacilityProvider>
              <BookingProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/calendar" replace />} />

                  <Route
                    path="/calendar"
                    element={
                      <ProtectedRoute>
                        <FacilityCalendarPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/reservations"
                    element={
                      <ProtectedRoute>
                        <MyReservationsPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationsPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Admin routes — role guard handled inside the page */}
                  <Route
                    path="/admin/approvals"
                    element={
                      <ProtectedRoute>
                        <ApprovalDashboardPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/logs"
                    element={
                      <ProtectedRoute>
                        <SystemLogsPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/users/upload"
                    element={
                      <ProtectedRoute>
                        <AdminUserUploadPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </BookingProvider>
            </FacilityProvider>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
