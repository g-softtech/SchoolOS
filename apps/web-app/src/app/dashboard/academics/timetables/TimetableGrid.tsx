'use client';

import React, { useState, useEffect } from 'react';
import { Subject } from '../subjects/page';
import { BellSchedule } from '../bell-schedules/page';

interface TimetableSlot {
  id?: string;
  dayOfWeek: number;
  periodId: string;
  subjectId: string;
  teacherId?: string;
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

export interface EligibleTeacher {
  id: string;
  membership?: {
    profile?: {
      firstName: string;
      lastName: string;
    }
  }
}

export default function TimetableGrid({
  timetable,
  slots: initialSlots,
  subjects,
  bellSchedules,
  eligibleTeachers = [],
  onSave,
  isSaving
}: {
  timetable: Timetable;
  slots: TimetableSlot[];
  subjects: Subject[];
  bellSchedules: BellSchedule[];
  eligibleTeachers?: EligibleTeacher[];
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
        newSlots.push({ dayOfWeek, periodId, subjectId, teacherId: 'UNASSIGNED' });
      }
    } else {
      if (existingIndex >= 0) {
        newSlots.splice(existingIndex, 1);
      }
    }
    
    setCurrentSlots(newSlots);
  };

  const handleTeacherSelect = (dayOfWeek: number, periodId: string, teacherId: string) => {
    const existingIndex = currentSlots.findIndex(s => s.dayOfWeek === dayOfWeek && s.periodId === periodId);
    if (existingIndex >= 0) {
      const newSlots = [...currentSlots];
      newSlots[existingIndex] = { ...newSlots[existingIndex], teacherId: teacherId || 'UNASSIGNED' };
      setCurrentSlots(newSlots);
    }
  };

  const getSlot = (dayOfWeek: number, periodId: string) => {
    return currentSlots.find(s => s.dayOfWeek === dayOfWeek && s.periodId === periodId);
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

      <div className="overflow-x-auto border rounded-lg shadow-sm pb-16">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 border-b">
            <tr>
              <th className="px-4 py-3 font-medium whitespace-nowrap bg-gray-100 sticky left-0 z-10 w-24">
                Period
              </th>
              {DAYS.map(day => (
                <th key={day.id} className="px-4 py-3 font-medium text-center border-l min-w-[200px]">
                  {day.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPeriods.map((period) => (
              <tr key={period.id} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3 bg-gray-50 sticky left-0 z-10 border-r">
                  <div className="font-medium text-gray-900">{period.name}</div>
                  <div className="text-xs text-gray-500">{period.startTime} - {period.endTime}</div>
                </td>
                {DAYS.map(day => {
                  const slot = getSlot(day.id, period.id);
                  const isAssigned = !!slot?.subjectId;
                  
                  return (
                    <td key={`${day.id}-${period.id}`} className="px-2 py-2 border-l relative group align-top">
                      <div className="space-y-1.5">
                        <select
                          className={`w-full p-2 border rounded text-xs transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                            isAssigned 
                              ? 'bg-blue-50 border-blue-200 text-blue-900 font-medium' 
                              : 'bg-transparent border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                          value={slot?.subjectId || ''}
                          onChange={(e) => handleSubjectSelect(day.id, period.id, e.target.value)}
                        >
                          <option value="">-- Empty --</option>
                          {subjects.map(sub => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name} ({sub.code})
                            </option>
                          ))}
                        </select>

                        {isAssigned && (
                          <select
                            className={`w-full p-1.5 border rounded text-[11px] transition-colors focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
                              slot.teacherId && slot.teacherId !== 'UNASSIGNED'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                                : 'bg-gray-50 border-gray-200 text-gray-500'
                            }`}
                            value={slot.teacherId || 'UNASSIGNED'}
                            onChange={(e) => handleTeacherSelect(day.id, period.id, e.target.value)}
                          >
                            <option value="UNASSIGNED">No Teacher</option>
                            {eligibleTeachers?.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.membership?.profile?.firstName} {t.membership?.profile?.lastName}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
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
