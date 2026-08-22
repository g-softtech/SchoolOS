'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { leaveApi } from '../../../../lib/api/leave';

export default function ReviewLeaveModal({ 
  leaveId, 
  token 
}: { 
  leaveId: string;
  token?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'APPROVED' | 'REJECTED' | 'CANCELED'>('APPROVED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await leaveApi.reviewLeaveRequest(leaveId, { status }, token);
      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to review leave request');
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 text-sm font-medium transition-colors"
      >
        Review
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md p-6 text-left">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Review Leave Request</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Action <span className="text-red-500">*</span></label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'APPROVED' | 'REJECTED' | 'CANCELED')}
                  className="mt-1 block w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="APPROVED">Approve Request</option>
                  <option value="REJECTED">Reject Request</option>
                  <option value="CANCELED">Cancel Request</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-medium"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded-md disabled:opacity-50 text-sm font-medium shadow-sm transition-colors ${
                    status === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 
                    status === 'REJECTED' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
