import React from 'react';
import { auth } from '../../../../../auth';
import { staffApi, EligibleMembershipResponse, DepartmentResponse } from '../../../../lib/api/staff';
import Link from 'next/link';
import HireStaffForm from './HireStaffForm';

export default async function HireStaffPage() {
  const session = await auth();
  
  let memberships: EligibleMembershipResponse[] = [];
  let departments: DepartmentResponse[] = [];
  
  try {
    const [memRes, deptRes] = await Promise.all([
      staffApi.getEligibleMemberships(session?.accessToken),
      staffApi.getDepartments(session?.accessToken)
    ]);
    memberships = memRes || [];
    departments = deptRes || [];
  } catch (error) {
    console.error('Failed to fetch data for hire form', error);
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hire Staff</h1>
          <p className="text-muted-foreground">Onboard an existing user to the Staff directory.</p>
        </div>
        <Link 
          href="/dashboard/staff" 
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to Directory
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-6">
        <HireStaffForm 
          memberships={memberships} 
          departments={departments} 
          token={session?.accessToken} 
        />
      </div>
    </div>
  );
}
