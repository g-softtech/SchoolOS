'use client';

import React, { useState } from 'react';
import { BellSchedule } from './page';
import BellScheduleForm from './BellScheduleForm';

export default function BellSchedulesClient({
  initialSchedules,
  accessToken,
}: {
  initialSchedules: BellSchedule[];
  accessToken: string;
}) {
  const [schedules, setSchedules] = useState<BellSchedule[]>(initialSchedules);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BellSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/v1/academics/timetables/bell-schedules', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (schedule: BellSchedule) => {
    setEditingSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingSchedule(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Bell Schedule?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/v1/academics/timetables/bell-schedules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete schedule');
      }
      await fetchSchedules();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'An unknown error occurred');
    }
  };

  const handleFormSuccess = async () => {
    setIsFormOpen(false);
    setEditingSchedule(null);
    await fetchSchedules();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-lg">Existing Schedules</h3>
        <button 
          onClick={handleCreate}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Bell Schedule
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50">
          No bell schedules configured.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {schedules.map(schedule => (
            <div key={schedule.id} className="p-5 border rounded-lg shadow-sm bg-white">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-semibold text-gray-900 text-lg">{schedule.name}</h4>
                <div className="flex gap-2 text-sm">
                  <button onClick={() => handleEdit(schedule)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(schedule.id)} className="text-red-600 hover:underline">Delete</button>
                </div>
              </div>

              <div className="space-y-2">
                {schedule.periods.map(period => (
                  <div key={period.id} className="flex justify-between p-2 bg-gray-50 rounded border text-sm">
                    <div>
                      <span className="font-medium">{period.name}</span>
                      {period.type && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 rounded text-gray-700">{period.type}</span>
                      )}
                    </div>
                    <div className="text-gray-600">
                      {period.startTime} - {period.endTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <BellScheduleForm 
          accessToken={accessToken}
          initialData={editingSchedule}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
