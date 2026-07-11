import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Wallet as WalletIcon,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../shared/hooks/useAuth";
import { useWallet } from "../../shared/hooks/useWallet";
import NotificationBell from "../../shared/notifications/NotificationBell";

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { balance } = useWallet();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <header
      className="flex items-center h-16 px-4 md:px-6 border-b border-slate/10 shrink-0 transition-colors"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-slate/5 text-slate"
        aria-label="Toggle navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2 md:gap-4">
        {user?.accountType !== "admin" && (
          <button
            onClick={() => navigate("/wallet")}
            className="hidden sm:flex items-center gap-1.5 rounded-full bg-forest/10 text-forest px-3 py-1.5 text-sm font-medium hover:bg-forest/15 transition-colors"
          >
            <WalletIcon className="w-4 h-4" />
            {balance?.toFixed(2) ?? "0.00"} tokens
          </button>
        )}

        <NotificationBell />

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-slate/5"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
          >
            <span className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center text-xs font-semibold">
              {initials}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate transition-transform ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-lg shadow-lg border border-slate/10 py-1 z-50 transition-colors"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <div className="px-3 py-2 border-b border-slate/10">
                <p className="text-sm font-medium text-slate truncate">
                  {user?.name ?? "Guest"}
                </p>
                <p className="text-xs text-slate/60 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate("/profile");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate hover:bg-slate/5"
              >
                <User className="w-4 h-4" /> Profile
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate("/settings");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate hover:bg-slate/5"
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}