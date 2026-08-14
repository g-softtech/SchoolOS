'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export default function StudentSearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');

  // Sync state with URL if user navigates back
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setStatus(searchParams.get('status') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    
    if (q) {
      params.set('q', q);
    } else {
      params.delete('q');
    }

    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    setQ('');
    setStatus('');
    router.push(pathname);
  };

  return (
    <form onSubmit={handleSearch} className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 items-end">
      <div className="flex-1 w-full">
        <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search</label>
        <input
          type="text"
          id="search"
          placeholder="Name or Admission Number..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div className="w-full sm:w-48">
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ALUMNI">Alumni</option>
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
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
