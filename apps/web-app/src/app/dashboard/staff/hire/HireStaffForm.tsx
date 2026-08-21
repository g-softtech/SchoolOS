'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { staffApi, EligibleMembershipResponse, DepartmentResponse } from '../../../../lib/api/staff';

export default function HireStaffForm({
  memberships,
  departments,
  token
}: {
  memberships: EligibleMembershipResponse[];
  departments: DepartmentResponse[];
  token?: string;
}) {
  const router = useRouter();
  
  const [membershipId, setMembershipId] = useState('');
  const [staffIdNumber, setStaffIdNumber] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractType, setContractType] = useState('FULL_TIME');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipId || !staffIdNumber || !hireDate) {
      setError('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await staffApi.hireStaff({
        membershipId,
        staffIdNumber,
        departmentId: departmentId || undefined,
        designation: designation || undefined,
        hireDate: new Date(hireDate).toISOString(),
        contractType
      }, token);

      router.push('/dashboard/staff');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to hire staff');
      } else {
        setError('Failed to hire staff');
      }
      setLoading(false);
    }
  };

  if (memberships.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No eligible users found.</p>
        <p className="text-sm text-gray-400">
          Ensure the user has been invited and assigned the <strong>STAFF</strong> role in the Tenant Identity settings before hiring them here.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="membershipId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select User <span className="text-red-500">*</span>
        </label>
        <select
          id="membershipId"
          value={membershipId}
          onChange={(e) => setMembershipId(e.target.value)}
          required
          className="mt-1 block w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">-- Choose a User --</option>
          {memberships.map((mem) => (
            <option key={mem.id} value={mem.id}>
              {mem.profile?.firstName} {mem.profile?.lastName} ({mem.user?.email})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">Only users with the STAFF role are listed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="staffIdNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Staff ID Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="staffIdNumber"
            value={staffIdNumber}
            onChange={(e) => setStaffIdNumber(e.target.value)}
            required
            placeholder="e.g. EMP-2023-001"
            className="mt-1 block w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Hire Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="hireDate"
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
            required
            className="mt-1 block w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Department
          </label>
          <select
            id="departmentId"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="mt-1 block w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">-- None --</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="contractType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Contract Type
          </label>
          <select
            id="contractType"
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            className="mt-1 block w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
            <option value="TEMPORARY">Temporary</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="designation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Designation / Job Title
          </label>
          <input
            type="text"
            id="designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="e.g. Senior Math Teacher"
            className="mt-1 block w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-slate-800 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Hiring...' : 'Hire Staff'}
        </button>
      </div>
    </form>
  );
}
