import { useState } from "react";
import { User, LogOut } from "lucide-react";
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
export default function Profile() {
  const { user, logout } = useAuth();
  const { notify } = useNotification();

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      // MOCK — replace with axiosClient.patch("/api/profile", { name: displayName })
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
    <div className="min-h-screen bg-white px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-slate">Your profile</h1>
        <p className="mt-1 text-sm text-slate/60">
          Manage the details tied to your campus account.
        </p>

        <div className="mt-8 flex items-center gap-4 rounded-xl border border-slate/10 p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest/10">
            <User className="h-6 w-6 text-forest" />
          </div>
          <div>
            <p className="font-semibold text-slate">{user?.name || "—"}</p>
            <p className="text-sm capitalize text-slate/60">{user?.role || "—"}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1.5 block w-full rounded-md border border-slate/20 px-3 py-2.5 text-slate outline-none transition focus:border-forest focus:ring-1 focus:ring-forest"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest/90 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}