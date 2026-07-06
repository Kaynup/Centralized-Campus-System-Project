import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EquipmentsTable from "../components/EquipmentsTable";
import UsersTable from "../components/UsersTable";
import RentalsTable from "../components/RentalsTable";
import LateRentalsTable from "../components/LateRentalsTable";
import TransactionsTable from "../components/TransactionsTable";
import DashboardOverview from "./DashboardOverview";
import {
  LayoutDashboard,
  Users,
  Boxes,
  ClipboardList,
  AlertTriangle,
  CreditCard,
  LogOut,
} from "lucide-react";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: Users },
  { id: "equipments", label: "Equipments", icon: Boxes },
  { id: "rentals", label: "Rentals", icon: ClipboardList },
  { id: "lateRentals", label: "Late Rentals", icon: AlertTriangle },
  { id: "transactions", label: "Transactions", icon: CreditCard },
];

export default function Dashboard() {
  const [section, setSection] = useState("overview");
  const navigate = useNavigate();

  useEffect(() => {
    const admin = localStorage.getItem("admin");
    if (!admin) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("admin");
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-stone-50">


      {/* BODY */}
      <div className="flex">
        <aside className="hidden lg:flex w-64 shrink-0 bg-stone-950 border-r border-stone-800 shadow-2xl shadow-black/20 h-screen sticky top-0 flex-col">
          <div className="px-6 py-8 border-b border-stone-800">
            <h2 className="text-xl font-semibold text-white">
              Equipment Rental
            </h2>
            <p className="text-xs text-stone-400 mt-1">Admin Dashboard</p>
          </div>

          <nav className="flex flex-col gap-1 p-4 flex-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all ${
                    section === item.id
                      ? "bg-primary text-white shadow-lg scale-[1.02]"
                      : "text-stone-300 hover:bg-stone-800 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* LOGOUT */}
          <div className="p-4 border-t border-stone-800 mt-auto">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500 text-white py-3 text-sm font-medium hover:bg-red-600 transition"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-w-0 bg-stone-50">
          <div className="p-6 lg:p-10 space-y-6">
            {section === "overview" && <DashboardOverview />}
            {section === "students" && <UsersTable />}
            {section === "equipments" && <EquipmentsTable />}
            {section === "rentals" && <RentalsTable />}
            {section === "lateRentals" && <LateRentalsTable />}
            {section === "transactions" && <TransactionsTable />}
          </div>
        </main>
      </div>
    </div>
  );
}