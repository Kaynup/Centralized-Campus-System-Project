import { useState } from "react";
import { addBalance } from "../api/api";

export default function AddBalance({ student, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    const value = Number(amount);

    if (amount === "") {
      setError("Amount is required");
      return false;
    }

    if (isNaN(value)) {
      setError("Amount must be a number");
      return false;
    }

    if (value <= 0) {
      setError("Amount must be greater than 0");
      return false;
    }

    setError("");
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      await addBalance(student.id, Number(amount));

      await onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add balance");  
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-medium">Add Balance</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-stone-500 mb-4">{student.full_name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* INPUT */}
          <div>
            <input
              type="number"
              value={amount}
              min="1"
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError(""); 
              }}
              placeholder="Enter amount"
              className="w-full border border-stone-200 rounded-xl px-4 py-2 focus:outline-none focus:border-primary"
            />

            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-outline"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}