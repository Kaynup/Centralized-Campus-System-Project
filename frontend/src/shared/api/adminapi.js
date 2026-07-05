/**
 * adminApi.js
 * ------------------------------------------------------------------
 * MOCK MODE — no real backend yet. Every function here documents the
 * exact contract the backend team should implement, aligned with
 * shared_tables.md.
 *
 * ACCESS MODEL:
 *   - Super Admin: manages sub-admin accounts, and owns all core/
 *     shared admin functions (student registration, change requests).
 *   - Sub-admins (equipment_admin, facility_admin, marketplace_admin):
 *     will manage their own domain's app-specific admin pages once
 *     those exist (currently placeholder routes in App.jsx). They do
 *     NOT see student registration / change requests — those are
 *     core-level, Super-Admin-only.
 *
 *   ⚠️ SCHEMA NOTE: admin_users.role enum (per shared_tables.md)
 *   currently only lists super_admin, moderator, facility_admin.
 *   Needs equipment_admin and marketplace_admin added for this to
 *   work for real — flag to backend team.
 *
 *   POST /api/admin/users/bulk-register
 *     body: { users: [{ full_name, email, department, phone, role }] }
 *     returns: { created: [{ id, login_id, full_name, email, tempPassword }] }
 *     ⚠️ SCHEMA GAP: department/phone are not real columns on `users`
 *     yet — see note in bulkRegisterUsers below.
 *
 *   POST /api/admin/users/:id/send-welcome-email
 *   GET  /api/admin/students
 *   POST /api/change-requests
 *   GET  /api/admin/change-requests
 *   POST /api/admin/change-requests/:id/approve
 *   POST /api/admin/change-requests/:id/reject
 *
 *   --- Sub-admin management (Super Admin only) ---
 *   POST /api/admin/sub-admins
 *     body: { full_name, email, domain }   domain: "equipment" | "facility" | "marketplace"
 *     returns: { subAdmin: { id, admin_id, name, email, role, domain, tempPassword } }
 *
 *   GET /api/admin/sub-admins
 *     returns: { subAdmins: [{ id, admin_id, name, email, domain, is_active, last_login_at }] }
 *
 *   POST /api/admin/sub-admins/:id/deactivate
 *   POST /api/admin/sub-admins/:id/reactivate
 *   POST /api/admin/sub-admins/:id/reassign-domain   body: { domain }
 *   POST /api/admin/sub-admins/:id/reset-password    returns: { tempPassword }
 *
 * NOTE ON MOCK PERSISTENCE:
 * All MOCK_* arrays below are plain in-memory, reset on full reload.
 * ------------------------------------------------------------------
 */

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

function generateLoginId(fullName, existingIds) {
  const base = fullName.trim().toLowerCase().replace(/\s+/g, ".");
  let candidate = base;
  let suffix = 1;
  while (existingIds.has(candidate)) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  existingIds.add(candidate);
  return candidate;
}

// ============================================================
// Students
// ============================================================

let MOCK_STUDENTS = [];

export async function bulkRegisterUsers(rows) {
  await wait(700);
  const existingIds = new Set(MOCK_STUDENTS.map((s) => s.login_id));
  const created = rows.map((row, index) => ({
    id: `mock-${Date.now()}-${index}`,
    login_id: generateLoginId(row.full_name, existingIds),
    full_name: row.full_name,
    email: row.email,
    department: row.department || "", // ⚠️ not a real column yet
    phone: row.phone || "",           // ⚠️ not a real column yet
    role: row.role || "student",
    tempPassword: generateTempPassword(),
    created_at: new Date().toISOString(),
  }));
  MOCK_STUDENTS = [...created, ...MOCK_STUDENTS];
  return { created };
}

export async function getStudents() {
  await wait(400);
  const students = MOCK_STUDENTS.map(({ tempPassword, ...rest }) => rest);
  return { students };
}

export async function sendWelcomeEmail(user) {
  await wait(300);
  return { sent: true, to: user.email };
}

// ============================================================
// Change requests
// ============================================================

