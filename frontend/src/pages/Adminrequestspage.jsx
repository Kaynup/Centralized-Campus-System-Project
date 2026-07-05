import { useState, useEffect } from "react";
import { Check, X, Inbox, Clock } from "lucide-react";
import { useNotification } from "../shared/hooks/useNotification";
import { parseApiError } from "../shared/utils/parseApiError";
import {
  getChangeRequests,
  approveChangeRequest,
  rejectChangeRequest,
} from "../shared/api/adminApi";

const FIELD_LABELS = {
  name: "Display name",
  email: "Email",
  department: "Department",
  phone: "Phone number",
};

function StatusPill({ status }) {
  const styles = {
    pending: "bg-gold/15 text-slate",
    approved: "bg-forest/10 text-forest",
    rejected: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function AdminRequestsPage() {
  const { notify } = useNotification();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  async function loadRequests() {
    setIsLoading(true);
    try {
      const { requests: fetched } = await getChangeRequests();
      setRequests(fetched);
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApprove(id) {
    setProcessingId(id);
    try {
      await approveChangeRequest(id);
      notify.success("Request approved and applied.");
      await loadRequests();
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id) {
    setProcessingId(id);
    try {
      await rejectChangeRequest(id);
      notify.info("Request rejected.");
      await loadRequests();
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setProcessingId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div
      className="min-h-screen px-6 py-10 sm:px-10 transition-colors"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate">Change requests</h1>
          <p className="mt-1 text-sm text-slate/60">
            Review and approve profile changes requested by students.
          </p>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate/50">Loading requests…</div>
        ) : requests.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate/10 p-10 text-center transition-colors"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <Inbox className="h-8 w-8 text-slate/20" />
            <p className="text-sm text-slate/50">No change requests yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending */}
            {pending.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate">
                  <Clock className="h-4 w-4 text-gold" />
                  Pending ({pending.length})
                </h2>
                <div className="space-y-3">
                  {pending.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-2xl border border-slate/10 p-5 shadow-sm transition-colors"
                      style={{ backgroundColor: "var(--color-surface)" }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate">{req.userName}</p>
                          <p className="text-xs text-slate/50">
                            wants to change {FIELD_LABELS[req.field] || req.field}
                          </p>
                        </div>
                        <StatusPill status={req.status} />
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate/40">Current</p>
                          <p className="text-slate/70">{req.currentValue || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate/40">Requested</p>
                          <p className="font-medium text-slate">{req.requestedValue}</p>
                        </div>
                      </div>

                      {req.reason && (
                        <p className="mb-4 rounded-lg bg-slate/5 px-3 py-2 text-xs text-slate/60">
                          "{req.reason}"
                        </p>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(req.id)}
                          disabled={processingId === req.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(req.id)}
                          disabled={processingId === req.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-forest/90 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolved */}
            {resolved.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold text-slate">History</h2>
                <div
                  className="overflow-hidden rounded-2xl border border-slate/10 shadow-sm transition-colors"
                  style={{ backgroundColor: "var(--color-surface)" }}
                >
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-slate/40">
                        <th className="px-5 py-2.5 font-medium">Student</th>
                        <th className="px-5 py-2.5 font-medium">Field</th>
                        <th className="px-5 py-2.5 font-medium">Requested</th>
                        <th className="px-5 py-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate/10">
                      {resolved.map((req) => (
                        <tr key={req.id} className="text-slate">
                          <td className="px-5 py-2.5">{req.userName}</td>
                          <td className="px-5 py-2.5 text-slate/70">
                            {FIELD_LABELS[req.field] || req.field}
                          </td>
                          <td className="px-5 py-2.5 text-slate/70">{req.requestedValue}</td>
                          <td className="px-5 py-2.5">
                            <StatusPill status={req.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}