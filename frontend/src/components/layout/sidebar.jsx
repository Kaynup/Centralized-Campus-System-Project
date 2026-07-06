import { NavLink, useLocation } from "react-router-dom";
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
  Calendar,
  ClipboardList,
  User,
  ClipboardCheck,
  FileClock,
  UserPlus,
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

// WIRED IN (was previously defined but unused). Rendered as an
// indented sub-list under "Marketplace" whenever the active route is
// under /marketplace — same pattern now used for Facility below.
const MARKETPLACE_ITEMS = [
  { to: "/marketplace", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/marketplace/browse", label: "Browse", icon: Store },
  { to: "/marketplace/list-item", label: "List Item", icon: ClipboardList },
  { to: "/marketplace/my-listings", label: "My Listings", icon: ClipboardList },
  { to: "/marketplace/purchases", label: "Purchases", icon: Inbox },
];

// Routes confirmed from StudentDashboard.jsx's own navigate() calls.
const EQUIPMENT_ITEMS = [
  { to: "/equipment", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/equipment/inventory", label: "Browse Equipment", icon: Wrench },
  { to: "/equipment/rentals", label: "My Rentals", icon: ClipboardList },
];

// Migrated from Facility's own Sidebar.jsx, which used to render a
// second, competing fixed-position sidebar. Paths corrected to include
// the /facility prefix — the original had /admin/logs and
// /admin/users/upload without it, pointing outside this module entirely.
const FACILITY_ITEMS = [
  { to: "/facility/calendar", label: "Calendar", icon: Calendar },
  { to: "/facility/reservations", label: "My Reservations", icon: ClipboardList },
  { to: "/facility/profile", label: "Profile", icon: User },
];

const FACILITY_ADMIN_ITEMS = [
  { to: "/facility/admin/approvals", label: "Approvals", icon: ClipboardCheck },
  { to: "/facility/admin/logs", label: "System Logs", icon: FileClock },
  { to: "/facility/admin/users/upload", label: "User Entries", icon: UserPlus },
];

export default function Sidebar({ isCollapsed, isMobile, isMobileOpen, onCloseMobile }) {
  const { user } = useAuth();
  const location = useLocation();
  const expanded = isMobile ? true : !isCollapsed;

  const isSuperAdmin = user?.accountType === "admin" && user?.role === "super_admin";
  // Matches the SCHEMA NOTE convention above (domain-scoped sub-admin
  // roles) rather than Facility's old generic `role === 'admin'` check,
  // which predates that convention being established.
  const isFacilityAdmin = isSuperAdmin || user?.role === "facility_admin";

  const isOnFacility = location.pathname.startsWith("/facility");
  const isOnMarketplace = location.pathname.startsWith("/marketplace");
  const isOnEquipment = location.pathname.startsWith("/equipment");

  const baseClasses =
    "flex flex-col bg-slate text-white shrink-0 transition-all duration-200 ease-in-out";

  const mobileClasses = isMobile
    ? `fixed inset-y-0 left-0 z-40 w-64 transform ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`
    : `relative ${isCollapsed ? "w-[72px]" : "w-64"}`;

  function renderLink({ to, label, icon: Icon, end }, { indented = false } = {}) {
    return (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={isMobile ? onCloseMobile : undefined}
        title={!expanded ? label : undefined}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors ${
            indented ? "pl-9 pr-3" : "px-3 py-2.5"
          } ${
            isActive
              ? "bg-forest text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          } ${!expanded ? "justify-center" : ""}`
        }
      >
        <Icon className={indented ? "w-4 h-4 shrink-0" : "w-5 h-5 shrink-0"} />
        {expanded && <span className="truncate">{label}</span>}
      </NavLink>
    );
  }

  function renderSubsection(items) {
    if (!expanded) return null; // sub-items only make sense expanded — collapsed shows just the parent icon
    return <div className="ml-1 mt-1 space-y-1 border-l border-white/10">{items.map((item) => renderLink(item, { indented: true }))}</div>;
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
        {NAV_ITEMS.map((item) => (
          <div key={item.to}>
            {renderLink(item)}
            {item.to === "/facility" && isOnFacility && renderSubsection(FACILITY_ITEMS)}
            {item.to === "/facility" && isOnFacility && isFacilityAdmin && (
              <>
                {expanded && (
                  <div className="ml-9 mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    Admin
                  </div>
                )}
                {renderSubsection(FACILITY_ADMIN_ITEMS)}
              </>
            )}
            {item.to === "/marketplace" && isOnMarketplace && renderSubsection(MARKETPLACE_ITEMS)}
            {item.to === "/equipment" && isOnEquipment && renderSubsection(EQUIPMENT_ITEMS)}
          </div>
        ))}

        {isSuperAdmin && (
          <>
            <div
              className={`mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/40 ${
                !expanded ? "text-center" : ""
              }`}
            >
              {expanded ? "Super Admin" : "•"}
            </div>
            {SUPER_ADMIN_NAV_ITEMS.map((item) => renderLink(item))}
          </>
        )}
      </nav>
    </aside>
  );
}