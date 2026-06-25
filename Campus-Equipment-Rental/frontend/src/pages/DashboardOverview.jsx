import { useEffect, useState } from "react";
import { getAdminDashboard } from "../api/api";
import StatCard from "../components/StatCard";

export default function DashboardOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const data = await getAdminDashboard();
        setStats(data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchDashboard();
  }, []);

  if (!stats) {
    return <p>Loading dashboard...</p>;
  }

return (
  <div>
    <div className="mb-10">
      <p className="label-caps mb-2">
        Admin Panel
      </p>

      <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
        Dashboard Overview
      </h1>

      <p className="mt-2 text-stone-500">
        Monitor equipment, students, rentals and transactions.
      </p>
    </div>

    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Students"
        value={stats.total_students}
        accent="bg-blue-500"
      />

      <StatCard
        title="Equipments"
        value={stats.total_equipments}
        accent="bg-purple-500"
      />

      <StatCard
        title="Available"
        value={stats.available}
        accent="bg-green-500"
      />

      <StatCard
        title="Borrowed"
        value={stats.borrowed}
        accent="bg-orange-500"
      />

      <StatCard
        title="Late Rentals"
        value={stats.late}
        accent="bg-red-500"
      />

      <StatCard
        title="Penalties"
        value={`Rs ${stats.total_penalties}`}
        accent="bg-amber-500"
      />

      <StatCard
        title="Locked Deposits"
        value={`Rs ${stats.locked_deposits}`}
        accent="bg-cyan-500"
      />
    </div>

    <div className="grid gap-5 lg:grid-cols-2 mt-8">
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-5">
          System Status
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-stone-500">
              Available Equipment
            </span>

            <span className="font-medium">
              {stats.available}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-stone-500">
              Borrowed Equipment
            </span>

            <span className="font-medium">
              {stats.borrowed}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-stone-500">
              Late Rentals
            </span>

            <span className="font-medium text-red-500">
              {stats.late}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-5">
          Financial Summary
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-stone-500">
              Locked Deposits
            </span>

            <span className="font-medium">
              Rs {stats.locked_deposits}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-stone-500">
              Total Penalties
            </span>

            <span className="font-medium">
              Rs {stats.total_penalties}
            </span>
          </div>
        </div>
      </div>
    </div>

    {stats.recent_rentals?.length > 0 && (
      <div className="mt-8 bg-white rounded-3xl border border-stone-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-5">
          Recent Rentals
        </h2>

        <div className="divide-y divide-stone-100">
          {stats.recent_rentals.map((rental, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-4"
            >
              <div>
                <p className="font-medium text-stone-900">
                  {rental.full_name}
                </p>

                <p className="text-sm text-stone-500">
                  Borrowed {rental.equipment_name}
                </p>
              </div>

              <span className="text-sm text-stone-400">
                {new Date(
                  rental.borrow_date
                ).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
}

