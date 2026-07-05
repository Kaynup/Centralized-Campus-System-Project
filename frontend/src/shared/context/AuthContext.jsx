import { createContext, useState, useEffect, useCallback } from "react";

/**
 * AuthContext
 * ------------------------------------------------------------------
 * Owns the auth session for the whole app (Section 8 of the arch doc).
 *
 * SCHEMA ALIGNMENT (per shared_tables.md):
 *   - `users` table uses `full_name`, not `name`.
 *   - Admins live in a SEPARATE `admin_users` table. Recommended
 *     backend pattern: login checks both tables, returns a
 *     consistent shape with `accountType: "user" | "admin"`.
 *   - Admin accounts additionally carry a `role` of either
 *     "super_admin" or "<domain>_admin" (equipment/facility/
 *     marketplace), plus a `domain` field for sub-admins. Super
 *     Admin has no `domain` — they manage all sub-admins and all
 *     core/shared admin functions.
 *   - `department` and `phone` do NOT exist in the current users
 *     schema — flagged for backend team to add as real columns.
 *
 * MOCK MODE — see login()/logout()/hydrateSession() comments below.
 * ------------------------------------------------------------------
 */

export const AuthContext = createContext(null);

const MOCK_DELAY_MS = 600;

// MOCK ONLY — until /api/auth/* exists.
const MOCK_USERS = [
  {
    loginId: "superadmin",
    password: "super123",
    user: {
      id: "a1",
      accountType: "admin",
      full_name: "Super Admin",
      role: "super_admin",
      domain: null, // Super Admin isn't scoped to one domain
      email: "superadmin@campus.edu",
    },
  },
  {
    loginId: "facilityadmin",
    password: "facility123",
    user: {
      id: "a2",
      accountType: "admin",
      full_name: "Facility Admin",
      role: "facility_admin",
      domain: "facility",
      email: "facilityadmin@campus.edu",
    },
  },
  {
    loginId: "admin",
    password: "admin123",
    user: {
      id: "a1",
      accountType: "admin",
      full_name: "Admin User",
      role: "super_admin",
      domain: null,
      email: "admin@campus.edu",
    },
  },
  {
    loginId: "student",
    password: "student123",
    user: {
      id: "u2",
      accountType: "user",
      full_name: "Sample Student",
      role: "student",
      email: "student@campus.edu",
      // TODO(schema): department/phone don't exist on `users` yet —
      // confirm with backend team whether these get added as real
      // columns before wiring this up for real.
      department: "Computer Science",
      phone: "9876500002",
    },
  },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [status, setStatus] = useState("checking");
  const [sessionInvalidatedMessage, setSessionInvalidatedMessage] = useState(null);

  const hydrateSession = useCallback(async () => {
    setStatus("checking");
    await wait(MOCK_DELAY_MS);
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const login = useCallback(async ({ loginId, password }) => {
    await wait(MOCK_DELAY_MS);

    const match = MOCK_USERS.find(
      (entry) => entry.loginId === loginId && entry.password === password
    );

    if (!match) {
      const error = new Error("Invalid login ID or password");
      error.code = "invalid_credentials";
      throw error;
    }

    const fakeToken = `mock.${btoa(loginId)}.${Date.now()}`;
    setUser(match.user);
    setAccessToken(fakeToken);
    setStatus("authenticated");
    return { accessToken: fakeToken, user: match.user };
  }, []);

  const logout = useCallback(async () => {
    await wait(200);
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
  }, []);

  const handleSessionInvalidated = useCallback((message) => {
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
    setSessionInvalidatedMessage(message || "You were logged out because you signed in elsewhere.");
  }, []);

  const clearSessionInvalidatedMessage = useCallback(() => {
    setSessionInvalidatedMessage(null);
  }, []);

  const value = {
    user,
    accessToken,
    isAuthenticated: status === "authenticated",
    isCheckingSession: status === "checking",
    sessionInvalidatedMessage,
    login,
    logout,
    handleSessionInvalidated,
    clearSessionInvalidatedMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
