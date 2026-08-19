'use client';

import React, { useState, useEffect } from 'react';
import { AcademicYear } from './page';

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export default function CalendarClient({
  initialYears,
  accessToken,
}: {
  initialYears: AcademicYear[];
  accessToken: string;
}) {
  const [years, setYears] = useState<AcademicYear[]>(initialYears);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(initialYears[0]?.id || null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [isCreatingYear, setIsCreatingYear] = useState(false);
  const [isCreatingTerm, setIsCreatingTerm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Year Form
  const [newYearName, setNewYearName] = useState('');
  const [newYearStart, setNewYearStart] = useState('');
  const [newYearEnd, setNewYearEnd] = useState('');

  // New Term Form
  const [newTermName, setNewTermName] = useState('');
  const [newTermStart, setNewTermStart] = useState('');
  const [newTermEnd, setNewTermEnd] = useState('');

  const fetchYears = async () => {
    try {
      const res = await fetch('/api/v1/academics/calendar/years', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setYears(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTerms = async (yearId: string) => {
    setLoadingTerms(true);
    try {
      const res = await fetch(`/api/v1/academics/calendar/years/${yearId}/terms`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTerms(data.data || []);
      } else {
        setTerms([]);
      }
    } catch (e) {
      console.error(e);
      setTerms([]);
    } finally {
      setLoadingTerms(false);
    }
  };

  useEffect(() => {
    if (selectedYearId) {
      fetchTerms(selectedYearId);
    } else {
      setTerms([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId]);

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/v1/academics/calendar/years', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newYearName,
          startDate: new Date(newYearStart).toISOString(),
          endDate: new Date(newYearEnd).toISOString()
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create year');
      }
      setIsCreatingYear(false);
      setNewYearName('');
      setNewYearStart('');
      setNewYearEnd('');
      await fetchYears();
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError('An unknown error occurred');
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedYearId) return;
    try {
      const res = await fetch(`/api/v1/academics/calendar/years/${selectedYearId}/terms`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newTermName,
          startDate: new Date(newTermStart).toISOString(),
          endDate: new Date(newTermEnd).toISOString()
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create term');
      }
      setIsCreatingTerm(false);
      setNewTermName('');
      setNewTermStart('');
      setNewTermEnd('');
      await fetchTerms(selectedYearId);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError('An unknown error occurred');
    }
  };

  const handleActivateYear = async (id: string) => {
    if (!confirm('Are you sure you want to activate this academic year? This may affect active operations.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/v1/academics/calendar/years/${id}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to activate year');
      }
      await fetchYears();
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError('An unknown error occurred');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left Column: Years List */}
      <div className="w-full md:w-1/3 border-r pr-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-lg">Years</h3>
          <button 
            onClick={() => setIsCreatingYear(!isCreatingYear)}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
          >
            + New Year
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
            {error}
          </div>
        )}

        {isCreatingYear && (
          <form onSubmit={handleCreateYear} className="p-4 bg-gray-50 border rounded-lg space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Name</label>
              <input required type="text" className="w-full border rounded p-2 text-sm mt-1" value={newYearName} onChange={e => setNewYearName(e.target.value)} placeholder="e.g. 2024/2025" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Start Date</label>
              <input required type="date" className="w-full border rounded p-2 text-sm mt-1" value={newYearStart} onChange={e => setNewYearStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">End Date</label>
              <input required type="date" className="w-full border rounded p-2 text-sm mt-1" value={newYearEnd} onChange={e => setNewYearEnd(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded">Save</button>
              <button type="button" onClick={() => setIsCreatingYear(false)} className="flex-1 bg-gray-200 text-gray-800 text-sm py-1.5 rounded">Cancel</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {years.length === 0 ? (
            <p className="text-sm text-gray-500">No academic years configured.</p>
          ) : (
            years.map(year => (
              <div 
                key={year.id} 
                onClick={() => setSelectedYearId(year.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedYearId === year.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{year.name}</h4>
                    <p className="text-xs text-gray-500">{new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}</p>
                  </div>
                  {year.status === 'ACTIVE' && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">ACTIVE</span>
                  )}
                  {year.status === 'UPCOMING' && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">UPCOMING</span>
                  )}
                </div>
                {year.status === 'UPCOMING' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleActivateYear(year.id); }}
                    className="mt-3 w-full border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-xs py-1.5 rounded transition-colors"
                  >
                    Activate Year
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Terms List */}
      <div className="w-full md:w-2/3 space-y-4">
        {selectedYearId ? (
          <>
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-lg">Terms for {years.find(y => y.id === selectedYearId)?.name}</h3>
              <button 
                onClick={() => setIsCreatingTerm(!isCreatingTerm)}
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
              >
                + New Term
              </button>
            </div>

            {isCreatingTerm && (
              <form onSubmit={handleCreateTerm} className="p-4 bg-gray-50 border rounded-lg space-y-3 w-1/2">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Name</label>
                  <input required type="text" className="w-full border rounded p-2 text-sm mt-1" value={newTermName} onChange={e => setNewTermName(e.target.value)} placeholder="e.g. Fall Term" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Start Date</label>
                  <input required type="date" className="w-full border rounded p-2 text-sm mt-1" value={newTermStart} onChange={e => setNewTermStart(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">End Date</label>
                  <input required type="date" className="w-full border rounded p-2 text-sm mt-1" value={newTermEnd} onChange={e => setNewTermEnd(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded">Save</button>
                  <button type="button" onClick={() => setIsCreatingTerm(false)} className="flex-1 bg-gray-200 text-gray-800 text-sm py-1.5 rounded">Cancel</button>
                </div>
              </form>
            )}

            {loadingTerms ? (
              <p className="text-sm text-gray-500">Loading terms...</p>
            ) : terms.length === 0 ? (
              <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50">
                No terms configured for this year.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {terms.map(term => (
                  <div key={term.id} className="p-4 border rounded-lg shadow-sm">
                    <h4 className="font-semibold text-gray-900">{term.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(term.startDate).toLocaleDateString()} - {new Date(term.endDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 h-full flex items-center justify-center">
            Select an Academic Year to view terms
          </div>
        )}
      </div>
    </div>
  );
}
