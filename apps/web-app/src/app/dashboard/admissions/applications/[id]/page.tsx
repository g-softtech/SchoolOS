import React from 'react';

export default async function ApplicationDetailsPage({ params }: { params: { id: string } }) {
  // const applicationId = params.id;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Application Details</h1>
      <p className="text-muted-foreground">View timeline, data, and transition workflow.</p>
      
      <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900">
        Workflow Timeline Client Component goes here.
        <br/><br/>
        Displays: Submitter, Approver, Timestamp, Transition Reason (e.g. DRAFT -> SUBMITTED)
      </div>
    </div>
  );
}