let MOCK_CHANGE_REQUESTS = [];

export async function submitChangeRequest({ userId, userName, field, currentValue, requestedValue, reason }) {
  await wait(400);
  const request = {
    id: `req-${Date.now()}`,
    userId,
    userName,
    field,
    currentValue,
    requestedValue,
    reason,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  MOCK_CHANGE_REQUESTS = [request, ...MOCK_CHANGE_REQUESTS];
  return request;
}

export async function getChangeRequests() {
  await wait(400);
  return { requests: MOCK_CHANGE_REQUESTS };
}

export async function approveChangeRequest(id) {
  await wait(300);
  const request = MOCK_CHANGE_REQUESTS.find((r) => r.id === id);
  if (request) {
    MOCK_STUDENTS = MOCK_STUDENTS.map((s) =>
      s.id === request.userId ? { ...s, [request.field]: request.requestedValue } : s
    );
  }
  MOCK_CHANGE_REQUESTS = MOCK_CHANGE_REQUESTS.map((r) =>
    r.id === id ? { ...r, status: "approved" } : r
  );
  return { success: true };
}

export async function rejectChangeRequest(id) {
  await wait(300);
  MOCK_CHANGE_REQUESTS = MOCK_CHANGE_REQUESTS.map((r) =>
    r.id === id ? { ...r, status: "rejected" } : r
  );
  return { success: true };
}

// ============================================================
// Sub-admin management (Super Admin only)
// ============================================================

let MOCK_SUB_ADMINS = [];

// MOCK — mirrors POST /api/admin/sub-admins
export async function createSubAdmin({ full_name, email, domain }) {
  await wait(600);
  const existingIds = new Set(MOCK_SUB_ADMINS.map((a) => a.admin_id));
  const subAdmin = {
    id: `admin-${Date.now()}`,
    admin_id: generateLoginId(full_name, existingIds),
    name: full_name,
    email,
    domain, // "equipment" | "facility" | "marketplace"
    role: `${domain}_admin`,
    is_active: true,
    last_login_at: null,
    tempPassword: generateTempPassword(),
    created_at: new Date().toISOString(),
  };
  MOCK_SUB_ADMINS = [subAdmin, ...MOCK_SUB_ADMINS];
  return { subAdmin };
}

// MOCK — mirrors GET /api/admin/sub-admins
export async function getSubAdmins() {
  await wait(400);
  const subAdmins = MOCK_SUB_ADMINS.map(({ tempPassword, ...rest }) => rest);
  return { subAdmins };
}

// MOCK — mirrors POST /api/admin/sub-admins/:id/deactivate
export async function deactivateSubAdmin(id) {
  await wait(300);
  MOCK_SUB_ADMINS = MOCK_SUB_ADMINS.map((a) =>
    a.id === id ? { ...a, is_active: false } : a
  );
  return { success: true };
}

// MOCK — mirrors POST /api/admin/sub-admins/:id/reactivate
export async function reactivateSubAdmin(id) {
  await wait(300);
  MOCK_SUB_ADMINS = MOCK_SUB_ADMINS.map((a) =>
    a.id === id ? { ...a, is_active: true } : a
  );
  return { success: true };
}

// MOCK — mirrors POST /api/admin/sub-admins/:id/reassign-domain
export async function reassignSubAdminDomain(id, domain) {
  await wait(300);
  MOCK_SUB_ADMINS = MOCK_SUB_ADMINS.map((a) =>
    a.id === id ? { ...a, domain, role: `${domain}_admin` } : a
  );
  return { success: true };
}

// MOCK — mirrors POST /api/admin/sub-admins/:id/reset-password
export async function resetSubAdminPassword(id) {
  await wait(400);
  const tempPassword = generateTempPassword();
  MOCK_SUB_ADMINS = MOCK_SUB_ADMINS.map((a) =>
    a.id === id ? { ...a, tempPassword } : a
  );
  // Real backend: email this to the sub-admin, don't return it to
  // the caller in a real response — returned here only because this
  // is a mock with no real email delivery to show it landed.
  return { tempPassword };
}