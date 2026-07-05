import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../shared/hooks/useAuth";

/**
 * AdminRoute.jsx
 * ------------------------------------------------------------------
 * Sits INSIDE ProtectedRoute (so "logged in?" is already guaranteed)
 * and additionally checks "is this session an admin account?". Any
 * non-admin hitting /admin/* directly by typing the URL gets
 * redirected to /dashboard instead of seeing the page.
 *
 * SCHEMA NOTE: checks `accountType`, not `role` — admins live in a
 * separate `admin_users` table per shared_tables.md, so "role" alone
 * can't distinguish a user from an admin. See AuthContext.jsx for
 * the recommended login response shape this assumes.
 * ------------------------------------------------------------------
 */
export default function AdminRoute() {
  const { user, isCheckingSession } = useAuth();

  if (isCheckingSession) {
    return null; // ProtectedRoute's own loading state already covers this
  }

  if (user?.accountType !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}