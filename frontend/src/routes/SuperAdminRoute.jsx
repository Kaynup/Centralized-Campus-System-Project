import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../shared/hooks/useAuth";

/**
 * SuperAdminRoute.jsx
 * ------------------------------------------------------------------
 * Sits INSIDE AdminRoute (so "is an admin account?" is already
 * guaranteed) and additionally checks "is this admin the Super
 * Admin?". Sub-admins (equipment_admin, facility_admin,
 * marketplace_admin) get redirected to /dashboard if they try to
 * reach core/shared admin pages (student registration, change
 * requests, sub-admin management) directly by URL.
 * ------------------------------------------------------------------
 */
export default function SuperAdminRoute() {
  const { user } = useAuth();

  if (user?.role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}