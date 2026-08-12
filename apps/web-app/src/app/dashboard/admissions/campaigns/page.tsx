import React from 'react';

// RSC Shell
export default async function CampaignsPage() {
  // Simulate server-side fetch for initial hydration
  // const initialData = await fetch('/api/campaigns').then(res => res.json());

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admissions Campaigns</h1>
      <p className="text-muted-foreground">Manage active admission drives and monitor capacities.</p>
      
      {/* Client Component for React Query interactivity */}
      {/* <CampaignsListClient initialData={initialData} /> */}
      
      <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900">
        Campaigns DataTable (React Query + @saas/ui) goes here.
      </div>
    </div>
  );
}
