import { useState } from "react";
import { User, Mail, Building2, Phone, LogOut, Save } from "lucide-react";
import { useAuth } from "../shared/hooks/useAuth";
import { useNotification } from "../shared/hooks/useNotification";
import { parseApiError } from "../shared/utils/parseApiError";

/**
 * Profile.jsx
 * ------------------------------------------------------------------
 * Reads directly from AuthContext (`user`) — no other module's work
 * blocks this from being useful today. The "save" flow is mocked
 * (there's no PATCH /api/profile endpoint yet) but demonstrates the
 * intended error-handling pattern: catch, parseApiError, notify.
 * ------------------------------------------------------------------
 */

function getInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function FormField({ id, label, icon: Icon, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/40" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="block w-full rounded-lg border border-slate/20 bg-white py-2.5 pl-10 pr-3 text-sm text-slate outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
        />
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { notify } = useNotification();

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    displayName !== (user?.name || "") ||
    email !== (user?.email || "") ||
    department !== (user?.department || "") ||
    phone !== (user?.phone || "");

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      // MOCK — replace with axiosClient.patch("/api/profile", {
      //   name: displayName, email, department, phone,
      // })
      await new Promise((resolve) => setTimeout(resolve, 500));
      notify.success("Profile updated.");
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    notify.info("You've been signed out.");
  }

  return (
    <div className="min-h-screen bg-slate/[0.03] px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-2xl">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate">Your profile</h1>
          <p className="mt-1 text-sm text-slate/60">
            Manage the details tied to your campus account.
          </p>
        </div>

        {/* Identity card */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate/10 bg-white p-6 shadow-sm">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-forest text-lg font-semibold text-white">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate">{user?.name || "—"}</p>
            <span className="mt-1 inline-flex items-center rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium capitalize text-slate">
              {user?.role || "—"}
            </span>
          </div>
        </div>

        {/* Editable details card */}
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-slate/10 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-1 text-base font-semibold text-slate">Personal information</h2>
          <p className="mb-5 text-sm text-slate/50">
            This information may be visible to campus staff.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField
                id="displayName"
                label="Display name"
                icon={User}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <FormField
              id="email"
              label="Email"
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@campus.edu"
            />

            <FormField
              id="phone"
              label="Phone number"
              icon={Phone}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 00000"
            />

            <div className="sm:col-span-2">
              <FormField
                id="department"
                label="Department"
                icon={Building2}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate/10 pt-5">
            <span className="text-xs text-slate/40">
              {hasChanges ? "You have unsaved changes" : "All changes saved"}
            </span>
            <button
              type="submit"
              disabled={isSaving || !hasChanges}
              className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

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
    </div>
  );
}