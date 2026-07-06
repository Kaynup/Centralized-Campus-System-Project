import { useEffect, useState } from "react";
import AddEquipment from "./AddEquipment";
import EditEquipment from "./EditEquipment";
import AdminTableLayout from "./AdminTableLayout";

import {
  getEquipments,
  createEquipment,
  activateEquipment,
  deactivateEquipment,
} from "../api/api";

export default function EquipmentsTable() {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editEquipment, setEditEquipment] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  

  async function loadEquipments() {
    try {
      const data = await getEquipments();
      setEquipments(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load equipments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function fetchEquipments() {
      await loadEquipments();
    }

    fetchEquipments();
  }, []);

  async function handleAddEquipment(formData) {
    try {
      await createEquipment({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        quantity: Number(formData.quantity),
        deposit_amount: Number(formData.deposit_amount),
      });

      await loadEquipments();
      setAddOpen(false);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleActivate(id) {
    try {
      await activateEquipment(id);

      setEquipments((prev) =>
        prev.map((equipment) =>
          equipment.id === id ? { ...equipment, is_active: true } : equipment,
        ),
      );
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeactivate(id) {
    try {
      await deactivateEquipment(id);

      setEquipments((prev) =>
        prev.map((equipment) =>
          equipment.id === id ? { ...equipment, is_active: false } : equipment,
        ),
      );
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8">Loading equipments...</div>
    );
  }

  const filteredEquipments = equipments.filter((e) => {
  const matchesStock =
    filter === "all"
      ? true
      : filter === "available"
      ? e.available_quantity > 0
      : e.available_quantity === 0;

  const matchesStatus =
    statusFilter === "all"
      ? true
      : statusFilter === "active"
      ? e.is_active
      : !e.is_active;

  return matchesStock && matchesStatus;
});

const filters = (
  <div className="flex flex-wrap items-center gap-2">
    
  {/* Stock Filters */}
  <button
    onClick={() => setFilter("all")}
    className={`px-4 py-2 text-sm rounded-full transition-all ${
      filter === "all"
        ? "bg-stone-900 text-white shadow-sm"
        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
    }`}
  >
    All Equipment
  </button>

  <button
    onClick={() => setFilter("available")}
    className={`px-4 py-2 text-sm rounded-full transition-all ${
      filter === "available"
        ? "bg-green-600 text-white shadow-sm"
        : "bg-green-50 text-green-700 hover:bg-green-100"
    }`}
  >
    Available
  </button>

  <button
    onClick={() => setFilter("out")}
    className={`px-4 py-2 text-sm rounded-full transition-all ${
      filter === "out"
        ? "bg-red-600 text-white shadow-sm"
        : "bg-red-50 text-red-700 hover:bg-red-100"
    }`}
  >
    Out of Stock
  </button>

  <div className="w-px h-6 bg-stone-200 mx-1" />

  {/* Status Filters */}
  <button
    onClick={() => setStatusFilter("all")}
    className={`px-4 py-2 text-sm rounded-full transition-all ${
      statusFilter === "all"
        ? "bg-stone-900 text-white shadow-sm"
        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
    }`}
  >
    All Status
  </button>

  <button
    onClick={() => setStatusFilter("active")}
    className={`px-4 py-2 text-sm rounded-full transition-all ${
      statusFilter === "active"
        ? "bg-emerald-600 text-white shadow-sm"
        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
    }`}
  >
    Active
  </button>

  <button
    onClick={() => setStatusFilter("inactive")}
    className={`px-4 py-2 text-sm rounded-full transition-all ${
      statusFilter === "inactive"
        ? "bg-orange-600 text-white shadow-sm"
        : "bg-orange-50 text-orange-700 hover:bg-orange-100"
    }`}
  >
    Inactive
  </button>

  {(filter !== "all" || statusFilter !== "all") && (
    <button
      onClick={() => {
        setFilter("all");
        setStatusFilter("all");
      }}
      className="ml-auto px-4 py-2 text-sm rounded-full bg-stone-200 text-stone-700 hover:bg-stone-300 transition-all"
    >
      Clear Filters
    </button>
  )}


  </div>
);

  return (
    <>
     
      <AdminTableLayout
        sectionLabel="Manage"
        title="Equipments"
        toolbar={filters}
        isEmpty={filteredEquipments.length === 0}
        emptyMessage="No equipments found."
        action={
          <button
            onClick={() => setAddOpen(true)}
            className="btn-primary text-[13px] px-5"
          >
            Add Equipment
          </button>
        }
      >
       

        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="text-left px-6 py-4 text-xs font-medium uppercase tracking-wider text-stone-400">
                Name
              </th>

              <th className="text-left px-6 py-4 text-xs  tracking-widest text-stone-400">
                Category
              </th>

              <th className="text-left px-6 py-4 text-xs  tracking-widest text-stone-400">
                Quantity
              </th>

              <th className="text-left px-6 py-4 text-xs  tracking-widest text-stone-400">
                Deposit
              </th>

              <th className="text-left px-6 py-4 text-xs  tracking-widest text-stone-400">
                Status
              </th>

              <th className="text-left px-6 py-4 text-xs  tracking-widest text-stone-400">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredEquipments.map((equipment, index) => (
              <tr
                key={equipment.id}
                className={`border-b border-stone-50 hover:bg-stone-50 ${
                  index === equipments.length - 1 ? "border-none" : ""
                }`}
              >
                <td className="px-6 py-4 text-sm text-stone-700">
                  {equipment.name}
                </td>

                <td className="px-6 py-4 text-sm text-stone-700">
                  {equipment.category}
                </td>

                <td className="px-6 py-4 text-sm text-stone-700">
                  {equipment.available_quantity} / {equipment.quantity}
                </td>

                <td className="px-6 py-4 text-sm text-stone-700">
                  Rs. {equipment.deposit_amount}
                </td>

                <td className="px-6 py-4 text-sm text-stone-700">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      equipment.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {equipment.is_active ? "Active" : "Inactive"}
                  </span>
                </td>

                <td className="px-6 py-4 text-sm text-stone-700">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditEquipment(equipment)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Edit
                    </button>

                    {equipment.is_active ? (
                      <button
                        onClick={() => handleDeactivate(equipment.id)}
                        className="text-red-500 text-sm hover:underline"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(equipment.id)}
                        className="text-green-600 text-sm hover:underline"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableLayout>

      {addOpen && (
        <AddEquipment
          onClose={() => setAddOpen(false)}
          onSubmit={handleAddEquipment}
        />
      )}

      {editEquipment && (
        <EditEquipment
          equipment={editEquipment}
          onClose={() => setEditEquipment(null)}
          onSuccess={loadEquipments}
        />
      )}
    </>
  );
}
