import React from 'react';
import { auth } from '../../../../../auth';
import { redirect } from 'next/navigation';
import RollCallComponent from './RollCallComponent';

export const metadata = {
  title: 'Roll Call | Attendance | SaaS Platform',
};

export default async function RollCallPage() {
  const session = await auth();

  if (!session?.accessToken) {
    redirect('/auth/signin');
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Roll Call</h1>
          <p className="text-muted-foreground">Manage and override student attendance manually.</p>
        </div>
      </div>
      
      <RollCallComponent token={session.accessToken} />
    </div>
  );
}
