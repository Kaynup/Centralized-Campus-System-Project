export default function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate/10">
      <table className="min-w-full text-sm">
        <thead className="bg-slate/5">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-2 text-left font-medium text-slate/70 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-slate/10 hover:bg-slate/5">
              {row.cells.map((cell, i) => (
                <td key={i} className="px-4 py-2 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}