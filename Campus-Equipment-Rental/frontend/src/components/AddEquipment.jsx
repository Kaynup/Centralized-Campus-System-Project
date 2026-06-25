import { useState } from "react";
import EquipmentForm from "./EquipmentForm";

const emptyForm = {
  name: "",
  description: "",
  quantity: "",
  category: "",
  deposit_amount: "",
};

export default function AddEquipment({ onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
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

    if (!form.name.trim()) newErrors.name = "Name is required";

    if (!form.category) newErrors.category = "Category is required";

    if (!form.description.trim())
      newErrors.description = "Description is required";

    if (!form.quantity || Number(form.quantity) <= 0)
      newErrors.quantity = "Quantity must be greater than 0";

    if (
      form.deposit_amount === "" ||
      Number(form.deposit_amount) < 0
    )
      newErrors.deposit_amount = "Deposit must be 0 or more";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    try {
  await onSubmit(form);
} catch (err) {
  console.error(err);
}
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
          <h2 className="text-[16px] font-medium text-stone-900">
            Add Equipment
          </h2>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <EquipmentForm
            form={form}
            onChange={handleChange}
            errors={errors}
          />

          <button
            type="submit"
            className="w-full btn-primary text-[13px] py-3"
          >
            Add Equipment
          </button>
        </form>
      </div>
    </div>
  );
}