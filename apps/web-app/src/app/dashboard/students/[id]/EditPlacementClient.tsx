'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface ClassData {
  id: string;
  name: string;
  level: number;
  campusId?: string;
  arms: { id: string; name: string }[];
}

interface EditPlacementClientProps {
  studentId: string;
  currentArmId?: string;
  classes: ClassData[];
}

export default function EditPlacementClient({ studentId, currentArmId, classes }: EditPlacementClientProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find the class that currently contains the student's arm
  const initialClassId = classes.find(c => c.arms.some(a => a.id === currentArmId))?.id || '';

  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [selectedArmId, setSelectedArmId] = useState(currentArmId || '');

  const availableArms = classes.find(c => c.id === selectedClassId)?.arms || [];

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value);
    setSelectedArmId(''); // reset arm when class changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArmId) {
      setError('Please select an arm');
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/v1/academics/students/${studentId}/placement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ armId: selectedArmId })
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('You do not have permission to manage academic placement.');
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update academic placement');
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {currentArmId ? 'Change Placement' : 'Assign Placement'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Academic Placement
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Assign the student to an academic class and arm.
                  </p>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Class</label>
                    <select
                      value={selectedClassId}
                      onChange={handleClassChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">-- Select Class --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Arm</label>
                    <select
                      value={selectedArmId}
                      onChange={(e) => setSelectedArmId(e.target.value)}
                      disabled={!selectedClassId || availableArms.length === 0}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">-- Select Arm --</option>
                      {availableArms.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    {selectedClassId && availableArms.length === 0 && (
                      <p className="mt-1 text-xs text-red-500">This class has no configured arms.</p>
                    )}
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      disabled={isLoading || !selectedArmId}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                    >
                      {isLoading ? 'Saving...' : 'Save Placement'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
