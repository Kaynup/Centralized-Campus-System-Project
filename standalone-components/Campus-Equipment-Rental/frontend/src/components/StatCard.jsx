export default function StatCard({
  title,
  value,
  accent = "bg-primary",
}) {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-all duration-200">
      <div
        className={`h-1.5 w-14 rounded-full ${accent}`}
      />

      <p className="mt-4 text-sm text-stone-500">
        {title}
      </p>

      <h2 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
        {value}
      </h2>
    </div>
  );
}