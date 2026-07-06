import { useState } from "react";
import { createStudent } from "../api/api";

const emptyForm = {
  student_id: "",
  full_name: "",
  email: "",
};

export default function AddStudent({ onClose, onSuccess }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validate() {
    const newErrors = {};

    if (!form.student_id.trim()) {
      newErrors.student_id = "Student ID is required";
    }

    if (!form.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      await createStudent({
        student_id: form.student_id.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
      });

      await onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary";

  const errorClass = "text-xs text-red-500 mt-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h2 className="text-[16px] font-medium text-stone-900">
            Add Student
          </h2>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          
          {/* STUDENT ID */}
          <div>
            <input
              name="student_id"
              value={form.student_id}
              onChange={handleChange}
              placeholder="Student ID"
              className={inputClass}
            />
            {errors.student_id && (
              <p className={errorClass}>{errors.student_id}</p>
            )}
          </div>

          {/* FULL NAME */}
          <div>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Full Name"
              className={inputClass}
            />
            {errors.full_name && (
              <p className={errorClass}>{errors.full_name}</p>
            )}
          </div>

          {/* EMAIL */}
          <div>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className={inputClass}
            />
            {errors.email && (
              <p className={errorClass}>{errors.email}</p>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-outline text-[13px]"
              style={{ minHeight: 42 }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary text-[13px]"
              style={{ minHeight: 42 }}
            >
              {loading ? "Adding..." : "Add Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}