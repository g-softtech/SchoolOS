'use client';

import React, { useState } from 'react';
import { Subject, SubjectGroup } from './page';
import { Class } from '../structure/page';

export default function SubjectsClient({
  initialGroups,
  initialSubjects,
  classes,
  accessToken,
}: {
  initialGroups: SubjectGroup[];
  initialSubjects: Subject[];
  classes: Class[];
  accessToken: string;
}) {
  const [groups, setGroups] = useState<SubjectGroup[]>(initialGroups);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [error, setError] = useState<string | null>(null);

  // New Group
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // New Subject
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectGroupId, setNewSubjectGroupId] = useState('');

  // Mapping
  const [isMapping, setIsMapping] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/v1/academics/structure/subject-groups', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/v1/academics/structure/subjects', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/v1/academics/structure/subject-groups', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create subject group');
      setIsCreatingGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      await fetchGroups();
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError('An unknown error occurred');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/v1/academics/structure/subjects', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: newSubjectName, 
          code: newSubjectCode,
          groupId: newSubjectGroupId || undefined 
        })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create subject');
      setIsCreatingSubject(false);
      setNewSubjectName('');
      setNewSubjectCode('');
      setNewSubjectGroupId('');
      await fetchSubjects();
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError('An unknown error occurred');
    }
  };

  const handleMapSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedClassId) return;
    try {
      const res = await fetch(`/api/v1/academics/structure/classes/${selectedClassId}/subjects`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subjectIds: selectedSubjectIds })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to map subjects');
      setIsMapping(false);
      setSelectedClassId('');
      setSelectedSubjectIds([]);
      alert('Subjects mapped successfully!');
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError('An unknown error occurred');
    }
  };

  const toggleSubjectSelection = (id: string) => {
    setSelectedSubjectIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Top Section: Groups and Subjects */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Subject Groups */}
        <div className="w-full md:w-1/3 border-r pr-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-lg">Subject Groups</h3>
            <button 
              onClick={() => setIsCreatingGroup(!isCreatingGroup)}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
            >
              + New Group
            </button>
          </div>

          {isCreatingGroup && (
            <form onSubmit={handleCreateGroup} className="p-4 bg-gray-50 border rounded-lg space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Name</label>
                <input required type="text" className="w-full border rounded p-2 text-sm mt-1" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Sciences" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded">Save</button>
                <button type="button" onClick={() => setIsCreatingGroup(false)} className="flex-1 bg-gray-200 text-gray-800 text-sm py-1.5 rounded">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-sm text-gray-500">No subject groups configured.</p>
            ) : (
              groups.map(group => (
                <div key={group.id} className="p-3 rounded-lg border border-gray-200 shadow-sm bg-white">
                  <h4 className="font-semibold text-gray-900">{group.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{subjects.filter(s => s.groupId === group.id).length} subjects</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Subjects */}
        <div className="w-full md:w-2/3 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-lg">Subjects</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsMapping(!isMapping)}
                className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700"
              >
                Map to Class
              </button>
              <button 
                onClick={() => setIsCreatingSubject(!isCreatingSubject)}
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
              >
                + New Subject
              </button>
            </div>
          </div>

          {isCreatingSubject && (
            <form onSubmit={handleCreateSubject} className="p-4 bg-gray-50 border rounded-lg space-y-3 w-1/2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Name</label>
                <input required type="text" className="w-full border rounded p-2 text-sm mt-1" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g. Mathematics" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Code</label>
                <input required type="text" className="w-full border rounded p-2 text-sm mt-1" value={newSubjectCode} onChange={e => setNewSubjectCode(e.target.value)} placeholder="e.g. MTH101" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Group (Optional)</label>
                <select className="w-full border rounded p-2 text-sm mt-1" value={newSubjectGroupId} onChange={e => setNewSubjectGroupId(e.target.value)}>
                  <option value="">None</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded">Save</button>
                <button type="button" onClick={() => setIsCreatingSubject(false)} className="flex-1 bg-gray-200 text-gray-800 text-sm py-1.5 rounded">Cancel</button>
              </div>
            </form>
          )}

          {isMapping && (
            <form onSubmit={handleMapSubjects} className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-4">
              <h4 className="font-semibold text-indigo-900">Map Subjects to Class</h4>
              <div>
                <label className="block text-xs font-medium text-indigo-800">Select Class</label>
                <select required className="w-full border border-indigo-200 rounded p-2 text-sm mt-1" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                  <option value="">-- Choose a class --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} (Level {c.level})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-indigo-800 mb-2">Select Subjects</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-indigo-200 rounded bg-white">
                  {subjects.map(s => (
                    <label key={s.id} className="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={selectedSubjectIds.includes(s.id)}
                        onChange={() => toggleSubjectSelection(s.id)}
                        className="rounded text-indigo-600"
                      />
                      <span>{s.name} <span className="text-gray-400 text-xs">({s.code})</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white text-sm py-1.5 rounded">Apply Mapping</button>
                <button type="button" onClick={() => setIsMapping(false)} className="flex-1 bg-gray-200 text-gray-800 text-sm py-1.5 rounded">Cancel</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-500">No subjects configured.</p>
            ) : (
              subjects.map(subject => (
                <div key={subject.id} className="p-4 rounded-lg border border-gray-200 shadow-sm bg-white flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">{subject.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{subject.code}</p>
                  </div>
                  {subject.groupId && (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {groups.find(g => g.id === subject.groupId)?.name}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
