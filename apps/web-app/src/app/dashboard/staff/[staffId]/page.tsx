import React from 'react';
import { auth } from '../../../../../auth';
import { staffApi } from '../../../../lib/api/staff';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import UpdateStatusModal from './UpdateStatusModal';

export default async function StaffProfilePage({
  params,
}: {
  params: { staffId: string };
}) {
  const session = await auth();
  
  let staff = null;
  try {
    staff = await staffApi.getStaffById(params.staffId, session?.accessToken);
  } catch (error) {
    console.error('Failed to fetch staff profile', error);
  }

  if (!staff) {
    notFound();
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <Link href="/dashboard/staff" className="hover:text-gray-900 dark:hover:text-gray-200">Staff Directory</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-200 font-medium">Profile</span>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="flex items-center gap-6">
          {staff.membership?.profile?.avatarUrl ? (
            <img className="h-24 w-24 rounded-full border-4 border-white shadow-sm" src={staff.membership.profile.avatarUrl} alt="" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-3xl shadow-sm">
              {staff.membership?.profile?.firstName?.charAt(0)}{staff.membership?.profile?.lastName?.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {staff.membership?.profile?.firstName} {staff.membership?.profile?.lastName}
            </h1>
            <p className="text-muted-foreground">{staff.designation || 'Staff Member'} • {staff.department?.name || 'No Department'}</p>
            <div className="mt-2 flex gap-2">
               <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  staff.employment?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                  staff.employment?.status === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {staff.employment?.status || 'UNKNOWN'}
                </span>
                <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700">
                  {staff.staffIdNumber}
                </span>
            </div>
          </div>
        </div>
        
        <UpdateStatusModal staffId={staff.id} currentStatus={staff.employment?.status || 'ACTIVE'} token={session?.accessToken} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm p-6 md:col-span-2 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2 dark:border-slate-700">Identity Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">First Name</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{staff.membership?.profile?.firstName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Name</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{staff.membership?.profile?.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email Address</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{staff.membership?.user?.email}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2 dark:border-slate-700">Employment</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Hire Date</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {staff.employment?.hireDate ? new Date(staff.employment.hireDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contract Type</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{staff.employment?.contractType || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
