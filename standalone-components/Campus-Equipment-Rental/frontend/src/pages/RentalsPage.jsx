import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function RentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState("active");

  const navigate = useNavigate();
  const studentId = localStorage.getItem("student_id");

  async function fetchRentals() {
    try {
      const res = await fetch(`http://localhost:8000/rentals/${studentId}`);
      const data = await res.json();
      setRentals(data.rentals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  if (!studentId) {
    navigate("/login");
    return;
  }

  const load = async () => {
    await fetchRentals();
  };

  load();
}, [studentId, navigate]);

  async function handleReturn(rentalId, equipmentName) {
    setReturning(rentalId);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("http://localhost:8000/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: parseInt(studentId),
          rental_id: rentalId, 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.detail || "Return failed");
        return;
      }

      const msg =
        data.late_fee > 0
          ? `"${equipmentName}" returned. Late fee: ₹${data.late_fee}. Refund: ₹${data.refund_amount}`
          : `"${equipmentName}" returned. Full deposit ₹${data.refund_amount} refunded!`;

      setSuccessMsg(msg);
      fetchRentals();
    } catch (err) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setReturning(null);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const activeRentals = rentals.filter(
    (r) => r.status === "Borrowed" || r.status === "Late"
  );

  const history = rentals.filter((r) => r.status === "Returned");

  const displayed = activeTab === "active" ? activeRentals : history;

  const statusBadge = (rental) => {
    if (rental.status === "Returned")
      return (
        <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
          Returned
        </span>
      );

    if (rental.status === "Late")
      return (
        <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          Late
        </span>
      );

    return (
      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
        Borrowed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Navbar */}
      <nav className="bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <span className="font-semibold text-stone-800">EquipRent</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="text-sm text-stone-500 hover:text-primary transition-colors px-3 py-1"
          >
            Dashboard
          </button>

          <button
            onClick={() => navigate("/inventory")}
            className="text-sm text-stone-500 hover:text-primary transition-colors px-3 py-1"
          >
            Browse
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-1">
            Rentals
          </p>
          <h1 className="text-2xl font-bold text-stone-900">My Rentals</h1>
          <p className="text-stone-400 text-sm mt-1">
            Track your borrowed equipment and return history
          </p>
        </div>

        {/* Success */}
        {successMsg && (
          <div className="mb-4 text-[13px] text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
            ✅ {successMsg}
          </div>
        )}

  
        {errorMsg && (
          <div className="mb-4 text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {typeof errorMsg === "string"
              ? errorMsg
              : errorMsg?.detail || "Something went wrong"}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === "active"
                ? "bg-white shadow-sm text-stone-800"
                : "text-stone-500"
            }`}
          >
            Active ({activeRentals.length})
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === "history"
                ? "bg-white shadow-sm text-stone-800"
                : "text-stone-500"
            }`}
          >
            History ({history.length})
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="py-20 text-center text-stone-400">
            Loading rentals...
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <p className="text-stone-500">No rentals found</p>

            {activeTab === "active" && (
              <button
                onClick={() => navigate("/inventory")}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-lg"
              >
                Browse Equipment
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((rental) => (
              <div
                key={rental.id}
                className="bg-white border rounded-2xl p-5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-stone-800">
                      {rental.equipment_name}
                    </p>
                    <p className="text-xs text-stone-400">
                      {rental.category}
                    </p>
                  </div>

                  <div>{statusBadge(rental)}</div>
                </div>

                <div className="mt-4 text-sm text-stone-600">
                  Due: {formatDate(rental.due_date)}
                </div>

                {/* ONLY ACTIVE CAN RETURN */}
                {(rental.status === "Borrowed" ||
                  rental.status === "Late") && (
                  <button
                    onClick={() =>
                      handleReturn(rental.id, rental.equipment_name) 
                    }
                    disabled={returning === rental.id}
                    className="mt-4 w-full btn-primary text-white py-2 rounded-lg"
                  >
                    {returning === rental.id
                      ? "Returning..."
                      : "Return Equipment"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}