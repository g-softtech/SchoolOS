import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import ApplicationWizardClient from './ApplicationWizardClient';

export default async function ApplicationWizardPage() {
  const session = await auth();

  // Fetch active campaigns
  let campaigns: { id: string; name: string; status: string }[] = [];
  try {
    const res = await fetchApi<{ data: { data: { id: string; name: string; status: string }[] } }>('/api/v1/admissions/campaigns', {
      token: session?.accessToken,
    });
    // We can filter by ACTIVE status on the frontend or backend. Assuming all returned campaigns are usable.
    campaigns = res.data?.data?.filter(c => c.status === 'ACTIVE') || [];
  } catch (err) {
    console.error('Failed to fetch campaigns', err);
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">New Admission Application</h1>
      <p className="text-muted-foreground">Select a campaign and complete the dynamic application form.</p>
      
      <ApplicationWizardClient
        campaigns={campaigns}
        token={session?.accessToken}
      />
    </div>
  );
}
