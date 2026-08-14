'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentStatusClient({ studentId, currentState }: { studentId: string, currentState: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentState);

  const handleUpdate = async () => {
    if (selectedStatus === currentState) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/students/${studentId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus: selectedStatus, reason: 'Updated from Dashboard' })
      });
      if (res.ok) {
        router.refresh();
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <select 
        value={selectedStatus} 
        onChange={(e) => setSelectedStatus(e.target.value)}
        className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
      >
        <option value="PROVISIONED">PROVISIONED</option>
        <option value="PENDING_ACTIVATION">PENDING_ACTIVATION</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="SUSPENDED">SUSPENDED</option>
        <option value="ARCHIVED">ARCHIVED</option>
        <option value="OFFBOARDED">OFFBOARDED</option>
      </select>
      <button 
        onClick={handleUpdate} 
        disabled={loading || selectedStatus === currentState}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Update Status'}
      </button>
    </div>
  );
}
