import { Routes, Route } from "react-router-dom";

import AppShell from "./components/layout/AppShell";

import { ThemeProvider } from "./shared/context/ThemeContext";
import { AuthProvider } from "./shared/context/AuthContext";
import { WalletProvider } from "./shared/context/WalletContext";
import { NotificationProvider } from "./shared/context/NotificationContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import SuperAdminRoute from "./routes/SuperAdminRoute";

import ErrorBoundary from "./shared/ui/ErrorBoundary";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import Settings from "./pages/Settings";
import AdminUserUpload from "./pages/AdminUserUpload";
import AdminManageStudents from "./pages/AdminManageStudents";
import AdminRequestsPage from "./pages/AdminRequestsPage";
import AdminManageAdmins from "./pages/AdminManageAdmins";
import { ToastProvider } from "./shared/ui/Toast";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <WalletProvider>
            <NotificationProvider>
              <Routes>

                {/*Public Routes*/}
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />

                {/* Protected Routes*/}
                <Route element={<ProtectedRoute />}>

                  {/* Shared Layout */}
                  <Route element={<AppShell />}>

                    {/* Dashboard */}
                    <Route
                      path="/dashboard"
                      element={
                        <ErrorBoundary>
                          <Dashboard />
                        </ErrorBoundary>
                      }
                    />

                    {/* Shared Pages */}

                    <Route
                      path="/wallet"
                      element={
                        <ErrorBoundary>
                          <Wallet />
                        </ErrorBoundary>
                      }
                    />

                    <Route
                      path="/profile"
                      element={
                        <ErrorBoundary>
                          <Profile />
                        </ErrorBoundary>
                      }
                    />

                    <Route
                      path="/settings"
                      element={
                        <ErrorBoundary>
                          <Settings />
                        </ErrorBoundary>
                      }
                    />

                    {/* Admin Pages — guarded by AdminRoute (must be
                        an admin account at all), then SuperAdminRoute
                        (must specifically be super_admin) for the
                        core/shared admin functions below. Sub-admin
                        domain-specific pages will get their own
                        guard once those pages exist. */}
                    <Route element={<AdminRoute />}>
                      <Route element={<SuperAdminRoute />}>
                        <Route
                          path="/admin/upload"
                          element={
                            <ErrorBoundary>
                              <AdminUserUpload />
                            </ErrorBoundary>
                          }
                        />

                        <Route
                          path="/admin/students"
                          element={
                            <ErrorBoundary>
                              <AdminManageStudents />
                            </ErrorBoundary>
                          }
                        />

                        <Route
                          path="/admin/requests"
                          element={
                            <ErrorBoundary>
                              <AdminRequestsPage />
                            </ErrorBoundary>
                          }
                        />

                        <Route
                          path="/admin/admins"
                          element={
                            <ErrorBoundary>
                              <AdminManageAdmins />
                            </ErrorBoundary>
                          }
                        />
                      </Route>
                    </Route>

                    {/*
                    <Route
                      path="/notifications"
                      element={
                        <ErrorBoundary>
                          <Notifications />
                        </ErrorBoundary>
                      }
                    />
                    */}

                    {/*Future Modules — sub-admin domain pages will
                        eventually live here too, each guarded to
                        check user.domain matches the module */}

                    {/*
                    <Route
                      path="/equipment/*"
                      element={
                        <ErrorBoundary>
                          <EquipmentRoutes />
                        </ErrorBoundary>
                      }
                    />
                    */}

                    {/*
                    <Route
                      path="/facility/*"
                      element={
                        <ErrorBoundary>
                          <FacilityRoutes />
                        </ErrorBoundary>
                      }
                    />
                    */}

                    {/*
                    <Route
                      path="/marketplace/*"
                      element={
                        <ErrorBoundary>
                          <MarketplaceRoutes />
                        </ErrorBoundary>
                      }
                    />
                    */}

                  </Route>
                </Route>
              </Routes>
            </NotificationProvider>
          </WalletProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;