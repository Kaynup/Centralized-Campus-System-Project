import { createContext, useState, useEffect, useCallback } from "react";
import * as authService from "../api/authService";
import { setAuthToken, clearAuthToken } from "../api/axiosClient";
import { parseApiError } from "../utils/parseApiError";

/**
 * AuthContext
 * ------------------------------------------------------------------
 * Owns the auth session for the whole app (Section 8 of the arch doc):
 *   - access token lives in memory only — held by axiosClient.js's
 *     module-level `authToken` variable via setAuthToken/clearAuthToken,
 *     never localStorage
 *   - session persistence across refresh happens by calling
 *     GET /users/me on load; if there's no valid token yet, this
 *     simply resolves "logged out" (there is no refresh cookie in this
 *     backend — a full page refresh always requires logging in again
 *     until/unless that's added)
 *   - a distinguishable "session_invalidated" error (Section 5.3) is
 *     surfaced through `sessionInvalidatedMessage` — axiosClient.js's
 *     response interceptor currently does NOT call
 *     handleSessionInvalidated (it hard-redirects on any 401 instead);
 *     that's a known gap, flagged separately, not fixed here
 *
 * The consumer hook lives separately at shared/hooks/useAuth.js —
 * this file only exports the context object and the provider.
 * ------------------------------------------------------------------
 */

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  // "checking" | "authenticated" | "unauthenticated"
  const [status, setStatus] = useState("checking");
  const [sessionInvalidatedMessage, setSessionInvalidatedMessage] = useState(null);

  // Runs once on app load. Hydrates session using the stored token from localStorage.
  const hydrateSession = useCallback(async () => {
    setStatus("checking");
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setUser(null);
      setAccessTokenState(null);
      setStatus("unauthenticated");
      return;
    }

    try {
      setAuthToken(token);
      const userProfile = await authService.getProfile();
      setAccessTokenState(token);
      setUser(userProfile);
      setStatus("authenticated");
    } catch (err) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      clearAuthToken();
      setUser(null);
      setAccessTokenState(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const login = useCallback(async ({ loginId, password }) => {
    try {
      const data = await authService.login(loginId, password);
      // authService.login already calls setAuthToken() internally —
      // mirror it into React state too so consumers of useAuth() re-render.
      setAccessTokenState(data.access_token);
      setUser(data.user);
      setStatus("authenticated");
      return data;
    } catch (err) {
      const { message, code } = parseApiError(err);
      const error = new Error(message);
      error.code = code;
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    authService.logout();
    setUser(null);
    setAccessTokenState(null);
    setStatus("unauthenticated");
  }, []);

  // Called once axiosClient.js's interceptor is updated to distinguish
  // session_invalidated instead of hard-redirecting on every 401.
  const handleSessionInvalidated = useCallback((message) => {
    clearAuthToken();
    setUser(null);
    setAccessTokenState(null);
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