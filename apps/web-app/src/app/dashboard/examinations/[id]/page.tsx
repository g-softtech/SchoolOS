import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import { Exam } from '../../../../lib/api/examinations';
import MarkingSheetClient from './MarkingSheetClient';
import Link from 'next/link';

export default async function MarkingSheetPage({ params }: { params: { id: string } }) {
  const session = await auth();
  
  let exam: Exam | null = null;
  try {
    const res = await fetchApi<Exam | { data: Exam }>(`/api/v1/exams/${params.id}`, {
      token: session?.accessToken,
    });
    exam = (res as { data?: Exam }).data ?? (res as Exam);
  } catch (error) {
    console.error('Failed to fetch exam', error);
  }

  if (!exam) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Link href="/dashboard/examinations" className="text-gray-500 hover:text-gray-900 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Marking Sheet: {exam.title}</h1>
          <p className="text-sm text-gray-500">
            {exam.subject?.name} • {new Date(exam.date).toLocaleDateString()} • Max Score: {exam.totalMarks}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <MarkingSheetClient 
          exam={exam} 
          accessToken={session?.accessToken || ''} 
        />
      </div>
    </div>
  );
}
