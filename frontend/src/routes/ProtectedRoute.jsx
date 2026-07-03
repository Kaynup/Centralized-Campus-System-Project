import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../shared/hooks/useAuth";

/**
 * ProtectedRoute
 * ------------------------------------------------------------------
 * Wraps every protected route. While the session is still hydrating
 * (checking the refresh cookie via /api/auth/me) it shows a minimal
 * loading state rather than flashing the login page.
 * ------------------------------------------------------------------
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isCheckingSession } = useAuth();
  const location = useLocation();

  if (isCheckingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}