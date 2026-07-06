import { useEffect, useState } from "react";
import { getAllRentals } from "../api/api";
import AdminTableLayout from "./AdminTableLayout";

export default function RentalsTable() {
  const [rentals, setRentals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchRentals() {
      try {
        const data = await getAllRentals();
        setRentals(data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchRentals();
  }, []);

  function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusStyle(status) {
    switch (status) {
      case "Returned":
        return "bg-green-100 text-green-700";
      case "Late":
        return "bg-red-100 text-red-700";
      case "Borrowed":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-stone-100 text-stone-700";
    }
  }

  const filteredRentals = rentals.filter((r) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "borrowed") return r.status === "Borrowed";
    if (statusFilter === "late") return r.status === "Late";
    if (statusFilter === "returned") return r.status === "Returned";
    return true;
  });

  const filters = (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => setStatusFilter("all")}
        className={`px-4 py-1.5 rounded-full text-sm border transition ${
          statusFilter === "all"
            ? "bg-stone-900 text-white"
            : "bg-white text-stone-600 border-stone-200"
        }`}
      >
        All
      </button>

      <button
        onClick={() => setStatusFilter("borrowed")}
        className={`px-4 py-1.5 rounded-full text-sm border transition ${
          statusFilter === "borrowed"
            ? "bg-blue-600 text-white"
            : "bg-white text-stone-600 border-stone-200"
        }`}
      >
        Borrowed
      </button>

      <button
        onClick={() => setStatusFilter("late")}
        className={`px-4 py-1.5 rounded-full text-sm border transition ${
          statusFilter === "late"
            ? "bg-red-600 text-white"
            : "bg-white text-stone-600 border-stone-200"
        }`}
      >
        Late
      </button>

      <button
        onClick={() => setStatusFilter("returned")}
        className={`px-4 py-1.5 rounded-full text-sm border transition ${
          statusFilter === "returned"
            ? "bg-green-600 text-white"
            : "bg-white text-stone-600 border-stone-200"
        }`}
      >
        Returned
      </button>

      <button
        onClick={() => setStatusFilter("all")}
        className="ml-auto px-4 py-1.5 rounded-full text-sm border border-stone-200 text-stone-600 hover:bg-stone-50"
      >
        Clear
      </button>
    </div>
  );

  return (
    <AdminTableLayout
      sectionLabel="Manage"
      title="Rentals"
      toolbar={filters}
      isEmpty={filteredRentals.length === 0}
      emptyMessage="No rentals found."
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Student
            </th>

            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Equipment
            </th>

            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Status
            </th>

            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Due Date
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredRentals.map((rental, index) => (
            <tr
              key={rental.id}
              className={`border-b border-stone-50 hover:bg-stone-50 ${
                index === filteredRentals.length - 1 ? "border-none" : ""
              }`}
            >
              {/* Student */}
              <td className="px-6 py-4 text-sm text-stone-700">
                {rental.full_name || rental.student_name || "—"}
              </td>

              {/* Equipment */}
              <td className="px-6 py-4 text-sm text-stone-700 flex items-center gap-2">
                <span>{rental.equipment_name}</span>

                {rental.available_quantity !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      rental.available_quantity > 0
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {rental.available_quantity > 0
                      ? "In stock"
                      : "Out of stock"}
                  </span>
                )}
              </td>

              {/* Status */}
              <td className="px-6 py-4 text-sm">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                    rental.status
                  )}`}
                >
                  {rental.status}
                </span>
              </td>

              {/* Due Date */}
              <td className="px-6 py-4 text-sm text-stone-700">
                {formatDate(rental.due_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTableLayout>
  );
}