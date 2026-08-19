import React from 'react';
import Link from 'next/link';

export default function AcademicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Academic Settings</h1>
        <p className="text-muted-foreground">Manage the academic structure, calendar, and subjects.</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <Link
            href="/dashboard/academics/calendar"
            className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Calendar
          </Link>
          <Link
            href="/dashboard/academics/structure"
            className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Structure
          </Link>
          <Link
            href="/dashboard/academics/subjects"
            className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Subjects
          </Link>
          <Link
            href="/dashboard/academics/bell-schedules"
            className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Bell Schedules
          </Link>
          <Link
            href="/dashboard/academics/timetables"
            className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Timetable Builder
          </Link>
        </nav>
      </div>

      <div className="pt-4">
        {children}
      </div>
    </div>
  );
}
