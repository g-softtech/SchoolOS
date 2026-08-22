'use client';

import React, { useState } from 'react';
import { LeaveRequestResponse } from '../../../../lib/api/leave';
import { StaffListResponse } from '../../../../lib/api/staff';
import RequestLeaveModal from './RequestLeaveModal';
import ReviewLeaveModal from './ReviewLeaveModal';

export default function LeaveTable({ 
  requests, 
  isManager, 
  staffList, 
  token 
}: { 
  requests: LeaveRequestResponse[];
  isManager: boolean;
  staffList: StaffListResponse[];
  token?: string;
}) {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredRequests = requests.filter(req => {
    if (filter === 'ALL') return true;
    return req.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === status 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700 dark:hover:bg-slate-700'
              }`}
            >
              {status === 'ALL' ? 'All Requests' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        
        <RequestLeaveModal isManager={isManager} staffList={staffList} token={token} />
      </div>

      {filteredRequests.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-sm">
          No leave requests found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm dark:border-slate-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {isManager && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                    <div className="flex items-center">
                      {req.staff?.membership?.profile?.avatarUrl ? (
                        <img className="h-8 w-8 rounded-full mr-3" src={req.staff.membership.profile.avatarUrl} alt="" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3">
                          {req.staff?.membership?.profile?.firstName?.charAt(0) || '?'}
                          {req.staff?.membership?.profile?.lastName?.charAt(0) || ''}
                        </div>
                      )}
                      <div>
                        {req.staff?.membership?.profile?.firstName || 'Unknown'} {req.staff?.membership?.profile?.lastName || 'Staff'}
                        <div className="text-xs text-gray-500 dark:text-slate-400 font-normal">{req.staff?.membership?.user?.email || req.staff?.staffIdNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-300">
                    {req.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-300">
                    {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-300 max-w-xs truncate">
                    {req.reason || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  {isManager && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {req.status === 'PENDING' ? (
                        <ReviewLeaveModal leaveId={req.id} token={token} />
                      ) : (
                        <span className="text-gray-400 text-xs uppercase tracking-wider">Reviewed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
