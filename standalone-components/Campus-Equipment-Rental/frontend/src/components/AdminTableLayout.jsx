export default function AdminTableLayout({
  sectionLabel,
  title,
  action,
  toolbar,
  children,
  isEmpty,
  emptyMessage,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="label-caps mb-1">{sectionLabel}</p>

          <h1 className="text-2xl font-medium text-brand-black">
            {title}
          </h1>
        </div>

        {action}
      </div>

      {toolbar && (
        <div className="mb-4">
          {toolbar}
        </div>
      )}

      <div className="bg-white border border-stone-100 rounded-2xl overflow-x-auto">
        {children}

        {isEmpty && (
          <div className="text-center py-12">
            <p className="text-stone-400">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}