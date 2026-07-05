import { Routes, Route } from "react-router-dom";

import AppShell from "./components/layout/AppShell";

import { AuthProvider } from "./shared/context/AuthContext";
import { WalletProvider } from "./shared/context/WalletContext";
import { NotificationProvider } from "./shared/context/NotificationContext";

import ProtectedRoute from "./routes/ProtectedRoute";

import ErrorBoundary from "./shared/ui/ErrorBoundary";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import Notifications from './pages/Notifications';
import { ToastProvider } from "./shared/ui/Toast";

function App() {
  return (
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
                    path="/notifications"
                    element={
                      <ErrorBoundary>
                        <Notifications />
                      </ErrorBoundary>
                    }
                  />
                  
                  {/*Future Modules*/}

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

                  {/*
                  <Route
                    path="/admin/*"
                    element={
                      <ErrorBoundary>
                        <AdminRoutes />
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
  );
}

export default App;