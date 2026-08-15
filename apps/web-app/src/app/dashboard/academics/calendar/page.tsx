import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import CalendarClient from './CalendarClient';

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
}

export default async function CalendarPage() {
  const session = await auth();
  
  let years: AcademicYear[] = [];
  try {
    const res = await fetchApi<{ data: AcademicYear[] }>('/api/v1/academics/calendar/years', {
      token: session?.accessToken,
    });
    years = res.data || [];
  } catch (error) {
    console.error('Failed to fetch academic years', error);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Academic Years</h2>
        <CalendarClient initialYears={years} accessToken={session?.accessToken || ''} />
      </div>
    </div>
  );
}
