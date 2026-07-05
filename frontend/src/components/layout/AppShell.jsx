import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import "./AppShell.css";

const MOBILE_BREAKPOINT = 768;

export default function AppShell() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar_collapsed") === "true";
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("sidebar_collapsed", String(next));
        return next;
      });
    }
  };

  const closeMobileSidebar = () => setIsMobileOpen(false);

  return (
    <div
      className="flex h-screen overflow-hidden transition-colors"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <Sidebar
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        isMobileOpen={isMobileOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {isMobile && isMobileOpen && (
        <div
          className="app-shell-backdrop fixed inset-0 z-30 bg-slate/50"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <Navbar onToggleSidebar={toggleSidebar} />
        <main className="app-shell-scroll flex-1 overflow-y-auto px-4 pt-4 pb-20 md:p-6">
          <Outlet />
        </main>
        <BottomNav onOpenMore={toggleSidebar} />
      </div>
    </div>
  );
}