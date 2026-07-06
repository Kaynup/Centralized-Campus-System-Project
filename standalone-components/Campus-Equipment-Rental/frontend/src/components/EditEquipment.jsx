import { useState } from "react";
import EquipmentForm from "./EquipmentForm";
import { updateEquipment } from "../api/api";

export default function EditEquipment({
  equipment,
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState({
    name: equipment.name || "",
    description: equipment.description || "",
    category: equipment.category || "",
    quantity: equipment.quantity || "",
    deposit_amount: equipment.deposit_amount || "",
  });

  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validate() {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!form.category) {
      newErrors.category = "Category is required";
    }

    if (!form.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (form.quantity === "" || Number(form.quantity) <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }

    if (
      form.deposit_amount === "" ||
      Number(form.deposit_amount) < 0
    ) {
      newErrors.deposit_amount =
        "Deposit amount must be 0 or greater";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    try {
      await updateEquipment(equipment.id, {
        name: form.name,
        description: form.description,
        category: form.category,
        quantity: Number(form.quantity),
        deposit_amount: Number(form.deposit_amount),
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h2 className="text-[16px] font-medium text-stone-900">
            Edit Equipment
          </h2>

          <button
            onClick={onClose}
            type="button"
            className="text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <EquipmentForm
            form={form}
            onChange={handleChange}
            errors={errors}
            showQuantity={true}
          />

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
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}