'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Exam, examinationsApi } from '../../../lib/api/examinations';

interface ExaminationsClientProps {
  initialExams: Exam[];
  subjects: { id: string; name: string; code: string }[];
  academicYears: { id: string; name: string }[];
  accessToken: string;
}

export default function ExaminationsClient({
  initialExams,
  subjects,
  academicYears,
  accessToken,
}: ExaminationsClientProps) {
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [filterText, setFilterText] = useState('');
  
  // Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [isCBT, setIsCBT] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [yearId, setYearId] = useState('');
  const [termId, setTermId] = useState('');
  
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);

  const fetchExams = async () => {
    try {
      const res = await examinationsApi.getExams(accessToken) as unknown as { data?: Exam[] } | Exam[];
      if (Array.isArray(res)) setExams(res);
      else if (res.data) setExams(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (yearId) {
      // Fetch terms for the selected year
      fetch(`/api/v1/academics/calendar/years/${yearId}/terms`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      .then(r => r.json())
      .then(data => {
        setTerms(data.data || []);
        setTermId(''); // reset term when year changes
      })
      .catch(console.error);
    } else {
      setTerms([]);
    }
  }, [yearId, accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await examinationsApi.createExam({
        title,
        date: new Date(date).toISOString(),
        totalMarks: Number(totalMarks),
        isCBT,
        subjectId,
        termId
      }, accessToken) as unknown as { error?: { message: string } };

      if (res.error) throw new Error(res.error.message || 'Failed to create exam');
      
      setIsCreating(false);
      resetForm();
      await fetchExams();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam? This action is irreversible.')) return;
    try {
      await examinationsApi.deleteExam(id, accessToken);
      await fetchExams();
    } catch (e) {
      console.error(e);
      alert('Failed to delete exam');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTotalMarks(100);
    setIsCBT(false);
    setSubjectId('');
    setYearId('');
    setTermId('');
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(filterText.toLowerCase()) || 
    e.subject?.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <input 
          type="text" 
          placeholder="Filter exams by title or subject..." 
          className="border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-80 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          + Create Exam
        </button>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">Create New Exam</h3>
              <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Mid-Term Mathematics Exam" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                  <select required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={yearId} onChange={e => setYearId(e.target.value)}>
                    <option value="">Select Year</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                  <select required disabled={!yearId} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100" value={termId} onChange={e => setTermId(e.target.value)}>
                    <option value="">Select Term</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input required type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                  <input required type="number" min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} />
                </div>
              </div>

              <div className="flex items-center pt-2">
                <input id="isCBT" type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" checked={isCBT} onChange={e => setIsCBT(e.target.checked)} />
                <label htmlFor="isCBT" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                  Is Computer Based Test (CBT)?
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 rounded-lg text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Exam Title</th>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Total Marks</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No exams found.
                  </td>
                </tr>
              ) : (
                filteredExams.map(exam => (
                  <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{exam.title}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {exam.subject ? `${exam.subject.name} (${exam.subject.code})` : 'Unknown Subject'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{new Date(exam.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-600">{exam.totalMarks}</td>
                    <td className="px-6 py-4">
                      {exam.isCBT ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20">CBT</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">Written</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <Link 
                        href={`/dashboard/examinations/${exam.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                      >
                        Grade
                      </Link>
                      <button 
                        onClick={() => handleDelete(exam.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
