import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import TimetableBuilderClient from './TimetableBuilderClient';
import { AcademicYear } from '../calendar/page';
import { Campus, Class } from '../structure/page';
import { Subject } from '../subjects/page';
import { BellSchedule } from '../bell-schedules/page';

export default async function TimetablesPage() {
  const session = await auth();
  
  let years: AcademicYear[] = [];
  let campuses: Campus[] = [];
  let classes: Class[] = [];
  let subjects: Subject[] = [];
  let bellSchedules: BellSchedule[] = [];

  try {
    const yearsRes = await fetchApi<{ data: AcademicYear[] }>('/api/v1/academics/calendar/years', { token: session?.accessToken });
    years = yearsRes.data || [];

    const campusRes = await fetchApi<{ data: Campus[] }>('/api/v1/academics/structure/campuses', { token: session?.accessToken });
    campuses = campusRes.data || [];

    const classRes = await fetchApi<{ data: Class[] }>('/api/v1/academics/structure/classes', { token: session?.accessToken });
    classes = classRes.data || [];

    const subjectsRes = await fetchApi<{ data: Subject[] }>('/api/v1/academics/structure/subjects', { token: session?.accessToken });
    subjects = subjectsRes.data || [];

    const bellRes = await fetchApi<{ data: BellSchedule[] }>('/api/v1/academics/timetables/bell-schedules', { token: session?.accessToken });
    bellSchedules = bellRes.data || [];
  } catch (error) {
    console.error('Failed to fetch timetable dependencies', error);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Timetable Builder</h2>
        <TimetableBuilderClient 
          initialYears={years}
          initialCampuses={campuses}
          initialClasses={classes}
          subjects={subjects}
          bellSchedules={bellSchedules}
          accessToken={session?.accessToken || ''} 
        />
      </div>
    </div>
  );
}
