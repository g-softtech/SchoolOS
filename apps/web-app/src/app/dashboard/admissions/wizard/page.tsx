import React from 'react';

export default async function ApplicationWizardPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">New Admission Application</h1>
      <p className="text-muted-foreground">Complete the 4-step wizard to submit a new application.</p>
      
      <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900">
        Multi-step Wizard Client Component (React Query Mutations) goes here.
        <br/><br/>
        Steps: Student Info, Guardian Info, Medical, Documents
      </div>
    </div>
  );
}
