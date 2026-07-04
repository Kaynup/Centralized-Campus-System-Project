import { createContext, useState, useEffect, useCallback } from "react";

/**
 * AuthContext
 * ------------------------------------------------------------------
 * Owns the auth session for the whole app (Section 8 of the arch doc):
 *   - access token lives in memory only (this state), never localStorage
 *   - session persistence across refresh is meant to happen via an
 *     httpOnly refresh cookie + GET /api/auth/me (Section 5.2)
 *   - a distinguishable "session_invalidated" error (Section 5.3) is
 *     surfaced through `sessionInvalidatedMessage` so any component
 *     (e.g. the axios interceptor Person 3 builds) can react to it
 *
 * MOCK MODE:
 * Until Person 3's axiosClient / real backend exist, `login`,
 * `logout`, and `hydrateSession` are faked with timeouts. Every mock
 * function mirrors the exact shape the real API is expected to
 * return, so swapping in real axios calls later should only mean
 * replacing the body of these three functions — not their contracts.
 * ------------------------------------------------------------------
 */

export const AuthContext = createContext(null);

const MOCK_DELAY_MS = 600;

// MOCK ONLY — until /api/auth/* exists.
const MOCK_USERS = [
  {
    loginId: "admin",
    password: "admin123",
    user: {
      id: "u1",
      name: "Admin User",
      role: "admin",
      email: "admin@campus.edu",
      department: "Administration",
      phone: "9876500001",
    },
  },
  {
    loginId: "student",
    password: "student123",
    user: {
      id: "u2",
      name: "Sample Student",
      role: "student",
      email: "student@campus.edu",
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
  // "checking" | "authenticated" | "unauthenticated"
  const [status, setStatus] = useState("checking");
  const [sessionInvalidatedMessage, setSessionInvalidatedMessage] = useState(null);

  // Mirrors GET /api/auth/me — runs once on app load to hydrate the
  // session from the (backend-issued, httpOnly) refresh cookie.
  // Replace the body with a real axiosClient.get("/api/auth/me") call.
  const hydrateSession = useCallback(async () => {
    setStatus("checking");
    await wait(MOCK_DELAY_MS);
    // MOCK: no persisted session yet — real version checks the cookie result
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  // Mirrors POST /api/auth/login
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

  // Mirrors POST /api/auth/logout
  const logout = useCallback(async () => {
    await wait(200);
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
  }, []);

  // Called by the axios interceptor (once built) when a response comes
  // back as { error: "session_invalidated" } per Section 5.3.
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
