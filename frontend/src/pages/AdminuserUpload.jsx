import { useState } from "react";
import { UploadCloud, FileText, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { useNotification } from "../shared/hooks/useNotification";
import { parseApiError } from "../shared/utils/parseApiError";
import { bulkRegisterUsers, sendWelcomeEmail } from "../shared/api/adminapi";

/**
 * AdminUserUpload.jsx
 * ------------------------------------------------------------------
 * Admin-only page: upload a CSV of new users, preview the parsed
 * rows, register them (mocked), then trigger a mocked "welcome
 * email" per user containing their login ID + a temp password.
 *
 * Expected CSV format (header row required):
 *   full_name,email,department,phone,role
 *   Sample Student,student@campus.edu,Computer Science,9876500002,student
 *
 * `role` is optional — defaults to "student" if the column is
 * missing or blank for a row.
 *
 * SCHEMA NOTE: uses `full_name` to match the real `users` table
 * (per shared_tables.md). `department` and `phone` are NOT yet real
 * columns on that table — see shared/api/adminApi.js header comment.
 *
 * MOCK MODE — see shared/api/adminApi.js for the exact backend
 * contract this page expects once real endpoints exist.
 * ------------------------------------------------------------------
 */

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row.");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const requiredHeaders = ["full_name", "email"];
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    throw new Error(`CSV is missing required column(s): ${missing.join(", ")}`);
  }

  return lines.slice(1).map((line, index) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] || "";
    });

    if (!row.full_name || !row.email) {
      throw new Error(`Row ${index + 2} is missing a full_name or email.`);
    }

    return {
      full_name: row.full_name,
      email: row.email,
      department: row.department || "",
      phone: row.phone || "",
      role: row.role || "student",
    };
  });
}

export default function AdminUserUpload() {
  const { notify } = useNotification();

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [results, setResults] = useState(null); // [{ ...user, tempPassword, emailSent }]

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError("");
    setResults(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsedRows = parseCsv(String(reader.result));
        setRows(parsedRows);
      } catch (err) {
        setRows([]);
        setParseError(err.message || "Could not parse this CSV file.");
      }
    };
    reader.onerror = () => {
      setParseError("Could not read this file. Please try again.");
    };
    reader.readAsText(file);
  }

  async function handleRegister() {
    if (rows.length === 0) return;

    setIsRegistering(true);
    try {
      const { created } = await bulkRegisterUsers(rows);

      // Send a mocked welcome email per created user.
      const withEmailStatus = await Promise.all(
        created.map(async (user) => {
          try {
            await sendWelcomeEmail(user);
            return { ...user, emailSent: true };
          } catch {
            return { ...user, emailSent: false };
          }
        })
      );

      setResults(withEmailStatus);
      notify.success(`${withEmailStatus.length} user(s) registered.`);
    } catch (err) {
      const { message } = parseApiError(err);
      notify.error(message);
    } finally {
      setIsRegistering(false);
    }
  }

  function handleReset() {
    setFileName("");
    setRows([]);
    setParseError("");
    setResults(null);
  }

  return (
    <div
      className="min-h-screen px-6 py-10 sm:px-10 transition-colors"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate">Register students</h1>
          <p className="mt-1 text-sm text-slate/60">
            Upload a CSV to bulk-register students. Each student will receive a
            login ID and a temporary password by email — they can change it
            anytime from Settings, but it's optional.
          </p>
        </div>

        {/* Upload card */}
        <div
          className="mb-6 rounded-2xl border border-slate/10 p-6 shadow-sm transition-colors"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="mb-4 flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-forest" />
            <h2 className="text-base font-semibold text-slate">Upload CSV</h2>
          </div>

          <p className="mb-3 text-xs text-slate/50">
            Required columns: <code>full_name</code>, <code>email</code>. Optional:{" "}
            <code>department</code>, <code>phone</code>, <code>role</code>.
          </p>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate/20 px-4 py-8 text-sm text-slate/60 transition hover:border-forest hover:text-forest">
            <FileText className="h-5 w-5" />
            {fileName ? fileName : "Click to choose a .csv file"}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {parseError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}
        </div>

        {/* Preview table */}
        {rows.length > 0 && !results && (
          <div
            className="mb-6 overflow-hidden rounded-2xl border border-slate/10 shadow-sm transition-colors"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div className="flex items-center justify-between border-b border-slate/10 p-6 pb-4">
              <h2 className="text-base font-semibold text-slate">
                Preview ({rows.length} student{rows.length === 1 ? "" : "s"})
              </h2>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-slate/50 hover:text-slate"
              >
                Clear
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate/40">
                    <th className="px-6 py-2 font-medium">Name</th>
                    <th className="px-6 py-2 font-medium">Email</th>
                    <th className="px-6 py-2 font-medium">Department</th>
                    <th className="px-6 py-2 font-medium">Phone</th>
                    <th className="px-6 py-2 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate/10">
                  {rows.map((row, i) => (
                    <tr key={i} className="text-slate">
                      <td className="px-6 py-2.5">{row.full_name}</td>
                      <td className="px-6 py-2.5 text-slate/70">{row.email}</td>
                      <td className="px-6 py-2.5 text-slate/70">{row.department || "—"}</td>
                      <td className="px-6 py-2.5 text-slate/70">{row.phone || "—"}</td>
                      <td className="px-6 py-2.5 capitalize text-slate/70">{row.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-slate/10 p-6 pt-4">
              <button
                type="button"
                onClick={handleRegister}
                disabled={isRegistering}
                className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isRegistering
                  ? "Registering…"
                  : `Register ${rows.length} student${rows.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div
            className="overflow-hidden rounded-2xl border border-slate/10 shadow-sm transition-colors"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div className="flex items-center gap-2 border-b border-slate/10 p-6 pb-4">
              <CheckCircle2 className="h-4 w-4 text-forest" />
              <h2 className="text-base font-semibold text-slate">
                Registration complete
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate/40">
                    <th className="px-6 py-2 font-medium">Name</th>
                    <th className="px-6 py-2 font-medium">Login ID</th>
                    <th className="px-6 py-2 font-medium">Temp password</th>
                    <th className="px-6 py-2 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate/10">
                  {results.map((user) => (
                    <tr key={user.id} className="text-slate">
                      <td className="px-6 py-2.5">{user.full_name}</td>
                      <td className="px-6 py-2.5 font-mono text-xs text-slate/70">
                        {user.login_id}
                      </td>
                      <td className="px-6 py-2.5 font-mono text-xs text-slate/70">
                        {user.tempPassword}
                      </td>
                      <td className="px-6 py-2.5">
                        {user.emailSent ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-forest">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <AlertTriangle className="h-3.5 w-3.5" /> Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between border-t border-slate/10 p-6 pt-4">
              <p className="text-xs text-slate/50">
                Passwords shown here are temporary and won't be shown again — share
                this list securely if any emails failed.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="shrink-0 text-sm font-medium text-forest hover:text-forest/80"
              >
                Upload another CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}