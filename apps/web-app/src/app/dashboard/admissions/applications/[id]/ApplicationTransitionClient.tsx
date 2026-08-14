"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stage {
  id: string;
  name: string;
  orderIndex: number;
}

export default function ApplicationTransitionClient({ 
  applicationId, 
  currentStageId, 
  stages, 
  token 
}: { 
  applicationId: string;
  currentStageId?: string;
  stages: Stage[];
  token?: string;
}) {
  const router = useRouter();
  
  const [selectedStageId, setSelectedStageId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentIndex = stages.findIndex(s => s.id === currentStageId);
  // Valid transitions usually mean moving to a subsequent stage (or any stage, depending on workflow). 
  // We'll show all stages except the current one.
  const availableStages = stages.filter(s => s.id !== currentStageId);

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStageId) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/v1/admissions/workflows/applications/${applicationId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetStageId: selectedStageId,
          version: 1 // Using version 1 by default, ideally passed from application entity if optimistic concurrency is enforced
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to transition application');
      }

      setSuccess('Application transitioned successfully.');
      setSelectedStageId('');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (stages.length === 0) return null;

  return (
    <form onSubmit={handleTransition} className="mt-6 border-t pt-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Transition Application</h3>
      
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded text-sm">{success}</div>}

      <div className="flex gap-2">
        <select
          value={selectedStageId}
          onChange={e => setSelectedStageId(e.target.value)}
          className="flex-1 border-gray-300 rounded-md shadow-sm p-2 border text-sm focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select Next Stage...</option>
          {availableStages.map(stage => (
            <option key={stage.id} value={stage.id}>
              {stage.orderIndex}. {stage.name} {stage.orderIndex > currentIndex ? '(Advance)' : '(Revert)'}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!selectedStageId || isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {isSubmitting ? 'Moving...' : 'Transition'}
        </button>
      </div>
    </form>
  );
}
