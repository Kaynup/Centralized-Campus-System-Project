import { useState } from "react";
import { User, Mail, Building2, Phone, LogOut, Pencil } from "lucide-react";
import { useAuth } from "../shared/hooks/useAuth";
import { useNotification } from "../shared/hooks/useNotification";
import ChangeRequestModal from "../components/ChangeRequestModal";

/**
 * Profile.jsx
 * ------------------------------------------------------------------
 * Fields are READ-ONLY by design: per project requirements, students
 * cannot self-edit their profile — any change (name, email,
 * department, phone) must go through an admin-approved request
 * (see ChangeRequestModal.jsx + shared/api/adminApi.js).
 *
 * SCHEMA NOTE (per shared_tables.md):
 *   - Uses `full_name`, not `name`, to match the real `users` table.
 *   - `department` and `phone` do NOT exist in the current schema —
 *     flagged for the backend team to add as real columns before
 *     this can be wired up for real.
 * ------------------------------------------------------------------
 */

function getInitials(fullName) {
  if (!fullName) return "?";
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ReadOnlyField({ label, icon: Icon, value }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate">{label}</p>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/40" />
        <div className="block w-full rounded-lg border border-slate/10 bg-slate/5 py-2.5 pl-10 pr-3 text-sm text-slate/80">
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { notify } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function handleLogout() {
    await logout();
    notify.info("You've been signed out.");
  }

  return (
    <div
      className="min-h-screen px-6 py-10 sm:px-10 transition-colors"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="mx-auto max-w-2xl">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate">Your profile</h1>
          <p className="mt-1 text-sm text-slate/60">
            Manage the details tied to your campus account.
          </p>
        </div>

        {/* Identity card */}
        <div
          className="mb-6 flex items-center gap-4 rounded-2xl border border-slate/10 p-6 shadow-sm transition-colors"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-forest text-lg font-semibold text-white">
            {getInitials(user?.full_name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate">
              {user?.full_name || "—"}
            </p>
            <span className="mt-1 inline-flex items-center rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium capitalize text-slate">
              {user?.role || "—"}
            </span>
          </div>
        </div>

        {/* Read-only details card */}
        <div
          className="rounded-2xl border border-slate/10 p-6 shadow-sm transition-colors"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate">Personal information</h2>
              <p className="mt-0.5 text-sm text-slate/50">
                Only an admin can update these details.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ReadOnlyField label="Display name" icon={User} value={user?.full_name} />
            </div>
            <ReadOnlyField label="Email" icon={Mail} value={user?.email} />
            <ReadOnlyField label="Phone number" icon={Phone} value={user?.phone} />
            <div className="sm:col-span-2">
              <ReadOnlyField label="Department" icon={Building2} value={user?.department} />
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-slate/10 pt-5">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest/90"
            >
              <Pencil className="h-4 w-4" />
              Request changes
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-red-100 bg-red-50/50 p-5">
          <div>
            <p className="text-sm font-medium text-slate">Sign out</p>
            <p className="text-xs text-slate/50">End your session on this device.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>

      {isModalOpen && (
        <ChangeRequestModal user={user} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}