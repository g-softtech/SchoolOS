'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DepartmentResponse } from '../../../lib/api/staff';

export default function StaffSearchFilters({ departments }: { departments: DepartmentResponse[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [department, setDepartment] = useState(searchParams.get('department') || '');

  // Sync state with URL if user navigates back
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setDepartment(searchParams.get('department') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    
    if (q) {
      params.set('q', q);
    } else {
      params.delete('q');
    }

    if (department) {
      params.set('department', department);
    } else {
      params.delete('department');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    setQ('');
    setDepartment('');
    router.push(pathname);
  };

  return (
    <form onSubmit={handleSearch} className="mb-6 bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-end">
      <div className="flex-1 w-full">
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Search</label>
        <input
          type="text"
          id="search"
          placeholder="Name or Staff ID..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-1 block w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div className="w-full sm:w-64">
        <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Department</label>
        <select
          id="department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="mt-1 block w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          type="submit"
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Filter
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
