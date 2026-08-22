import React from 'react';
import { auth } from '../../../../auth';
import { fetchApi } from '../../../lib/api';
import { Exam } from '../../../lib/api/examinations';
import ExaminationsClient from './ExaminationsClient';

export default async function ExaminationsPage() {
  const session = await auth();
  
  let exams: Exam[] = [];
  try {
    const res = await fetchApi<unknown>('/api/v1/exams', {
      token: session?.accessToken,
    });
    exams = Array.isArray(res) ? res : (res as { data?: Exam[] })?.data || [];
  } catch (error) {
    console.error('Failed to fetch exams', error);
  }

  let subjects: { id: string; name: string; code: string }[] = [];
  try {
    const res = await fetchApi<unknown>('/api/v1/academics/structure/subjects', {
      token: session?.accessToken,
    });
    subjects = Array.isArray(res) ? res : (res as { data?: { id: string; name: string; code: string }[] })?.data || [];
  } catch (error) {
    console.error('Failed to fetch subjects', error);
  }

  let academicYears: { id: string; name: string }[] = [];
  try {
    const res = await fetchApi<unknown>('/api/v1/academics/calendar/years', {
      token: session?.accessToken,
    });
    academicYears = Array.isArray(res) ? res : (res as { data?: { id: string; name: string }[] })?.data || [];
  } catch (error) {
    console.error('Failed to fetch academic years', error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Examinations</h1>
        <p className="text-sm text-gray-500">Manage exams, subjects, and terms</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <ExaminationsClient 
          initialExams={exams} 
          subjects={subjects}
          academicYears={academicYears}
          accessToken={session?.accessToken || ''} 
        />
      </div>
    </div>
  );
}
