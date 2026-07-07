/**
 * parseApiError
 * ------------------------------------------------------------------
 * Every backend response error is expected to follow the envelope in
 * Section 5.4 of the arch doc:
 *   { error: "string_code", message: "human readable", details: {} }
 *
 * Without a single place to interpret that shape, every context and
 * component ends up writing its own "if err.response.data.error ==="
 * logic — which drifts out of sync fast. This file is that one place.
 *
 * It does NOT decide what to do with the error (show a toast? redirect
 * to /login? show a form error?) — it just normalizes whatever came in
 * (a real axios error, a thrown mock Error, or a plain string) into a
 * consistent { code, message } shape. Callers decide the reaction.
 * ------------------------------------------------------------------
 */

// Known backend error codes → fallback copy if the backend didn't
// send a `message` (or sent one that's too technical to show as-is).
const KNOWN_ERROR_MESSAGES = {
  session_invalidated: "You were logged out because you signed in elsewhere.",
  invalid_credentials: "Incorrect login ID or password.",
  insufficient_funds: "Your wallet balance is too low for this action.",
  invalid_amount: "Enter a valid amount.",
  network_error: "Can't reach the server. Check your connection and try again.",
  unknown_error: "Something went wrong. Please try again.",
};

export function parseApiError(err) {
  // Check axios response data first — backend detail/message takes priority
  // over any generic Error properties that axios sets (like err.code = "ERR_BAD_RESPONSE").
  const payload = err?.response?.data;

  // Frontend envelope format: { error: "code", message: "human readable" }
  if (payload?.error) {
    return {
      code: payload.error,
      message: payload.message || KNOWN_ERROR_MESSAGES[payload.error] || KNOWN_ERROR_MESSAGES.unknown_error,
      details: payload.details,
    };
  }

  // FastAPI default error format: { detail: "human readable message" }
  if (payload?.detail) {
    return {
      code: "api_error",
      message: typeof payload.detail === "string" ? payload.detail : KNOWN_ERROR_MESSAGES.unknown_error,
    };
  }

  // No response at all — request never reached the backend.
  if (err?.request && !err?.response) {
    return { code: "network_error", message: KNOWN_ERROR_MESSAGES.network_error };
  }

  // Mock/local errors thrown directly (e.g. from AuthContext, WalletContext)
  // NOTE: checked AFTER axios response data to avoid axios's own err.code ("ERR_BAD_RESPONSE") winning.
  if (err instanceof Error && err.code && !err.code.startsWith("ERR_")) {
    return {
      code: err.code,
      message: err.message || KNOWN_ERROR_MESSAGES[err.code] || KNOWN_ERROR_MESSAGES.unknown_error,
    };
  }

  // Plain Error with no code, or anything else unexpected.
  return {
    code: "unknown_error",
    message: err?.message || KNOWN_ERROR_MESSAGES.unknown_error,
  };
}

// Codes that mean "the session is gone" — components can check this
// instead of hardcoding the string in multiple places.
export const SESSION_ERROR_CODES = ["session_invalidated"];

export function isSessionError(code) {
  return SESSION_ERROR_CODES.includes(code);
}