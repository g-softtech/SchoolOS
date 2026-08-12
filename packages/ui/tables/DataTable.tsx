import React from 'react';

export interface DataTableProps<T> {
  data: T[];
  columns: { key: keyof T | string; header: string; render?: (row: T) => React.ReactNode }[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

export function DataTable<T>({ data, columns, onRowClick, isLoading }: DataTableProps<T>) {
  if (isLoading) return <div className="p-4">Loading data...</div>;
  if (!data.length) return <div className="p-4 text-gray-500">No records found.</div>;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-3 text-left font-medium text-gray-700 uppercase tracking-wider">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIdx) => (
            <tr 
              key={rowIdx} 
              onClick={() => onRowClick && onRowClick(row)}
              className={onRowClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {col.render ? col.render(row) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
