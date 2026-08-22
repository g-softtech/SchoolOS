import React from 'react';
import { auth } from '../../../../../auth';
import { leaveApi, LeaveRequestResponse } from '../../../../lib/api/leave';
import { staffApi, StaffListResponse } from '../../../../lib/api/staff';
import LeaveTable from './LeaveTable';

export default async function LeavePage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  
  let leaveRequests: LeaveRequestResponse[] = [];
  let staffList: StaffListResponse[] = [];
  let isManager = false;

  try {
    // Try fetching all requests. If it fails (403), fallback to self-service.
    try {
      leaveRequests = await leaveApi.getLeaveRequests(searchParams.status, session?.accessToken) || [];
      isManager = true;
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        leaveRequests = await leaveApi.getMyLeaveRequests(searchParams.status, session?.accessToken) || [];
      } else {
        throw e;
      }
    }

    if (isManager) {
      staffList = await staffApi.getStaffList(session?.accessToken) || [];
    }
  } catch (error) {
    console.error('Failed to fetch leave data', error);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">
            {isManager ? 'Manage and review staff leave requests.' : 'View and request your leave.'}
          </p>
        </div>
      </div>
      
      <LeaveTable 
        requests={leaveRequests} 
        isManager={isManager} 
        staffList={staffList} 
        token={session?.accessToken} 
      />
    </div>
  );
}
