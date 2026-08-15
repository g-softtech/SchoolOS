'use client';

import React, { useState } from 'react';
import { Campus, Class } from './page';

export default function StructureClient({
  initialCampuses,
  initialClasses,
  accessToken,
}: {
  initialCampuses: Campus[];
  initialClasses: Class[];
  accessToken: string;
}) {
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses);
  const [classes, setClasses] = useState<Class[]>(initialClasses);
  const [error, setError] = useState<string | null>(null);

  const [isCreatingCampus, setIsCreatingCampus] = useState(false);
  const [newCampusName, setNewCampusName] = useState('');
  const [newCampusAddress, setNewCampusAddress] = useState('');

  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassLevel, setNewClassLevel] = useState(1);
  const [newClassCampusId, setNewClassCampusId] = useState('');

  const [isCreatingArm, setIsCreatingArm] = useState<string | null>(null); // classId
  const [newArmName, setNewArmName] = useState('');
  const [newArmCapacity, setNewArmCapacity] = useState(30);

  const fetchCampuses = async () => {
    try {
      const res = await fetch('/api/v1/academics/structure/campuses', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampuses(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/v1/academics/structure/classes', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/v1/academics/structure/campuses', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newCampusName, address: newCampusAddress })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create campus');
      setIsCreatingCampus(false);
      setNewCampusName('');
      setNewCampusAddress('');
      await fetchCampuses();
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError('An unknown error occurred');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/v1/academics/structure/classes', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: newClassName, 
          level: newClassLevel, 
          campusId: newClassCampusId || undefined 
        })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create class');
      setIsCreatingClass(false);
      setNewClassName('');
      setNewClassLevel(1);
      setNewClassCampusId('');
      await fetchClasses();
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError('An unknown error occurred');
    }
  };

  const handleCreateArm = async (e: React.FormEvent, classId: string) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/v1/academics/structure/arms', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          classId,
          name: newArmName,
          capacity: newArmCapacity
        })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create arm');
      setIsCreatingArm(null);
      setNewArmName('');
      setNewArmCapacity(30);
      await fetchClasses();
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError('An unknown error occurred');
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Campuses Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg">Campuses</h3>
          <button 
            onClick={() => setIsCreatingCampus(!isCreatingCampus)}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
          >
            + New Campus
          </button>
        </div>

        {isCreatingCampus && (
          <form onSubmit={handleCreateCampus} className="p-4 bg-gray-50 border rounded-lg space-y-3 mb-4 w-full md:w-1/2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Name</label>
              <input required type="text" className="w-full border rounded p-2 text-sm mt-1" value={newCampusName} onChange={e => setNewCampusName(e.target.value)} placeholder="e.g. Main Campus" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Address (Optional)</label>
              <input type="text" className="w-full border rounded p-2 text-sm mt-1" value={newCampusAddress} onChange={e => setNewCampusAddress(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded">Save</button>
              <button type="button" onClick={() => setIsCreatingCampus(false)} className="flex-1 bg-gray-200 text-gray-800 text-sm py-1.5 rounded">Cancel</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {campuses.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-3">No campuses configured.</p>
          ) : (
            campuses.map(campus => (
              <div key={campus.id} className="p-4 rounded-lg border border-gray-200 shadow-sm bg-white">
                <h4 className="font-semibold">{campus.name}</h4>
                {campus.address && <p className="text-xs text-gray-500 mt-1">{campus.address}</p>}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Classes Section */}
      <section>
        <div className="flex justify-between items-center mb-4 mt-8 border-t pt-8">
          <h3 className="font-medium text-lg">Classes & Arms</h3>
          <button 
            onClick={() => setIsCreatingClass(!isCreatingClass)}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
          >
            + New Class
          </button>
        </div>

        {isCreatingClass && (
          <form onSubmit={handleCreateClass} className="p-4 bg-gray-50 border rounded-lg space-y-3 mb-4 w-full md:w-1/2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Name</label>
              <input required type="text" className="w-full border rounded p-2 text-sm mt-1" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="e.g. Grade 1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Level (Numeric sort order)</label>
              <input required type="number" min={1} className="w-full border rounded p-2 text-sm mt-1" value={newClassLevel} onChange={e => setNewClassLevel(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Campus (Optional)</label>
              <select className="w-full border rounded p-2 text-sm mt-1" value={newClassCampusId} onChange={e => setNewClassCampusId(e.target.value)}>
                <option value="">None</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded">Save</button>
              <button type="button" onClick={() => setIsCreatingClass(false)} className="flex-1 bg-gray-200 text-gray-800 text-sm py-1.5 rounded">Cancel</button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {classes.length === 0 ? (
            <p className="text-sm text-gray-500">No classes configured.</p>
          ) : (
            classes.map(cls => (
              <div key={cls.id} className="p-4 rounded-lg border border-gray-200 shadow-sm bg-white">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-semibold text-lg">{cls.name} <span className="text-sm font-normal text-gray-500 ml-2">Level {cls.level}</span></h4>
                    {cls.campusId && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        {campuses.find(c => c.id === cls.campusId)?.name}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => setIsCreatingArm(cls.id)}
                    className="text-xs border border-blue-600 text-blue-600 px-2 py-1 rounded hover:bg-blue-50"
                  >
                    + Add Arm
                  </button>
                </div>

                {isCreatingArm === cls.id && (
                  <form onSubmit={(e) => handleCreateArm(e, cls.id)} className="p-3 bg-gray-50 border rounded space-y-3 mb-4 w-full md:w-1/2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Arm Name</label>
                      <input required type="text" className="w-full border rounded p-1.5 text-sm mt-1" value={newArmName} onChange={e => setNewArmName(e.target.value)} placeholder="e.g. A, Green, Science" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Capacity</label>
                      <input required type="number" min={1} className="w-full border rounded p-1.5 text-sm mt-1" value={newArmCapacity} onChange={e => setNewArmCapacity(parseInt(e.target.value) || 30)} />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded">Save Arm</button>
                      <button type="button" onClick={() => setIsCreatingArm(null)} className="flex-1 bg-gray-200 text-gray-800 text-xs py-1.5 rounded">Cancel</button>
                    </div>
                  </form>
                )}

                {cls.arms && cls.arms.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {cls.arms.map(arm => (
                      <div key={arm.id} className="bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span className="text-sm font-medium">{arm.name}</span>
                        <span className="text-xs text-gray-500 bg-white px-1.5 rounded-full">{arm.capacity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No arms in this class.</p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
