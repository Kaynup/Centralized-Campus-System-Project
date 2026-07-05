import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { equipmentClient } from "../../../shared/api/axiosClient";
import { useAuth } from "../../../shared/hooks/useAuth";
import { ENDPOINTS } from "../../../shared/api/endpoints";
import Button from "../../../shared/ui/Button";
import { RefreshCw } from "lucide-react";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { user } = useAuth();

  async function fetchInventory() {
  try {
    const { data } = await equipmentClient.get(ENDPOINTS.EQUIPMENT.INVENTORY);
    setInventory(data.inventory || []);
  } catch (err) {
    console.error(err);
    setErrorMsg("Unable to load inventory right now.");
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  if (user) {
    fetchInventory();
  }
}, [user]);

  async function handleCheckout(equipmentId, equipmentName) {
    setCheckingOut(equipmentId);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
    const { data } = await equipmentClient.post("/checkout", {
  student_id: user.id,
  equipment_id: equipmentId,
});

      setSuccessMsg(
        `✅ "${equipmentName}" borrowed successfully! Due: ${new Date(data.due_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}`
      );
      fetchInventory();
    } catch (err) {
      const detail = err?.response?.data?.detail || "Checkout failed";
      setErrorMsg(detail);
    } finally {
      setCheckingOut(null);
    }
  }

  const filtered = inventory.filter((item) => {
    const term = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#fafafa]">

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
  <div>
    <p className="mb-1 text-xs uppercase tracking-widest text-stone-400">
      Equipment Rental
    </p>

    <h1 className="text-2xl font-bold text-stone-900">
      Browse Equipment
    </h1>

    <p className="mt-1 text-sm text-stone-400">
      Borrow equipment for up to 7 days. Security deposit is refunded on
      successful return.
    </p>
  </div>

  <div className="flex gap-2">
    <Button
      variant="secondary"
      onClick={fetchInventory}
    >
      <RefreshCw className="h-4 w-4" />
    </Button>

    <Button
      onClick={() => navigate("/equipment/rentals")}
    >
      My Rentals
    </Button>
  </div>
</div>

        <div className="relative mb-6">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            className="w-full rounded-lg border border-stone-200 bg-white py-3 pl-10 pr-4 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-[13px] text-green-700">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-stone-400">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading inventory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-stone-100 bg-white p-12 text-center shadow-sm">
            <p className="font-medium text-stone-500">No equipment found</p>
            <p className="mt-1 text-sm text-stone-400">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filtered.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-stone-800">{item.name}</p>
                      <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {item.category}
                      </span>
                    </div>
                    <span className="rounded-lg bg-green-50 px-2 py-1 text-[12px] font-medium text-green-600">
                      {item.available_quantity} left
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-stone-400">{item.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-stone-50 pt-2">
                  <div>
                    <p className="text-[12px] text-stone-400">Security deposit</p>
                    <p className="text-lg font-bold text-stone-800">₹{item.deposit_amount}</p>
                  </div>
                  <button
                    onClick={() => handleCheckout(item.id, item.name)}
                    disabled={checkingOut === item.id}
                    className="btn-primary min-h-0 px-5 py-2 text-sm"
                  >
                    {checkingOut === item.id ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
