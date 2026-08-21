'use client';

import React, { useState } from 'react';
import { BellSchedule, BellPeriod } from './page';

interface BellScheduleFormProps {
  accessToken: string;
  initialData?: BellSchedule | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BellScheduleForm({
  accessToken,
  initialData,
  onSuccess,
  onCancel,
}: BellScheduleFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [periods, setPeriods] = useState<BellPeriod[]>(
    initialData?.periods || [
      { id: '1', name: 'Period 1', startTime: '08:00', endTime: '08:45', type: 'TEACHING' }
    ]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPeriod = () => {
    const newId = Date.now().toString();
    const lastPeriod = periods[periods.length - 1];
    
    // Default to starting when the last period ended, plus 45 minutes
    let newStart = '08:00';
    let newEnd = '08:45';
    
    if (lastPeriod && lastPeriod.endTime) {
      newStart = lastPeriod.endTime;
      const [h, m] = newStart.split(':').map(Number);
      const endTotalMins = h * 60 + m + 45;
      const endH = Math.floor(endTotalMins / 60) % 24;
      const endM = endTotalMins % 60;
      newEnd = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }

    setPeriods([
      ...periods,
      {
        id: newId,
        name: `Period ${periods.length + 1}`,
        startTime: newStart,
        endTime: newEnd,
        type: 'TEACHING'
      }
    ]);
  };

  const handleRemovePeriod = (id: string) => {
    setPeriods(periods.filter(p => p.id !== id));
  };

  const updatePeriod = (id: string, field: keyof BellPeriod, value: string) => {
    setPeriods(periods.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate periods client-side as well
      if (periods.length === 0) {
        throw new Error("You must add at least one period.");
      }

      for (const p of periods) {
        if (!p.name || !p.startTime || !p.endTime) {
          throw new Error("All periods must have a name, start time, and end time.");
        }
      }

      const payload = {
        name,
        periods: periods.map((p) => ({
          id: p.id.length < 10 ? `p-${p.id}` : p.id,
          name: p.name,
          startTime: p.startTime,
          endTime: p.endTime,
          type: p.type || 'TEACHING'
        }))
      };

      const url = initialData 
        ? `/api/v1/academics/timetables/bell-schedules/${initialData.id}`
        : '/api/v1/academics/timetables/bell-schedules';
        
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        // The backend might return an array of error messages from class-validator
        if (Array.isArray(err.message)) {
          throw new Error(err.message.join(', '));
        }
        throw new Error(err.message || 'Failed to save bell schedule');
      }

      onSuccess();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Bell Schedule' : 'Create Bell Schedule'}
          </h2>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
              {error}
            </div>
          )}

          <form id="bell-schedule-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
              <input
                required
                type="text"
                className="w-full border rounded-md p-2"
                placeholder="e.g. Regular Day, Half Day"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">Periods</label>
                <button
                  type="button"
                  onClick={handleAddPeriod}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded border"
                >
                  + Add Period
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {periods.map((period) => (
                  <div key={period.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-50 border rounded-md relative items-start sm:items-center">
                    
                    <div className="flex-1 w-full sm:w-auto">
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input
                        required
                        type="text"
                        className="w-full border rounded p-1.5 text-sm"
                        value={period.name}
                        onChange={e => updatePeriod(period.id, 'name', e.target.value)}
                        placeholder="e.g. Period 1"
                      />
                    </div>

                    <div className="w-full sm:w-32">
                      <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                      <input
                        required
                        type="time"
                        className="w-full border rounded p-1.5 text-sm"
                        value={period.startTime}
                        onChange={e => updatePeriod(period.id, 'startTime', e.target.value)}
                      />
                    </div>

                    <div className="w-full sm:w-32">
                      <label className="block text-xs text-gray-500 mb-1">End Time</label>
                      <input
                        required
                        type="time"
                        className="w-full border rounded p-1.5 text-sm"
                        value={period.endTime}
                        onChange={e => updatePeriod(period.id, 'endTime', e.target.value)}
                      />
                    </div>

                    <div className="w-full sm:w-32">
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <select
                        className="w-full border rounded p-1.5 text-sm bg-white"
                        value={period.type || 'TEACHING'}
                        onChange={e => updatePeriod(period.id, 'type', e.target.value)}
                      >
                        <option value="TEACHING">Teaching</option>
                        <option value="BREAK">Break</option>
                        <option value="ASSEMBLY">Assembly</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePeriod(period.id)}
                      className="mt-6 text-red-500 hover:text-red-700 p-1.5"
                      title="Remove Period"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))}
                {periods.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No periods added. Click &quot;Add Period&quot; to start.</p>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="bell-schedule-form"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
