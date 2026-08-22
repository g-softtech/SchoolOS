import React from 'react';
import { auth } from '../../../../../auth';
import ScannerComponent from './ScannerComponent';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Attendance Scanner | SaaS Platform',
};

export default async function ScannerPage() {
  const session = await auth();

  if (!session?.accessToken) {
    redirect('/auth/signin');
  }

  return (
    <div className="h-full bg-white text-gray-900 rounded-xl overflow-hidden shadow-sm border border-gray-100">
      <ScannerComponent token={session.accessToken} />
    </div>
  );
}
