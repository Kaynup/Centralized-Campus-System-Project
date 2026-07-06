/**
 * SettingsPage — /settings
 *
 * Three sections: Account, Notifications preferences, Appearance (theme toggle).
 * Notification toggles are local state only — no API wiring needed until
 * a user-preferences endpoint is available.
 */

import { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import SettingsSection from '../components/settings/SettingsSection';
import ThemeToggle from '../components/settings/ThemeToggle';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useNotification } from '../../../shared/hooks/useNotification';
import * as authApi from '../api/authApi';

const ROLE_LABEL = { admin: 'Admin', professor: 'Professor', student: 'Student' };
const ROLE_COLOR = { admin: '#f4a861', professor: '#b48be8', student: '#60a5fa' };

function SettingsRow({ label, description, children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 22px',
        borderBottom: '1px solid var(--color-border)',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: '160px' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({ id, checked, onChange, disabled }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        position: 'relative',
        width: '44px',
        height: '24px',
        borderRadius: '999px',
        border: '1px solid var(--color-border)',
        background: checked ? 'var(--color-available)' : 'var(--color-surface-subtle)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '22px' : '3px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'left 0.2s ease',
        }}
      />
    </button>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 22px',
        borderBottom: '1px solid var(--color-border)',
        gap: '12px',
      }}
    >
      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: accent || 'var(--color-text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const [prefs, setPrefs] = useState({
    prefEmailNotifications: user?.prefEmailNotifications ?? true,
    prefInappNotifications: user?.prefInappNotifications ?? true,
    prefBookingReminders:   user?.prefBookingReminders ?? true,
  });

  const { notify } = useNotification();

  const setPref = (key) => async (val) => {
    // Optimistic update
    setPrefs((p) => ({ ...p, [key]: val }));
    try {
      await authApi.updatePreferences({ [key]: val });
      notify.success('Preference saved.');
    } catch (err) {
      console.error('Failed to save preference:', err);
      notify.error('Failed to save preference.');
      // Revert on error
      setPrefs((p) => ({ ...p, [key]: !val }));
    }
  };

  return (
    <PageLayout currentUser={user}>
      <div
        style={{
          padding: '1.5rem 2rem',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-primary)',
          height: 'calc(100vh - var(--topbar-height))',
          overflowY: 'auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          maxWidth: '760px',
        }}
      >
        {/* Page title */}
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Settings
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Manage your account and application preferences.
          </p>
        </div>

        {/* ── Account ────────────────────────────────────────────────────── */}
        <SettingsSection title="Account" subtitle="Your identity and session.">
          <InfoRow
            label="Full Name"
            value={user?.fullName || user?.name || '—'}
          />
          <InfoRow
            label="Email"
            value={user?.email || '—'}
          />
          <InfoRow
            label="Role"
            value={ROLE_LABEL[user?.role] || user?.role || '—'}
            accent={ROLE_COLOR[user?.role] || undefined}
          />
          <InfoRow
            label="Token Balance"
            value={`${user?.tokenBalance ?? 0} tokens`}
            accent="#22c55e"
          />

          {/* Logout */}
          <div style={{ padding: '14px 22px' }}>
            <button
              id="settings-logout-btn"
              onClick={logout}
              style={{
                padding: '8px 22px',
                borderRadius: '8px',
                border: '1px solid var(--color-danger-border)',
                background: 'var(--color-danger-muted-bg)',
                color: 'var(--color-danger-text)',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-danger-muted-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-danger-muted-bg)'; }}
            >
              Sign Out
            </button>
          </div>
        </SettingsSection>

        {/* ── Notifications ──────────────────────────────────────────────── */}
        <SettingsSection
          title="Notifications"
          subtitle="Choose which updates you receive. Changes apply within this session."
        >
          <SettingsRow label="Email Notifications" description="Receive booking confirmations and updates via email.">
            <Toggle
              id="toggle-email-notifications"
              checked={prefs.prefEmailNotifications}
              onChange={setPref('prefEmailNotifications')}
            />
          </SettingsRow>
          <SettingsRow label="In-App Notifications" description="Show notifications inside the application.">
            <Toggle
              id="toggle-inapp-notifications"
              checked={prefs.prefInappNotifications}
              onChange={setPref('prefInappNotifications')}
            />
          </SettingsRow>
          <SettingsRow label="Booking Reminders" description="Get reminders before upcoming reservations.">
            <Toggle
              id="toggle-booking-reminders"
              checked={prefs.prefBookingReminders}
              onChange={setPref('prefBookingReminders')}
            />
          </SettingsRow>
        </SettingsSection>

        {/* ── Appearance ─────────────────────────────────────────────────── */}
        <SettingsSection
          title="Appearance"
          subtitle="Customize how the application looks."
        >
          <ThemeToggle />
          <div
            style={{
              padding: '12px 22px',
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
            }}
          >
            Theme preference is saved to your browser and persists across sessions.
          </div>
        </SettingsSection>
      </div>
    </PageLayout>
  );
}
