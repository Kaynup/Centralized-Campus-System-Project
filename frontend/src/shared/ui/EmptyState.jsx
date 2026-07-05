export default function EmptyState({ title, message, icon }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate">{title}</h3>
      {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
    </div>
  );
}