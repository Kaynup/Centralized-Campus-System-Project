import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentDashboard() {
  const [wallet, setWallet] = useState(null);
  const [activeRentals, setActiveRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const studentId = localStorage.getItem("student_id");
  const studentCode = localStorage.getItem("student_code");
  const studentEmail = localStorage.getItem("student_email");

  useEffect(() => {
    if (!studentId) { navigate("/login"); return; }
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [walletRes, rentalsRes] = await Promise.all([
        fetch(`http://localhost:8000/wallet/${studentId}`),
        fetch(`http://localhost:8000/rentals/${studentId}/active`),
      ]);
      const walletData = await walletRes.json();
      const rentalsData = await rentalsRes.json();
      setWallet(walletData);
      setActiveRentals(rentalsData.active_rentals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.clear();
    navigate("/login");
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="flex items-center gap-3 text-stone-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Navbar */}
      <nav className="bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="font-semibold text-stone-800">EquipRent</span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/inventory")} className="text-sm text-stone-500 hover:text-primary transition-colors min-h-0 min-w-0 px-3 py-1 bg-transparent">
            Browse Equipment
          </button>
          <button onClick={() => navigate("/rentals")} className="text-sm text-stone-500 hover:text-primary transition-colors min-h-0 min-w-0 px-3 py-1 bg-transparent">
            My Rentals
          </button>
          <button onClick={handleLogout} className="text-sm text-stone-400 hover:text-red-500 transition-colors min-h-0 min-w-0 px-3 py-1 bg-transparent">
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="label-caps mb-1">Dashboard</p>
          <h1 className="text-2xl font-bold text-stone-900">Welcome back, {studentCode} 👋</h1>
          <p className="text-stone-400 text-sm mt-1">{studentEmail}</p>
        </div>

        {/* Wallet Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm">
            <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mb-2">Available Balance</p>
            <p className="text-3xl font-bold text-stone-900">₹{parseFloat(wallet?.available_balance || 0).toFixed(2)}</p>
            <p className="text-xs text-stone-400 mt-1">Ready to use</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm">
            <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mb-2">Reserved</p>
            <p className="text-3xl font-bold text-amber-500">₹{parseFloat(wallet?.reserved_balance || 0).toFixed(2)}</p>
            <p className="text-xs text-stone-400 mt-1">Locked as deposit</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm">
            <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-widest mb-2">Total Balance</p>
            <p className="text-3xl font-bold text-primary">₹{parseFloat(wallet?.total_balance || 0).toFixed(2)}</p>
            <p className="text-xs text-stone-400 mt-1">Available + Reserved</p>
          </div>
        </div>

        {/* Active Rentals */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">Active Rentals</h2>
          <button onClick={() => navigate("/inventory")} className="btn-outline text-sm px-4 min-h-0 py-2">
            + Borrow Equipment
          </button>
        </div>

        {activeRentals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center shadow-sm">
            <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-stone-500 font-medium">No active rentals</p>
            <p className="text-stone-400 text-sm mt-1">Browse equipment to get started</p>
            <button onClick={() => navigate("/inventory")} className="btn-primary mt-4 text-sm px-6">
              Browse Equipment
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeRentals.map((rental) => (
              <div key={rental.id} className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-stone-800">{rental.equipment_name}</p>
                  <p className="text-sm text-stone-400 mt-0.5">{rental.category}</p>
                  <p className="text-xs text-stone-400 mt-1">Due: {formatDate(rental.due_date)}</p>
                </div>
                <div className="text-right">
                  {rental.days_remaining > 0 ? (
                    <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                      {rental.days_remaining}d left
                    </span>
                  ) : (
                    <span className="inline-block bg-red-50 text-red-600 text-xs font-semibold px-3 py-1 rounded-full">
                      {Math.abs(rental.days_remaining)}d overdue
                    </span>
                  )}
                  <p className="text-xs text-stone-400 mt-2">Deposit: ₹{rental.deposit_amount}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <button onClick={() => navigate("/rentals")} className="text-sm text-primary hover:underline min-h-0 min-w-0 bg-transparent px-2 py-1">
            View full rental history →
          </button>
        </div>

      </main>
    </div>
  );
}