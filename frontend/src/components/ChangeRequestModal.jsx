import { useState } from "react";
import { X, Send } from "lucide-react";
import { useNotification } from "../shared/hooks/useNotification";
import { parseApiError } from "../shared/utils/parseApiError";
import { submitChangeRequest } from "../shared/api/adminApi";

/**
 * ChangeRequestModal.jsx
 * ------------------------------------------------------------------
 * Self-contained overlay (no dependency on shared/ui/Modal.jsx, to
 * avoid guessing an unseen API) — used from Profile.jsx. Lets a
 * student pick a field, enter the value they want instead, and a
 * short reason, then submits it to the admin approval queue.
 *
 * SCHEMA NOTE: "Display name" maps to `full_name` on the real users
 * table (per shared_tables.md), not `name`. department/phone are
 * still flagged as missing from the schema — see adminApi.js.
 * ------------------------------------------------------------------
 */

const FIELD_OPTIONS = [
  { value: "full_name", label: "Display name" },
  { value: "email", label: "Email" },
  { value: "department", label: "Department" },
  { value: "phone", label: "Phone number" },
];

export default function ChangeRequestModal({ user, onClose, onSubmitted }) {
  const { notify } = useNotification();
  const [field, setField] = useState(FIELD_OPTIONS[0].value);
  const [requestedValue, setRequestedValue] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentValue = user?.[field] || "";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!requestedValue.trim()) {
      notify.error("Please enter the value you'd like changed to.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitChangeRequest({
        userId: user?.id,
        userName: user?.full_name,
        field,
        currentValue,
        requestedValue: requestedValue.trim(),
        reason: reason.trim(),
      });
      notify.success("Request sent to admin for approval.");
      onSubmitted?.();
      onClose();
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate/40 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate/10 p-6 shadow-lg transition-colors"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate">Request a change</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate/50 hover:bg-slate/5 hover:text-slate"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-5 text-sm text-slate/60">
          Profile details can only be updated by an admin. Submit a request and
          they'll review it.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="field" className="mb-1.5 block text-sm font-medium text-slate">
              Which field?
            </label>
            <select
              id="field"
              value={field}
              onChange={(e) => {
                setField(e.target.value);
                setRequestedValue("");
              }}
              className="block w-full rounded-lg border border-slate/20 px-3 py-2.5 text-sm text-slate outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate">Current value</p>
            <p className="rounded-lg bg-slate/5 px-3 py-2.5 text-sm text-slate/60">
              {currentValue || "—"}
            </p>
          </div>

          <div>
            <label htmlFor="requestedValue" className="mb-1.5 block text-sm font-medium text-slate">
              Requested value
            </label>
            <input
              id="requestedValue"
              type="text"
              value={requestedValue}
              onChange={(e) => setRequestedValue(e.target.value)}
              className="block w-full rounded-lg border border-slate/20 px-3 py-2.5 text-sm text-slate outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
              placeholder="What should it be instead?"
            />
          </div>

          <div>
            <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-slate">
              Reason <span className="font-normal text-slate/40">(optional)</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="block w-full resize-none rounded-lg border border-slate/20 px-3 py-2.5 text-sm text-slate outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
              placeholder="e.g. Legal name change, typo correction…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate/60 transition hover:bg-slate/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}