'use client';

import React, { useState, useEffect } from 'react';
import { Exam, examinationsApi, EligibleCandidate, BatchEnterResultItem } from '../../../../lib/api/examinations';

interface MarkingSheetClientProps {
  exam: Exam;
  accessToken: string;
}

export default function MarkingSheetClient({ exam, accessToken }: MarkingSheetClientProps) {
  const [candidates, setCandidates] = useState<EligibleCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Track local edits: mapping of studentId to new score
  const [edits, setEdits] = useState<Record<string, string>>({});
  const hasUnsavedChanges = Object.keys(edits).length > 0;

  useEffect(() => {
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id, accessToken]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await examinationsApi.getEligibleCandidates(exam.id, accessToken) as unknown as { data?: EligibleCandidate[] } | EligibleCandidate[];
      const data = Array.isArray(res) ? res : res.data || [];
      setCandidates(data);
      // Initialize edits object
      const initialEdits: Record<string, string> = {};
      data.forEach(c => {
        initialEdits[c.studentId] = c.score !== null ? String(c.score) : '';
      });
      setEdits(initialEdits);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to load eligible candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (studentId: string, value: string) => {
    setEdits(prev => ({
      ...prev,
      [studentId]: value
    }));
    setSuccessMsg(null);
    setError(null);
  };

  const handleSaveAll = async () => {
    setError(null);
    setSuccessMsg(null);
    
    // Validate scores locally first
    const resultsPayload: BatchEnterResultItem[] = [];
    for (const [studentId, valStr] of Object.entries(edits)) {
      if (valStr.trim() === '') continue; // Skip empty
      const score = Number(valStr);
      if (isNaN(score)) {
        setError('One or more scores are invalid numbers.');
        return;
      }
      if (score < 0 || score > exam.totalMarks) {
        setError(`Scores must be between 0 and ${exam.totalMarks}.`);
        return;
      }
      resultsPayload.push({ studentId, score });
    }

    if (resultsPayload.length === 0) {
      setError('No scores to save.');
      return;
    }

    setSaving(true);
    try {
      const res = await examinationsApi.batchEnterResults(exam.id, resultsPayload, accessToken) as unknown as { error?: { message: string } };
      if (res?.error) throw new Error(res.error.message);
      
      setSuccessMsg('Results saved successfully!');
      // Re-fetch to clear unsaved changes state natively
      await fetchCandidates();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 text-gray-500">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Loading candidates...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-lg border border-blue-100">
        <div className="text-sm text-blue-800">
          <span className="font-semibold">{candidates.length}</span> eligible candidates loaded.
        </div>
        <button 
          onClick={handleSaveAll}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Results'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
          {successMsg}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-6 py-4 font-medium">Student Name</th>
              <th className="px-6 py-4 font-medium">Admission No.</th>
              <th className="px-6 py-4 font-medium">Score (Max: {exam.totalMarks})</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No eligible candidates found for this subject/term.
                </td>
              </tr>
            ) : (
              candidates.map(candidate => {
                const isEdited = edits[candidate.studentId] !== (candidate.score !== null ? String(candidate.score) : '');
                
                return (
                  <tr key={candidate.studentId} className={`hover:bg-gray-50/50 transition-colors ${isEdited ? 'bg-yellow-50/20' : ''}`}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {candidate.student.user.firstName} {candidate.student.user.lastName}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {candidate.student.admissionNumber}
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        min="0"
                        max={exam.totalMarks}
                        className={`w-24 border rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:outline-none transition-colors ${isEdited ? 'border-yellow-400 focus:ring-yellow-400 bg-yellow-50' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                        value={edits[candidate.studentId] ?? ''}
                        onChange={(e) => handleScoreChange(candidate.studentId, e.target.value)}
                        placeholder="--"
                      />
                    </td>
                    <td className="px-6 py-4">
                      {isEdited ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Unsaved
                        </span>
                      ) : candidate.isNew ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          No Score
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Saved
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
