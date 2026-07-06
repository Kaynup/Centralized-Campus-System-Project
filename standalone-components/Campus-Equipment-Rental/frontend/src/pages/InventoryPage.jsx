import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const studentId = localStorage.getItem("student_id");


  async function fetchInventory() {
    try {
      const res = await fetch("http://localhost:8000/inventory");
      const data = await res.json();
      setInventory(data.inventory || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

    useEffect(() => {
    if (!studentId) { navigate("/login"); return; }
    fetchInventory();
  }, []);

  async function handleCheckout(equipmentId, equipmentName) {
    setCheckingOut(equipmentId);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("http://localhost:8000/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: parseInt(studentId), equipment_id: equipmentId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorMsg(data?.detail || "Checkout failed");
        return;
      }

      setSuccessMsg(`✅ "${equipmentName}" borrowed successfully! Due: ${new Date(data.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`);
      fetchInventory();

    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setCheckingOut(null);
    }
  }

  const filtered = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase())
  );

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
          <button onClick={() => navigate("/student/dashboard")} className="text-sm text-stone-500 hover:text-primary transition-colors min-h-0 min-w-0 px-3 py-1 bg-transparent">Dashboard</button>
          <button onClick={() => navigate("/rentals")} className="text-sm text-stone-500 hover:text-primary transition-colors min-h-0 min-w-0 px-3 py-1 bg-transparent">My Rentals</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">

        <div className="mb-8">
          <p className="label-caps mb-1">Inventory</p>
          <h1 className="text-2xl font-bold text-stone-900">Browse Equipment</h1>
          <p className="text-stone-400 text-sm mt-1">Borrow for 7 days. Deposit is locked and returned on time.</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            className="w-full border border-stone-200 rounded-lg pl-10 pr-4 py-3 text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 text-[13px] text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-stone-400 gap-3">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading inventory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center shadow-sm">
            <p className="text-stone-500 font-medium">No equipment found</p>
            <p className="text-stone-400 text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm flex flex-col gap-3">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-stone-800">{item.name}</p>
                      <span className="inline-block text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1">
                        {item.category}
                      </span>
                    </div>
                    <span className="text-[12px] font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                      {item.available_quantity} left
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-stone-400 mt-2 line-clamp-2">{item.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-50">
                  <div>
                    <p className="text-[12px] text-stone-400">Security deposit</p>
                    <p className="text-lg font-bold text-stone-800">₹{item.deposit_amount}</p>
                  </div>
                  <button
                    onClick={() => handleCheckout(item.id, item.name)}
                    disabled={checkingOut === item.id}
                    className="btn-primary text-sm px-5 min-h-0 py-2"
                  >
                    {checkingOut === item.id ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Borrowing...
                      </span>
                    ) : "Borrow"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}