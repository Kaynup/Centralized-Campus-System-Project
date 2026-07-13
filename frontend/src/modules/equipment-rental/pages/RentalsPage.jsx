import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { equipmentClient } from "../../../shared/api/axiosClient";
import { useAuth } from "../../../shared/hooks/useAuth";
import Button from "../../../shared/ui/Button";
import { RefreshCw } from "lucide-react";

export default function RentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState("active");

  const navigate = useNavigate();
  const { user } = useAuth();

  async function fetchRentals() {
    if (!user) return;

    try {
      const { data } = await equipmentClient.get(`/rentals/${user.id}`);
      setRentals(data.rentals || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Unable to load rentals right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchRentals();
    }
  }, [user]);

  async function handleReturn(rentalId, equipmentName) {
    setReturning(rentalId);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const { data } = await equipmentClient.post("/return", {
        student_id: user.id,
        rental_id: rentalId,
      });

      const msg =
        data.late_fee > 0
          ? `"${equipmentName}" returned. Late fee: ${data.late_fee} tokens. Refund: ${data.refund_amount} tokens`
          : `"${equipmentName}" returned. Full deposit ${data.refund_amount} tokens refunded!`;

      setSuccessMsg(msg);
      fetchRentals();
      
      // Inform the global wallet context to update the Navbar balance
      if (window.dispatchEvent) {
         window.dispatchEvent(new Event("wallet-refresh"));
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || "Return failed";
      setErrorMsg(detail);
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
    (r) => r.status === "Borrowed" || r.status === "Late",
  );

  const history = rentals.filter((r) => r.status === "Returned");
  const displayed = activeTab === "active" ? activeRentals : history;

  const statusBadge = (rental) => {
    if (rental.status === "Returned") {
      return (
        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
          Returned
        </span>
      );
    }

    if (rental.status === "Late") {
      return (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
          Late
        </span>
      );
    }

    return (
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
        Borrowed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs uppercase tracking-widest text-stone-400">
              Equipment Rental
            </p>

            <h1 className="text-2xl font-bold text-stone-900">My Rentals</h1>

            <p className="mt-1 text-sm text-stone-400">
              View active rentals and your borrowing history.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => fetchRentals()}>
              {" "}
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button onClick={() => navigate("/equipment")}>
              Browse Equipment
            </Button>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-[13px] text-green-700">
            ✅ {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {typeof errorMsg === "string"
              ? errorMsg
              : errorMsg?.detail || "Something went wrong"}
          </div>
        )}

        <div className="mb-6 flex w-fit gap-1 rounded-xl bg-stone-100 p-1">
          <button
            onClick={() => setActiveTab("active")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === "active" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"}`}
          >
            Active ({activeRentals.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === "history" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"}`}
          >
            History ({history.length})
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-stone-400">
            Loading rentals...
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center">
            <p className="text-stone-500">No rentals found</p>
            {activeTab === "active" && (
              <button
                onClick={() => navigate("/equipment")}
                className="mt-4 rounded-lg bg-primary px-6 py-2 text-white"
              >
                Browse Equipment
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((rental) => (
              <div key={rental.id} className="rounded-2xl border bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-stone-800">
                      {rental.equipment_name}
                    </p>
                    <p className="text-xs text-stone-400">{rental.category}</p>
                  </div>
                  <div>{statusBadge(rental)}</div>
                </div>

                <div className="mt-4 text-sm text-stone-600">
                  Due: {formatDate(rental.due_date)}
                </div>

                {(rental.status === "Borrowed" || rental.status === "Late") && (
                  <button
                    onClick={() =>
                      handleReturn(rental.id, rental.equipment_name)
                    }
                    disabled={returning === rental.id}
                    className="mt-4 w-full rounded-lg bg-primary py-2 text-white"
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
