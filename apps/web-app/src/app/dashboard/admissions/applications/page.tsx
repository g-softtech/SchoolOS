import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import Link from 'next/link';

interface Application {
  id: string;
  studentFirstName: string;
  studentLastName: string;
  admissionNumber: string;
  paymentStatus: string;
  currentStage: {
    id: string;
    name: string;
  };
}

export default async function ApplicationsPage() {
  const session = await auth();
  
  let applications: Application[] = [];
  try {
    const res = await fetchApi<{ data: { data: Application[] } }>('/api/v1/admissions/applications', {
      token: session?.accessToken,
    });
    // The application controller directly returns { success: true, data: PaginatedResult }
    // Wait, earlier I did `return { success: true, data: result };` in the controller.
    // So `res.data` is the PaginatedResult, which has a `data` property array.
    applications = res.data?.data || [];
  } catch (error) {
    console.error('Failed to fetch applications', error);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admissions Applications</h1>
          <p className="text-muted-foreground">Review and manage all submitted applications.</p>
        </div>
        <Link
          href="/dashboard/admissions/wizard"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          New Application
        </Link>
      </div>
      
      {applications.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900">
          No applications found for this workspace.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission Number</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {app.studentFirstName} {app.studentLastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.admissionNumber || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.currentStage?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.paymentStatus}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/dashboard/admissions/applications/${app.id}`} className="text-blue-600 hover:text-blue-900">
                      View
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
