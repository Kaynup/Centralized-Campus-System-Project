const CATEGORIES = [
  "Photography & Video",
  "Computing Devices",
  "Audio Equipment",
  "Accessories & Connectivity",
  "Presentation Equipment",
  "Laboratory Equipment",
  "Other",
];

const field =
  "w-full border border-stone-200 rounded-xl px-4 py-3 text-[14px] text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-primary transition-colors";

const label =
  "text-[13px] font-medium text-stone-500 tracking-widest";

export default function EquipmentForm({
  form,
  onChange,
  errors = {},
  showQuantity = true,
}) {
  return (
    <>
      {/* NAME */}
      <div className="flex flex-col gap-1.5">
        <label className={label}>Name</label>
        <input
          name="name"
          value={form.name}
          onChange={onChange}
          className={field}
        />
        {errors.name && (
          <p className="text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      {/* CATEGORY */}
      <div className="flex flex-col gap-1.5">
        <label className={label}>Category</label>
        <select
          name="category"
          value={form.category}
          onChange={onChange}
          className={field}
        >
          <option value="">Select category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {errors.category && (
          <p className="text-xs text-red-500">{errors.category}</p>
        )}
      </div>

      {/* DESCRIPTION */}
      <div className="flex flex-col gap-1.5">
        <label className={label}>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={onChange}
          rows={3}
          className={field}
        />

        {errors.description && (
          <p className="text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      {/* QUANTITY */}
      {showQuantity && (
        <div className="flex flex-col gap-1.5">
          <label className={label}>Quantity</label>
          <input
            type="number"
            name="quantity"
            min="1"
            value={form.quantity}
            onChange={onChange}
            className={field}
          />

          {errors.quantity && (
            <p className="text-xs text-red-500">{errors.quantity}</p>
          )}
        </div>
      )}

      {/* DEPOSIT */}
      <div className="flex flex-col gap-1.5">
        <label className={label}>Deposit Amount</label>
        <input
          type="number"
          name="deposit_amount"
          min="0"
          step="0.01"
          value={form.deposit_amount}
          onChange={onChange}
          className={field}
        />

        {errors.deposit_amount && (
          <p className="text-xs text-red-500">
            {errors.deposit_amount}
          </p>
        )}
      </div>
    </>
  );
}