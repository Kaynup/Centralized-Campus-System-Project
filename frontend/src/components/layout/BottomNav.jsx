import { NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { NAV_ITEMS } from "./sidebar";

const TAB_ITEMS = NAV_ITEMS.slice(0, 4);

export default function BottomNav({ onOpenMore }) {
  return (
    <nav
      className="app-shell-scroll fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-white border-t border-slate/10 h-16 md:hidden"
      aria-label="Primary"
    >
      {TAB_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? "text-forest" : "text-slate/60"
            }`
          }
        >
          <Icon className="w-5 h-5" />
          {label}
        </NavLink>
      ))}

      <button
        onClick={onOpenMore}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate/60"
        aria-label="More options"
      >
        <Menu className="w-5 h-5" />
        More
      </button>
    </nav>
  );
}