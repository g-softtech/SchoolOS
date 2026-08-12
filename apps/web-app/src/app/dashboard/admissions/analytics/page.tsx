import React from 'react';

export default async function AnalyticsDashboardPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admissions Analytics</h1>
      <p className="text-muted-foreground">Live insights powered by Materialized Read Projections.</p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI Cards placeholder */}
        <div className="border rounded-lg p-6 bg-white dark:bg-slate-950">
          <h3 className="text-sm font-medium text-muted-foreground">Total Applications</h3>
          <p className="text-2xl font-bold">1,248</p>
        </div>
        <div className="border rounded-lg p-6 bg-white dark:bg-slate-950">
          <h3 className="text-sm font-medium text-muted-foreground">Conversion Rate</h3>
          <p className="text-2xl font-bold">64.2%</p>
        </div>
        <div className="border rounded-lg p-6 bg-white dark:bg-slate-950">
          <h3 className="text-sm font-medium text-muted-foreground">Pending Reviews</h3>
          <p className="text-2xl font-bold">112</p>
        </div>
        <div className="border rounded-lg p-6 bg-white dark:bg-slate-950">
          <h3 className="text-sm font-medium text-muted-foreground">Capacity Utilization</h3>
          <p className="text-2xl font-bold">89%</p>
        </div>
      </div>
      
      <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900 mt-6 h-64 flex items-center justify-center">
        Live Charts Client Component (React Query with refetchInterval) goes here.
      </div>
    </div>
  );
}
