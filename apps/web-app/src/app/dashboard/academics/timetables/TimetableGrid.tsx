'use client';

import React, { useState, useEffect } from 'react';
import { Subject } from '../subjects/page';
import { BellSchedule } from '../bell-schedules/page';

interface TimetableSlot {
  id?: string;
  dayOfWeek: number;
  periodId: string;
  subjectId: string;
}

interface Timetable {
  id: string;
  armId: string;
  termId: string;
  config: { bellScheduleId: string };
}

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
];

export default function TimetableGrid({
  timetable,
  slots: initialSlots,
  subjects,
  bellSchedules,
  onSave,
  isSaving
}: {
  timetable: Timetable;
  slots: TimetableSlot[];
  subjects: Subject[];
  bellSchedules: BellSchedule[];
  onSave: (slots: TimetableSlot[]) => void;
  isSaving: boolean;
}) {
  const [currentSlots, setCurrentSlots] = useState<TimetableSlot[]>(initialSlots);
  
  useEffect(() => {
    setCurrentSlots(initialSlots);
  }, [initialSlots]);

  const bellSchedule = bellSchedules.find(b => b.id === timetable.config.bellScheduleId);
  const periods = bellSchedule?.periods || [];

  const handleSubjectSelect = (dayOfWeek: number, periodId: string, subjectId: string) => {
    const existingIndex = currentSlots.findIndex(s => s.dayOfWeek === dayOfWeek && s.periodId === periodId);
    
    const newSlots = [...currentSlots];
    if (subjectId) {
      if (existingIndex >= 0) {
        newSlots[existingIndex] = { ...newSlots[existingIndex], subjectId };
      } else {
        newSlots.push({ dayOfWeek, periodId, subjectId });
      }
    } else {
      if (existingIndex >= 0) {
        newSlots.splice(existingIndex, 1);
      }
    }
    
    setCurrentSlots(newSlots);
  };

  const getSlotSubjectId = (dayOfWeek: number, periodId: string) => {
    const slot = currentSlots.find(s => s.dayOfWeek === dayOfWeek && s.periodId === periodId);
    return slot?.subjectId || '';
  };

  if (!bellSchedule) {
    return <div className="text-red-500">Error: Could not load the Bell Schedule for this timetable.</div>;
  }

  if (periods.length === 0) {
    return <div className="text-gray-500 italic">This bell schedule has no periods.</div>;
  }

  // Sort periods by start time
  const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-800">Assign Subjects</h3>
        <button
          onClick={() => onSave(currentSlots)}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Timetable'}
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 border-b">
            <tr>
              <th className="px-4 py-3 font-medium whitespace-nowrap bg-gray-100 sticky left-0 z-10 w-24">
                Period
              </th>
              {DAYS.map(day => (
                <th key={day.id} className="px-4 py-3 font-medium text-center border-l min-w-[150px]">
                  {day.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPeriods.map((period, idx) => (
              <tr key={period.id} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3 bg-gray-50 sticky left-0 z-10 border-r">
                  <div className="font-medium text-gray-900">{period.name}</div>
                  <div className="text-xs text-gray-500">{period.startTime} - {period.endTime}</div>
                </td>
                {DAYS.map(day => {
                  const subjectId = getSlotSubjectId(day.id, period.id);
                  const isAssigned = !!subjectId;
                  
                  return (
                    <td key={`${day.id}-${period.id}`} className="px-2 py-2 border-l relative group">
                      <select
                        className={`w-full p-2 border rounded text-xs transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                          isAssigned 
                            ? 'bg-blue-50 border-blue-200 text-blue-900' 
                            : 'bg-transparent border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                        value={subjectId}
                        onChange={(e) => handleSubjectSelect(day.id, period.id, e.target.value)}
                      >
                        <option value="">-- Empty --</option>
                        {subjects.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name} ({sub.code})
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
