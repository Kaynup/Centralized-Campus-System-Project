import { useState, useEffect, useMemo } from "react";
import { Search, Users, RefreshCw } from "lucide-react";
import { useNotification } from "../shared/hooks/useNotification";
import { parseApiError } from "../shared/utils/parseApiError";
import { getStudents } from "../shared/api/adminApi";

/**
 * AdminManageStudents.jsx
 * ------------------------------------------------------------------
 * Admin-only page listing every student registered so far (via the
 * CSV upload flow on AdminUserUpload.jsx). Read-only for now — just
 * confirms registration actually "stuck" and gives admin a way to
 * find a specific student.
 *
 * SCHEMA NOTE: uses `full_name`/`login_id` to match the real `users`
 * table (per shared_tables.md).
 *
 * MOCK MODE — backed by the in-memory MOCK_STUDENTS array in
 * shared/api/adminApi.js, so this list only persists for the current
 * browser session (resets on full page reload) until a real backend
 * and GET /api/admin/students endpoint exist.
 * ------------------------------------------------------------------
 */
export default function AdminManageStudents() {
  const { notify } = useNotification();
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadStudents() {
    setIsLoading(true);
    try {
      const { students: fetched } = await getStudents();
      setStudents(fetched);
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.login_id.toLowerCase().includes(term) ||
        (s.department || "").toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  return (
    <div
      className="min-h-screen px-6 py-10 sm:px-10 transition-colors"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="mx-auto max-w-4xl">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate">Manage students</h1>
            <p className="mt-1 text-sm text-slate/60">
              Everyone registered so far through the CSV upload.
            </p>
          </div>
          <button
            type="button"
            onClick={loadStudents}
            disabled={isLoading}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate/20 px-3 py-2 text-sm font-medium text-slate transition hover:bg-slate/5 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, login ID, or department…"
            className="block w-full rounded-lg border border-slate/20 bg-white py-2.5 pl-10 pr-3 text-sm text-slate outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20"
          />
        </div>

        {/* Table */}
        <div
          className="overflow-hidden rounded-2xl border border-slate/10 shadow-sm transition-colors"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate/50">
              Loading students…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <Users className="h-8 w-8 text-slate/20" />
              <p className="text-sm text-slate/50">
                {students.length === 0
                  ? "No students registered yet. Upload a CSV from Register students."
                  : "No students match your search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate/40">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Login ID</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Department</th>
                    <th className="px-6 py-3 font-medium">Phone</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate/10">
                  {filtered.map((student) => (
                    <tr key={student.id} className="text-slate">
                      <td className="px-6 py-3 font-medium">{student.full_name}</td>
                      <td className="px-6 py-3 font-mono text-xs text-slate/70">
                        {student.login_id}
                      </td>
                      <td className="px-6 py-3 text-slate/70">{student.email}</td>
                      <td className="px-6 py-3 text-slate/70">
                        {student.department || "—"}
                      </td>
                      <td className="px-6 py-3 text-slate/70">{student.phone || "—"}</td>
                      <td className="px-6 py-3 capitalize text-slate/70">{student.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-slate/40">
          {students.length} student{students.length === 1 ? "" : "s"} total
          (this session only — resets on full reload until a real backend exists).
        </p>
      </div>
    </div>
  );
}