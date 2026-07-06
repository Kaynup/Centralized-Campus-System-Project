import { Routes, Route, Navigate } from "react-router-dom";

import { FacilityProvider } from "./contexts/FacilityContext";
import { BookingProvider } from "./contexts/BookingContext";

import FacilityCalendarPage from "./pages/FacilityCalendarPage";
import MyReservationsPage from "./pages/MyReservationsPage";
// import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
// import SettingsPage from "./pages/SettingsPage";

import ApprovalDashboardPage from "./pages/ApprovalDashboardPage";
import SystemLogsPage from "./pages/SystemLogsPage";
import AdminUserUploadPage from "./pages/AdminUserUploadPage";

import NotFoundPage from "./pages/NotFoundPage";

import './styles/theme.css'
import './styles/layout.css'
import './styles/calendar.css'


function FacilityRoutes() {
  return (
    <FacilityProvider>
      <BookingProvider>
        <Routes>
          <Route index element={<Navigate to="calendar" replace />} />

          <Route path="calendar" element={<FacilityCalendarPage />} />
          <Route path="reservations" element={<MyReservationsPage />} />
          {/* <Route path="notifications" element={<NotificationsPage />} /> */}
          <Route path="profile" element={<ProfilePage />} />
          {/* <Route path="settings" element={<SettingsPage />} /> */}

          <Route path="admin/approvals" element={<ApprovalDashboardPage />} />
          <Route path="admin/logs" element={<SystemLogsPage />} />
          <Route
            path="admin/users/upload"
            element={<AdminUserUploadPage />}
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BookingProvider>
    </FacilityProvider>
  );
}

export default FacilityRoutes;