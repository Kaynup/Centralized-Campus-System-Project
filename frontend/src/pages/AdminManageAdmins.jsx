import { useState, useEffect } from "react";
import {
  UserPlus,
  ShieldCheck,
  Ban,
  RotateCcw,
  KeyRound,
  Repeat,
  X,
} from "lucide-react";
import { useNotification } from "../shared/hooks/useNotification";
import { parseApiError } from "../shared/utils/parseApiError";
import {
  createSubAdmin,
  getSubAdmins,
  deactivateSubAdmin,
  reactivateSubAdmin,
  reassignSubAdminDomain,
  resetSubAdminPassword,
} from "../shared/api/adminApi";

/**
 * AdminManageAdmins.jsx
 * ------------------------------------------------------------------
 * Super-Admin-only page. Manages the 3 sub-admin accounts (one per
 * domain: Equipment, Facility, Marketplace).
 *
 * Covers the 5 core capabilities:
 *   1. Create a sub-admin (name, email, domain)
 *   2. View all sub-admins
 *   3. Deactivate / reactivate
 *   4. Reassign domain
 *   5. Reset password
 *
 * MOCK MODE — see shared/api/adminApi.js for backend contract.
 * ------------------------------------------------------------------
 */

const DOMAIN_OPTIONS = [
  { value: "equipment", label: "Equipment Rental" },
  { value: "facility", label: "Facility Reservation" },
  { value: "marketplace", label: "Marketplace" },
];

function domainLabel(value) {
  return DOMAIN_OPTIONS.find((d) => d.value === value)?.label || value;
}

function ReassignDomainDialog({ subAdmin, onClose, onReassigned }) {
  const { notify } = useNotification();
  const [domain, setDomain] = useState(subAdmin.domain);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await reassignSubAdminDomain(subAdmin.id, domain);
      notify.success(`${subAdmin.name} reassigned to ${domainLabel(domain)}.`);
      onReassigned();
      onClose();
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate/40 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate/10 p-6 shadow-lg transition-colors"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate">Reassign domain</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate/50 hover:bg-slate/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate/60">{subAdmin.name}</p>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="mb-5 block w-full rounded-lg border border-slate/20 px-3 py-2.5 text-sm text-slate outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
        >
          {DOMAIN_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate/60 hover:bg-slate/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || domain === subAdmin.domain}
            className="rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminManageAdmins() {
  const { notify } = useNotification();
  const [subAdmins, setSubAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [reassigning, setReassigning] = useState(null);

  // Create form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState(DOMAIN_OPTIONS[0].value);
  const [isCreating, setIsCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  async function loadSubAdmins() {
    setIsLoading(true);
    try {
      const { subAdmins: fetched } = await getSubAdmins();
      setSubAdmins(fetched);
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSubAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      notify.error("Please enter a name and email.");
      return;
    }

    setIsCreating(true);
    try {
      const { subAdmin } = await createSubAdmin({
        full_name: fullName.trim(),
        email: email.trim(),
        domain,
      });
      notify.success(`${subAdmin.name} created as ${domainLabel(domain)} admin.`);
      setLastCreated(subAdmin);
      setFullName("");
      setEmail("");
      await loadSubAdmins();
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(admin) {
    setProcessingId(admin.id);
    try {
      if (admin.is_active) {
        await deactivateSubAdmin(admin.id);
        notify.info(`${admin.name} deactivated.`);
      } else {
        await reactivateSubAdmin(admin.id);
        notify.success(`${admin.name} reactivated.`);
      }
      await loadSubAdmins();
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleResetPassword(admin) {
    setProcessingId(admin.id);
    try {
      const { tempPassword } = await resetSubAdminPassword(admin.id);
      notify.success(`New temp password for ${admin.name}: ${tempPassword}`);
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div
      className="min-h-screen px-6 py-10 sm:px-10 transition-colors"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate">Manage admins</h1>
          <p className="mt-1 text-sm text-slate/60">
            Create and manage sub-admin accounts for Equipment, Facility, and
            Marketplace.
          </p>
        </div>

        {/* Create sub-admin */}
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-2xl border border-slate/10 p-6 shadow-sm transition-colors"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-forest" />
            <h2 className="text-base font-semibold text-slate">Add sub-admin</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate">Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full rounded-lg border border-slate/20 px-3 py-2.5 text-sm text-slate outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-slate/20 px-3 py-2.5 text-sm text-slate outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                placeholder="admin@campus.edu"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate">Domain</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="block w-full rounded-lg border border-slate/20 px-3 py-2.5 text-sm text-slate outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
              >
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end border-t border-slate/10 pt-5">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {isCreating ? "Creating…" : "Create sub-admin"}
            </button>
          </div>

          {lastCreated && (
            <div className="mt-4 rounded-lg bg-forest/5 px-4 py-3 text-xs text-slate/70">
              <p className="font-medium text-slate">
                {lastCreated.name} — login ID: <code>{lastCreated.admin_id}</code>
              </p>
              <p className="mt-0.5">
                Temp password: <code>{lastCreated.tempPassword}</code> (shown once —
                sent by email in the real system)
              </p>
            </div>
          )}
        </form>

        {/* Sub-admin list */}
        <div
          className="overflow-hidden rounded-2xl border border-slate/10 shadow-sm transition-colors"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          {isLoading ? (
            <div className="p-10 text-center text-sm text-slate/50">Loading…</div>
          ) : subAdmins.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate/50">
              No sub-admins yet. Create one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate/40">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Login ID</th>
                    <th className="px-6 py-3 font-medium">Domain</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate/10">
                  {subAdmins.map((admin) => (
                    <tr key={admin.id} className="text-slate">
                      <td className="px-6 py-3 font-medium">{admin.name}</td>
                      <td className="px-6 py-3 font-mono text-xs text-slate/70">
                        {admin.admin_id}
                      </td>
                      <td className="px-6 py-3 text-slate/70">
                        {domainLabel(admin.domain)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            admin.is_active
                              ? "bg-forest/10 text-forest"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {admin.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            title="Reassign domain"
                            onClick={() => setReassigning(admin)}
                            className="rounded-lg p-1.5 text-slate/50 transition hover:bg-slate/5 hover:text-slate"
                          >
                            <Repeat className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Reset password"
                            onClick={() => handleResetPassword(admin)}
                            disabled={processingId === admin.id}
                            className="rounded-lg p-1.5 text-slate/50 transition hover:bg-slate/5 hover:text-slate disabled:opacity-50"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title={admin.is_active ? "Deactivate" : "Reactivate"}
                            onClick={() => handleToggleActive(admin)}
                            disabled={processingId === admin.id}
                            className={`rounded-lg p-1.5 transition disabled:opacity-50 ${
                              admin.is_active
                                ? "text-red-500 hover:bg-red-50"
                                : "text-forest hover:bg-forest/5"
                            }`}
                          >
                            {admin.is_active ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {reassigning && (
        <ReassignDomainDialog
          subAdmin={reassigning}
          onClose={() => setReassigning(null)}
          onReassigned={loadSubAdmins}
        />
      )}
    </div>
  );
}