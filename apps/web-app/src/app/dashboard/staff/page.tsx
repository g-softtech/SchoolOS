import React from 'react';
import { auth } from '../../../../auth';
import { staffApi, StaffListResponse, DepartmentResponse } from '../../../lib/api/staff';
import Link from 'next/link';
import StaffSearchFilters from './StaffSearchFilters';

export default async function StaffPage({
  searchParams,
}: {
  searchParams: { q?: string; department?: string };
}) {
  const session = await auth();
  
  let staffList: StaffListResponse[] = [];
  let departments: DepartmentResponse[] = [];
  try {
    const [staffRes, deptRes] = await Promise.all([
      staffApi.getStaffList(session?.accessToken),
      staffApi.getDepartments(session?.accessToken)
    ]);
    staffList = staffRes || [];
    departments = deptRes || [];
  } catch (error) {
    console.error('Failed to fetch data', error);
  }

  // Client-side filtering logic on the server component
  if (searchParams.q) {
    const query = searchParams.q.toLowerCase();
    staffList = staffList.filter(s => 
      s.membership.profile?.firstName?.toLowerCase().includes(query) ||
      s.membership.profile?.lastName?.toLowerCase().includes(query) ||
      s.staffIdNumber?.toLowerCase().includes(query)
    );
  }

  if (searchParams.department) {
    staffList = staffList.filter(s => s.departmentId === searchParams.department);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground">Manage and view all staff members.</p>
        </div>
        <Link 
          href="/dashboard/staff/hire" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
        >
          Hire Staff
        </Link>
      </div>

      <StaffSearchFilters departments={departments} />
      
      {staffList.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900">
          No staff found for this workspace.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {staffList.map((staff) => (
                <tr key={staff.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                    <div className="flex items-center">
                      {staff.membership?.profile?.avatarUrl ? (
                        <img className="h-8 w-8 rounded-full mr-3" src={staff.membership.profile.avatarUrl} alt="" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3">
                          {staff.membership?.profile?.firstName?.charAt(0)}{staff.membership?.profile?.lastName?.charAt(0)}
                        </div>
                      )}
                      <div>
                        {staff.membership?.profile?.firstName} {staff.membership?.profile?.lastName}
                        <div className="text-xs text-gray-500 dark:text-slate-400 font-normal">{staff.membership?.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{staff.staffIdNumber || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{staff.department?.name || 'Unassigned'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      staff.employment?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                      staff.employment?.status === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {staff.employment?.status || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/dashboard/staff/${staff.id}`} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400">
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
