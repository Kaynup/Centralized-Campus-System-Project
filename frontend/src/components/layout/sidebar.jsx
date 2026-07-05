import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wrench,
  Building2,
  Store,
  Wallet,
  Settings,
  ShieldCheck,
  Users,
  Inbox,
  UserCog,
  X,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../../shared/hooks/useAuth";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/equipment", label: "Equipment", icon: Wrench },
  { to: "/facility", label: "Facilities", icon: Building2 },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/settings", label: "Settings", icon: Settings },
];

// Core/shared admin functions — Super Admin only.
export const SUPER_ADMIN_NAV_ITEMS = [
  { to: "/admin/upload", label: "Register students", icon: ShieldCheck },
  { to: "/admin/students", label: "Manage students", icon: Users },
  { to: "/admin/requests", label: "Change requests", icon: Inbox },
  { to: "/admin/admins", label: "Manage admins", icon: UserCog },
];

export default function Sidebar({ isCollapsed, isMobile, isMobileOpen, onCloseMobile }) {
  const { user } = useAuth();
  const expanded = isMobile ? true : !isCollapsed;

  // SCHEMA NOTE: admins live in a separate `admin_users` table per
  // shared_tables.md. `role` distinguishes super_admin from the
  // domain-scoped sub-admin roles (equipment_admin, facility_admin,
  // marketplace_admin). Core/shared admin pages (student
  // registration, change requests, sub-admin management) are
  // Super-Admin-only — sub-admins will get their own domain-specific
  // admin pages once those exist.
  const isSuperAdmin = user?.accountType === "admin" && user?.role === "super_admin";

  const baseClasses =
    "flex flex-col bg-slate text-white shrink-0 transition-all duration-200 ease-in-out";

  const mobileClasses = isMobile
    ? `fixed inset-y-0 left-0 z-40 w-64 transform ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`
    : `relative ${isCollapsed ? "w-[72px]" : "w-64"}`;

  function renderLink({ to, label, icon: Icon }) {
    return (
      <NavLink
        key={to}
        to={to}
        onClick={isMobile ? onCloseMobile : undefined}
        title={!expanded ? label : undefined}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive
              ? "bg-forest text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          } ${!expanded ? "justify-center" : ""}`
        }
      >
        <Icon className="w-5 h-5 shrink-0" />
        {expanded && <span className="truncate">{label}</span>}
      </NavLink>
    );
  }

  return (
    <aside className={`${baseClasses} ${mobileClasses}`} aria-label="Main navigation">
      {/* Brand row */}
      <div className="flex items-center gap-2 h-16 px-4 border-b border-white/10">
        <GraduationCap className="w-7 h-7 text-gold shrink-0" />
        {expanded && <span className="font-semibold text-lg truncate">Campus Hub</span>}
        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="ml-auto p-1 rounded hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="app-shell-scroll flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {NAV_ITEMS.map(renderLink)}

        {isSuperAdmin && (
          <>
            <div
              className={`mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/40 ${
                !expanded ? "text-center" : ""
              }`}
            >
              {expanded ? "Super Admin" : "•"}
            </div>
            {SUPER_ADMIN_NAV_ITEMS.map(renderLink)}
          </>
        )}

        {/* Sub-admin domain pages will go here once built — each
            sub-admin should only see their own domain's admin link,
            e.g. equipment_admin sees only an "Equipment Admin" link
            pointing at /equipment/admin, etc. */}
      </nav>
    </aside>
  );
}