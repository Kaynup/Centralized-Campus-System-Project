import { useNavigate } from "react-router-dom";
import { Package, Building2, Store, ArrowRight, Wallet as WalletIcon } from "lucide-react";
import { useAuth } from "../shared/hooks/useAuth";
import { useWallet } from "../shared/hooks/useWallet";

const MODULE_LINKS = [
  {
    to: "/equipment",
    icon: Package,
    title: "Equipment Rental",
    description: "Browse and reserve lab and department equipment.",
  },
  {
    to: "/facility",
    icon: Building2,
    title: "Facility Reservation",
    description: "Book rooms and campus spaces.",
  },
  {
    to: "/marketplace",
    icon: Store,
    title: "Secure Marketplace",
    description: "Buy and sell within the campus community.",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { balance, isLoading } = useWallet();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-forest">
        Centralized Campus System
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate">
        {user?.name ? `Welcome back, ${user.name}` : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-slate/60">
        Here's where you left off across your campus services.
      </p>

      {/* Wallet summary */}
      {user?.accountType !== "admin" && (
        <div className="mt-8 flex items-center justify-between rounded-xl border border-slate/10 bg-slate px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15">
              <WalletIcon className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/50">Wallet balance</p>
              <p className="text-xl font-semibold">
                {isLoading ? "Loading…" : `${balance.toLocaleString()} tokens`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/wallet")}
            className="flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold/80"
          >
            View wallet
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Module entry points */}
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {MODULE_LINKS.map(({ to, icon: Icon, title, description }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className="group flex flex-col items-start gap-3 rounded-xl border border-slate/10 p-5 text-left transition hover:border-forest/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest/10">
              <Icon className="h-5 w-5 text-forest" />
            </div>
            <div>
              <p className="font-semibold text-slate">{title}</p>
              <p className="mt-1 text-sm text-slate/60">{description}</p>
            </div>
            <span className="mt-auto flex items-center gap-1 text-sm font-medium text-forest opacity-0 transition group-hover:opacity-100">
              Open
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}