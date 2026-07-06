import { useEffect, useState } from "react";
import { getLateRentals } from "../api/api";
import AdminTableLayout from "./AdminTableLayout";

export default function LateRentalsTable() {
  const [rentals, setRentals] = useState([]);

  useEffect(() => {
    async function fetchLateRentals() {
      try {
        const data = await getLateRentals();
        setRentals(data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchLateRentals();
  }, []);

  return (
    <AdminTableLayout
      sectionLabel="Monitor"
      title="Late Rentals"
      isEmpty={rentals.length === 0}
      emptyMessage="No late rentals found."
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="text-left px-6 py-4 text-xs  tracking-widest text-stone-400">
              Student
            </th>

            <th className="text-left px-6 py-4 text-xs  tracking-widest text-stone-400">
              Equipment
            </th>

            <th className="text-left px-6 py-4 text-xs  tracking-widest text-stone-400">
              Days Overdue
            </th>

            <th className="text-left px-6 py-4 text-xs  tracking-widest text-stone-400">
              Late Fee
            </th>
          </tr>
        </thead>

        <tbody>
          {rentals.map((rental, index) => (
            <tr
              key={rental.id}
              className={`border-b border-stone-50 hover:bg-stone-50 ${
                index === rentals.length - 1
                  ? "border-none"
                  : ""
              }`}
            >
              <td className="px-6 py-4 text-sm text-stone-700">
                {rental.full_name}
              </td>

              <td className="px-6 py-4 text-sm text-stone-700">
                {rental.equipment_name}
              </td>

              <td className="px-6 py-4 text-sm text-stone-700">
                {rental.days_overdue}
              </td>

              <td className="px-6 py-4 text-red-500 font-medium">
                Rs {rental.late_fee}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTableLayout>
  );
}