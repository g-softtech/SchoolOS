'use client';

import React, { useState, useEffect } from 'react';
import { AcademicYear } from '../calendar/page';
import { Campus, Class, Arm } from '../structure/page';
import { Subject } from '../subjects/page';
import { BellSchedule } from '../bell-schedules/page';
import TimetableGrid from './TimetableGrid';

interface Term {
  id: string;
  name: string;
}

interface TimetableSlot {
  id?: string;
  dayOfWeek: number;
  periodId: string;
  subjectId: string;
  teacherId?: string;
  classId?: string;
}

interface Timetable {
  id: string;
  armId: string;
  termId: string;
  config: { bellScheduleId: string };
  TimetableSlot?: TimetableSlot[];
}

export default function TimetableBuilderClient({
  initialYears,
  initialCampuses,
  initialClasses,
  subjects,
  bellSchedules,
  accessToken
}: {
  initialYears: AcademicYear[];
  initialCampuses: Campus[];
  initialClasses: Class[];
  subjects: Subject[];
  bellSchedules: BellSchedule[];
  accessToken: string;
}) {
  const [selectedYearId, setSelectedYearId] = useState('');
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedArmId, setSelectedArmId] = useState('');
  
  const [activeTimetable, setActiveTimetable] = useState<Timetable | null>(null);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBellIdForInit, setSelectedBellIdForInit] = useState('');

  // Fetch terms when year changes
  useEffect(() => {
    if (selectedYearId) {
      fetchTerms(selectedYearId);
    } else {
      setTerms([]);
      setSelectedTermId('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId]);

  const fetchTerms = async (yearId: string) => {
    try {
      const res = await fetch(`/api/v1/academics/calendar/years/${yearId}/terms`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTerms(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadTimetable = async () => {
    if (!selectedArmId || !selectedTermId) return;
    setLoading(true);
    setError(null);
    setActiveTimetable(null);
    setSlots([]);
    
    try {
      const res = await fetch(`/api/v1/academics/timetables/lookup?armId=${selectedArmId}&termId=${selectedTermId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setActiveTimetable(data.data);
        setSlots(data.data.TimetableSlot || []);
      } else if (res.status === 404) {
        // Not found is fine, we just haven't created it yet
        setActiveTimetable(null);
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to lookup timetable');
      }
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'An error occurred fetching the timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!selectedArmId || !selectedTermId || !selectedBellIdForInit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/academics/timetables', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          armId: selectedArmId,
          termId: selectedTermId,
          bellScheduleId: selectedBellIdForInit
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to initialize timetable');
      }
      
      // Reload it
      await handleLoadTimetable();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'An error occurred initializing the timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSlots = async (updatedSlots: TimetableSlot[]) => {
    if (!activeTimetable) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/academics/timetables/${activeTimetable.id}/slots`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ slots: updatedSlots })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Failed to save slots');
      }
      
      const data = await res.json();
      setSlots(data.data || []);
      alert('Timetable saved successfully!');
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'An error occurred saving slots');
    } finally {
      setLoading(false);
    }
  };

  // Filter classes by campus if campus is selected (optional logic, some schools might not strict-bind)
  const filteredClasses = selectedCampusId 
    ? initialClasses.filter(c => c.campusId === selectedCampusId || !c.campusId)
    : initialClasses;

  const selectedClassObj = initialClasses.find(c => c.id === selectedClassId);
  const arms = selectedClassObj?.arms || [];

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Academic Year</label>
          <select 
            className="w-full border rounded p-2 text-sm bg-white"
            value={selectedYearId}
            onChange={e => { setSelectedYearId(e.target.value); setActiveTimetable(null); }}
          >
            <option value="">Select Year...</option>
            {initialYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Term</label>
          <select 
            className="w-full border rounded p-2 text-sm bg-white disabled:opacity-50"
            value={selectedTermId}
            onChange={e => { setSelectedTermId(e.target.value); setActiveTimetable(null); }}
            disabled={!selectedYearId || terms.length === 0}
          >
            <option value="">Select Term...</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Campus (Optional)</label>
          <select 
            className="w-full border rounded p-2 text-sm bg-white"
            value={selectedCampusId}
            onChange={e => { setSelectedCampusId(e.target.value); setSelectedClassId(''); setSelectedArmId(''); setActiveTimetable(null); }}
          >
            <option value="">All Campuses</option>
            {initialCampuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Class</label>
          <select 
            className="w-full border rounded p-2 text-sm bg-white"
            value={selectedClassId}
            onChange={e => { setSelectedClassId(e.target.value); setSelectedArmId(''); setActiveTimetable(null); }}
          >
            <option value="">Select Class...</option>
            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Arm</label>
          <select 
            className="w-full border rounded p-2 text-sm bg-white disabled:opacity-50"
            value={selectedArmId}
            onChange={e => { setSelectedArmId(e.target.value); setActiveTimetable(null); }}
            disabled={!selectedClassId || arms.length === 0}
          >
            <option value="">Select Arm...</option>
            {arms.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-end border-b pb-4">
        <button
          onClick={handleLoadTimetable}
          disabled={!selectedArmId || !selectedTermId || loading}
          className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load Timetable'}
        </button>
      </div>

      {/* Content Area */}
      {selectedArmId && selectedTermId && (
        <div className="pt-4">
          {!activeTimetable && !loading ? (
            <div className="border border-dashed rounded-lg p-10 text-center bg-gray-50">
              <h3 className="text-gray-700 font-medium mb-2">No Timetable Initialized</h3>
              <p className="text-sm text-gray-500 mb-6">There is no timetable for this Arm and Term. Initialize one below.</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <select
                  className="border rounded p-2 text-sm bg-white w-64"
                  value={selectedBellIdForInit}
                  onChange={e => setSelectedBellIdForInit(e.target.value)}
                >
                  <option value="">Select Bell Schedule...</option>
                  {bellSchedules.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleInitialize}
                  disabled={!selectedBellIdForInit || loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Initialize
                </button>
              </div>
            </div>
          ) : activeTimetable ? (
            <TimetableGrid 
              timetable={activeTimetable}
              slots={slots}
              subjects={subjects}
              bellSchedules={bellSchedules}
              onSave={handleSaveSlots}
              isSaving={loading}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
