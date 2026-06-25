import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../api/api";

const inputClass = (hasError) =>
  `w-full border rounded-xl px-4 py-3 text-[14px] text-stone-800 placeholder:text-stone-300 focus:outline-none transition-colors ${
    hasError
      ? "border-red-300 focus:border-red-400"
      : "border-stone-200 focus:border-primary"
  }`;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  function validate() {
    const newErrors = {};

    if (!email) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }
  async function handleSubmit(e) {
  e.preventDefault();

  if (!validate()) return;

  setSubmitError(null);
  setLoading(true);

  try {
    const data = await loginAdmin({ email, password });

    localStorage.setItem("admin", JSON.stringify(data));

    navigate("/dashboard");
  } catch (err) {
    setSubmitError(err.message);
  } finally {
    setLoading(false);
  }
}

  return (
    <main className="min-h-screen bg-red flex items-center justify-center px-4 pt-24 pb-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="label-caps mb-3">Welcome back</p>
          <h1 className="text-3xl font-medium text-primary-black">Sign in</h1>
        </div>

        <div className="bg-white border border-stone-100 rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-stone-700  tracking-widest">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email)
                    setErrors((err) => ({ ...err, email: undefined }));
                }}
                placeholder="Enter email"
                className={inputClass(!!errors.email)}
              />
              {errors.email && (
                <p className="text-[12px] text-red-400">{errors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-stone-700  tracking-widest">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((err) => ({ ...err, password: undefined }));
                }}
                placeholder="Enter password"
                className={inputClass(!!errors.password)}
              />
              {errors.password && (
                <p className="text-[12px] text-red-400">{errors.password}</p>
              )}
            </div>

            {submitError && (
              <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-2 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
