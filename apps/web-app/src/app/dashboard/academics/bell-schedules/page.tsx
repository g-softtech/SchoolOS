import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import BellSchedulesClient from './BellSchedulesClient';

export interface BellPeriod {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type?: string;
}

export interface BellSchedule {
  id: string;
  name: string;
  periods: BellPeriod[];
}

export default async function BellSchedulesPage() {
  const session = await auth();
  
  let schedules: BellSchedule[] = [];
  try {
    const res = await fetchApi<{ data: BellSchedule[] }>('/api/v1/academics/timetables/bell-schedules', {
      token: session?.accessToken,
    });
    schedules = res.data || [];
  } catch (error) {
    console.error('Failed to fetch bell schedules', error);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Bell Schedules</h2>
        <BellSchedulesClient initialSchedules={schedules} accessToken={session?.accessToken || ''} />
      </div>
    </div>
  );
}
