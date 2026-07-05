import { useState } from "react";
import { Lock, Bell, Moon, Sun, Save } from "lucide-react";
import { useNotification } from "../shared/hooks/useNotification";
import { useTheme } from "../shared/context/ThemeContext";
import { parseApiError } from "../shared/utils/parseApiError";

/**
 * Settings.jsx
 * ------------------------------------------------------------------
 * App/account-level preferences, separate from Profile (which owns
 * personal info like name/email/department/phone).
 *
 * MOCK MODE — no real endpoints yet:
 *   - Change password  -> replace with axiosClient.post("/api/auth/change-password", {...})
 *   - Notifications     -> replace with axiosClient.patch("/api/settings/notifications", {...})
 *   - Theme              -> real, backed by ThemeContext (persists to localStorage,
 *                            applies data-theme="dark" on <html> app-wide)
 *
 * NOTE on styling:
 * Card/page backgrounds use inline style={{ backgroundColor: "var(--color-surface)" }}
 * / "var(--color-bg)" instead of bg-white, so they respond to the dark/light
 * theme variables defined in styles/style.css. Text colors keep using the
 * existing text-slate utility classes since --color-slate already matches
 * the light-mode text color; only surfaces needed the variable treatment.
 * ------------------------------------------------------------------
 */

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <p className="text-sm font-medium text-slate">{label}</p>
        {description && <p className="text-xs text-slate/50">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          backgroundColor: checked ? "#1f6b4a" : "#d1d5db",
        }}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
      >
        <span
          style={{
            transform: checked ? "translateX(22px)" : "translateX(2px)",
          }}
          className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const { notify } = useNotification();
  const { isDarkMode, toggleTheme } = useTheme();

  // --- Password ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // --- Notifications ---
  const [bookingUpdates, setBookingUpdates] = useState(true);
  const [marketplaceMessages, setMarketplaceMessages] = useState(true);
  const [walletActivity, setWalletActivity] = useState(false);

  async function handleChangePassword(event) {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      notify.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.error("New password and confirmation don't match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      // MOCK — replace with axiosClient.post("/api/auth/change-password", {
      //   currentPassword, newPassword,
      // })
      await new Promise((resolve) => setTimeout(resolve, 500));
      notify.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setIsSavingPassword(false);
    }
  }

  function handleToggleTheme() {
    toggleTheme();
    notify.info(!isDarkMode ? "Dark mode enabled." : "Light mode enabled.");
  }

  const cardStyle = {
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text)",
  };

  return (
    <div
      className="min-h-screen px-6 py-10 sm:px-10 transition-colors"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="mx-auto max-w-2xl">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate">Settings</h1>
          <p className="mt-1 text-sm text-slate/60">
            Manage how your account behaves across Campus Hub.
          </p>
        </div>

        {/* Change password */}
        <form
          onSubmit={handleChangePassword}
          className="mb-6 rounded-2xl border border-slate/10 p-6 shadow-sm transition-colors"
          style={cardStyle}
        >
          <div className="mb-5 flex items-center gap-2">
            <Lock className="h-4 w-4 text-forest" />
            <h2 className="text-base font-semibold text-slate">Change password</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-slate">
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="block w-full rounded-lg border border-slate/20 px-3 py-2.5 text-sm text-slate outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-slate">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate/20 px-3 py-2.5 text-sm text-slate outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate/20 px-3 py-2.5 text-sm text-slate outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-slate/10 pt-5">
            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSavingPassword ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>

        {/* Notifications */}
        <div
          className="mb-6 rounded-2xl border border-slate/10 p-6 shadow-sm transition-colors"
          style={cardStyle}
        >
          <div className="mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-forest" />
            <h2 className="text-base font-semibold text-slate">Notifications</h2>
          </div>
          <p className="mb-2 text-sm text-slate/50">Choose what you get notified about.</p>

          <div className="divide-y divide-slate/10">
            <ToggleRow
              label="Facility booking updates"
              description="Approvals, rejections, and reminders for your reservations."
              checked={bookingUpdates}
              onChange={setBookingUpdates}
            />
            <ToggleRow
              label="Marketplace messages"
              description="New messages from buyers or sellers."
              checked={marketplaceMessages}
              onChange={setMarketplaceMessages}
            />
            <ToggleRow
              label="Wallet activity"
              description="Balance changes and transaction receipts."
              checked={walletActivity}
              onChange={setWalletActivity}
            />
          </div>
        </div>

        {/* Appearance */}
        <div
          className="rounded-2xl border border-slate/10 p-6 shadow-sm transition-colors"
          style={cardStyle}
        >
          <div className="mb-2 flex items-center gap-2">
            {isDarkMode ? (
              <Moon className="h-4 w-4 text-forest" />
            ) : (
              <Sun className="h-4 w-4 text-forest" />
            )}
            <h2 className="text-base font-semibold text-slate">Appearance</h2>
          </div>

          <ToggleRow
            label="Dark mode"
            description="Switch the interface to a darker color scheme."
            checked={isDarkMode}
            onChange={handleToggleTheme}
          />
        </div>
      </div>
    </div>
  );
}