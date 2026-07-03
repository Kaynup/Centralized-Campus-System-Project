import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wrench,
  Building2,
  Store,
  Wallet,
  Settings,
  X,
  GraduationCap,
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/equipment", label: "Equipment", icon: Wrench },
  { to: "/facility", label: "Facilities", icon: Building2 },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ isCollapsed, isMobile, isMobileOpen, onCloseMobile }) {
  const expanded = isMobile ? true : !isCollapsed;

  const baseClasses =
    "flex flex-col bg-slate text-white shrink-0 transition-all duration-200 ease-in-out";

  const mobileClasses = isMobile
    ? `fixed inset-y-0 left-0 z-40 w-64 transform ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`
    : `relative ${isCollapsed ? "w-[72px]" : "w-64"}`;

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
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
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
        ))}
      </nav>
    </aside>
  );
}