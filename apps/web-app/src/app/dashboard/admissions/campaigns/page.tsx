import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';

interface Campaign {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
}

// RSC Shell
export default async function CampaignsPage() {
  // Fetch real data from the API Gateway
  const session = await auth();

  let campaigns: Campaign[] = [];
  try {
    const res = await fetchApi<{ data: { data: Campaign[] } }>('/api/v1/admissions/campaigns', {
      token: session?.accessToken,
    });
    campaigns = res.data?.data || [];
  } catch (error) {
    console.error('Failed to fetch campaigns', error);
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admissions Campaigns</h1>
      <p className="text-muted-foreground">Manage active admission drives and monitor capacities.</p>
      
      {campaigns.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900">
          No campaigns found for this workspace.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c) => (
            <div key={c.id} className="border p-4 rounded-lg bg-white shadow-sm">
              <h2 className="text-xl font-semibold mb-2">{c.name}</h2>
              <div className="text-sm text-gray-500 mb-4">Status: {c.status}</div>
              <div className="text-sm">
                <div>Start: {new Date(c.startDate).toLocaleDateString()}</div>
                <div>End: {new Date(c.endDate).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
