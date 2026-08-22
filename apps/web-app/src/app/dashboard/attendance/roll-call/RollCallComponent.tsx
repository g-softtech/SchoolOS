'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../../../../lib/api';

interface RollCallComponentProps {
  token: string;
}

interface Arm {
  id: string;
  name: string;
}

interface ClassData {
  id: string;
  name: string;
  arms: Arm[];
}

interface Student {
  id: string;
  admissionNumber: string;
  membership: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface AttendanceRecord {
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string;
}

interface RosterItem {
  studentId: string;
  admissionNumber: string;
  name: string;
  originalStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'NOT_MARKED';
  currentStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'NOT_MARKED';
  isScanned: boolean;
}

export default function RollCallComponent({ token }: RollCallComponentProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedArmId, setSelectedArmId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Classes and Arms on mount
    const loadClasses = async () => {
      try {
        const res = await fetchApi<ClassData[]>('/api/v1/academics/structure/classes', { token });
        setClasses(res || []);
      } catch {
        setError('Failed to load classes.');
      }
    };
    loadClasses();
  }, [token]);

  useEffect(() => {
    if (!selectedArmId || !selectedDate) {
      setRoster([]);
      return;
    }

    const loadRoster = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch Students in Arm
        const studentsRes = await fetchApi<{ data: Student[] }>(`/api/v1/students/search?armId=${selectedArmId}&limit=100`, { token });
        const students = studentsRes.data || [];

        // 2. Fetch Existing Attendance
        const attendanceRes = await fetchApi<AttendanceRecord[]>(`/api/v1/attendance/daily?armId=${selectedArmId}&date=${selectedDate}`, { token });
        const attendance = attendanceRes || [];

        // 3. Merge
        const merged: RosterItem[] = students.map((stu) => {
          const record = attendance.find(a => a.studentId === stu.id);
          const isScanned = record?.remarks === 'Arrival Scanned';
          
          return {
            studentId: stu.id,
            admissionNumber: stu.admissionNumber,
            name: `${stu.membership.profile.firstName} ${stu.membership.profile.lastName}`,
            originalStatus: record ? record.status : 'NOT_MARKED',
            currentStatus: record ? record.status : 'NOT_MARKED',
            isScanned
          };
        });

        // Sort alphabetically
        merged.sort((a, b) => a.name.localeCompare(b.name));
        setRoster(merged);
      } catch {
        setError('Failed to load roster.');
      } finally {
        setLoading(false);
      }
    };

    loadRoster();
  }, [selectedArmId, selectedDate, token]);

  const handleStatusChange = (studentId: string, newStatus: RosterItem['currentStatus']) => {
    setRoster(prev => prev.map(item => {
      if (item.studentId === studentId) {
        if (item.isScanned && item.originalStatus === 'PRESENT' && newStatus !== 'PRESENT') {
          const confirmChange = window.confirm('This student was recorded as arriving at the school gate via scanner. Are you sure you want to change this attendance?');
          if (!confirmChange) return item;
        }
        return { ...item, currentStatus: newStatus };
      }
      return item;
    }));
  };

  const markAllPresent = () => {
    setRoster(prev => prev.map(item => {
      if (item.currentStatus === 'NOT_MARKED') {
        return { ...item, currentStatus: 'PRESENT' };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    const notMarkedCount = roster.filter(r => r.currentStatus === 'NOT_MARKED').length;
    if (notMarkedCount > 0) {
      const confirmSave = window.confirm(`${notMarkedCount} students are still unmarked. Save anyway?`);
      if (!confirmSave) return;
    }

    setSaving(true);
    setError(null);
    try {
      const recordsToSave = roster
        .filter(r => r.currentStatus !== 'NOT_MARKED')
        .map(r => {
          // Preserve the scanned remark if it was scanned and remains PRESENT
          let remarks = undefined;
          if (r.isScanned && r.currentStatus === 'PRESENT') {
            remarks = 'Arrival Scanned';
          } else if (r.originalStatus !== r.currentStatus) {
            remarks = 'Manual Roll Call';
          }

          return {
            studentId: r.studentId,
            status: r.currentStatus,
            remarks
          };
        });

      if (recordsToSave.length > 0) {
        await fetchApi('/api/v1/attendance/daily', {
          method: 'POST',
          token,
          body: JSON.stringify({
            armId: selectedArmId,
            date: selectedDate,
            records: recordsToSave
          })
        });
      }
      
      alert('Roll call saved successfully!');
      
      // Update original statuses
      setRoster(prev => prev.map(item => ({
        ...item,
        originalStatus: item.currentStatus
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save roll call.');
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    return {
      present: roster.filter(r => r.currentStatus === 'PRESENT').length,
      absent: roster.filter(r => r.currentStatus === 'ABSENT').length,
      late: roster.filter(r => r.currentStatus === 'LATE').length,
      excused: roster.filter(r => r.currentStatus === 'EXCUSED').length,
      notMarked: roster.filter(r => r.currentStatus === 'NOT_MARKED').length,
    };
  }, [roster]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 md:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Class & Arm</label>
          <select 
            value={selectedArmId}
            onChange={(e) => setSelectedArmId(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select an Arm...</option>
            {classes.map(cls => (
              <optgroup key={cls.id} label={cls.name}>
                {cls.arms.map(arm => (
                  <option key={arm.id} value={arm.id}>{cls.name} {arm.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* Roster Area */}
      {selectedArmId && selectedDate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Action Bar & Stats */}
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-4 text-sm font-medium">
              <span className="text-green-600">{stats.present} Present</span>
              <span className="text-red-600">{stats.absent} Absent</span>
              <span className="text-yellow-600">{stats.late} Late</span>
              <span className="text-blue-600">{stats.excused} Excused</span>
              <span className="text-gray-500">{stats.notMarked} Not Marked</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={markAllPresent}
                disabled={loading || saving || stats.notMarked === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Mark Unmarked as Present
              </button>
              <button 
                onClick={handleSave}
                disabled={loading || saving || roster.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Roll Call'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading roster...</div>
          ) : roster.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No students found in this arm.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {roster.map((item) => (
                    <tr key={item.studentId} className={item.currentStatus === 'NOT_MARKED' ? 'bg-gray-50/50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.admissionNumber || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.currentStatus === 'NOT_MARKED' && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">NOT MARKED</span>
                        )}
                        {item.currentStatus === 'PRESENT' && (
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${item.isScanned ? 'bg-green-100 text-green-800 ring-1 ring-green-600/20' : 'bg-green-50 text-green-700'}`}>
                            {item.isScanned ? 'PRESENT - SCANNED AT GATE' : 'PRESENT'}
                          </span>
                        )}
                        {item.currentStatus === 'ABSENT' && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">ABSENT</span>
                        )}
                        {item.currentStatus === 'LATE' && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">LATE</span>
                        )}
                        {item.currentStatus === 'EXCUSED' && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">EXCUSED</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <select 
                          value={item.currentStatus}
                          onChange={(e) => handleStatusChange(item.studentId, e.target.value as RosterItem['currentStatus'])}
                          className="border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                        >
                          <option value="NOT_MARKED">-- Select --</option>
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                          <option value="LATE">Late</option>
                          <option value="EXCUSED">Excused</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
