import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Package,
  Building2,
  Store,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../shared/hooks/useAuth";

/**
 * Login.jsx
 * ------------------------------------------------------------------
 * Wires into AuthContext.login() via the useAuth hook.
 * On successful login, redirects the user back to the protected route
 * they originally tried to access, or /dashboard by default.
 * ------------------------------------------------------------------
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Controls the inline forgot-password panel
  const [showForgotPanel, setShowForgotPanel] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!loginId.trim() || !password) {
      setError("Enter your login ID and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        loginId: loginId.trim(),
        password,
      });

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* ============================================================
          BRAND PANEL
      ============================================================ */}
      <div className="relative hidden w-1/2 flex-col overflow-hidden bg-slate lg:flex">
        {/* Layered gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-forest via-forest/90 to-gold" />

        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-slate/50 blur-3xl" />

        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-gold/30 blur-3xl" />

        <div className="absolute inset-0 bg-gradient-to-t from-slate/40 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between px-14 py-12">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold" />

            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Centralized Campus System
            </span>
          </div>

          {/* Main content */}
          <div className="flex flex-col justify-end gap-10">
            <div className="max-w-md">
              <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white">
                One Campus.
                <br />
                One Account.
              </h1>

              <p className="mt-5 text-lg leading-8 text-white/70">
                Access Equipment Rental, Facility Reservation and Secure
                Marketplace system from one secure platform designed for
                campus life.
              </p>
            </div>

            {/* Features */}
            <div className="flex max-w-md flex-col gap-4">
              <FeatureRow
                icon={Package}
                title="Equipment Rental"
                description="Reserve lab and department equipment in a few clicks."
              />

              <FeatureRow
                icon={Building2}
                title="Facility Reservation"
                description="Book rooms and campus spaces without the paperwork."
              />

              <FeatureRow
                icon={Store}
                title="Secure Marketplace"
                description="Buy and sell within a verified campus community."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 border-t border-white/10 pt-6">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />

            <span className="text-sm text-white/50">
              Single sign-on, trusted across every campus service.
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          FORM PANEL
      ============================================================ */}
      <div className="flex w-full items-center justify-center bg-slate px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 lg:hidden">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Centralized Campus System
            </span>
          </div>

          {/* ========================================================
              LOGIN FORM
          ======================================================== */}
          {!showForgotPanel ? (
            <>
              <h1 className="text-2xl font-semibold text-white">
                Sign in to your account
              </h1>

              <p className="mt-2 text-sm text-white/60">
                Use the login ID issued by your campus administrator.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
                noValidate
              >
                {/* Login ID */}
                <div>
                  <label
                    htmlFor="loginId"
                    className="block text-sm font-medium text-white/80"
                  >
                    Login ID
                  </label>

                  <input
                    id="loginId"
                    name="loginId"
                    type="text"
                    autoComplete="username"
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    className="mt-1.5 block w-full rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
                    placeholder="Enter your ID"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-white/80"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPanel(true);
                        setError("");
                      }}
                      className="text-sm font-medium text-gold hover:text-gold/80 focus:outline-none focus-visible:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative mt-1.5">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="block w-full rounded-md border border-white/15 bg-white/5 px-3 py-2.5 pr-16 text-white placeholder-white/30 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold"
                      placeholder="••••••••"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => !prev)
                      }
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-white/50 hover:text-white/80 focus:outline-none"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Login error */}
                {error && (
                  <p
                    role="alert"
                    className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300"
                  >
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-slate transition hover:bg-gold/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-slate disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </>
          ) : (
            /* ========================================================
               FORGOT PASSWORD PANEL
            ======================================================== */
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Forgot your password?
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Campus accounts are managed by your administrator. Please
                contact your campus administrator to reset your password.
              </p>

              <div className="mt-6 rounded-md border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" />

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Need help accessing your account?
                    </p>

                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                      Contact your{" "}
                      <span className="font-medium text-gold">
                        campus administrator
                      </span>{" "}
                      and request a password reset.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPanel(false);
                  setError("");
                }}
                className="mt-6 w-full rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                ← Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * FeatureRow
 */
function FeatureRow({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
        <Icon
          className="h-5 w-5 text-gold"
          strokeWidth={1.75}
        />
      </div>

      <div>
        <p className="text-sm font-semibold text-white">
          {title}
        </p>

        <p className="text-sm leading-relaxed text-white/55">
          {description}
        </p>
      </div>
    </div>
  );
}

