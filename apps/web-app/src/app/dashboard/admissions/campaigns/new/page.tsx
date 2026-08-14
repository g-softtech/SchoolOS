import React from 'react';
import { auth } from '../../../../../../auth';
import { fetchApi } from '../../../../../lib/api';
import CampaignFormClient from './CampaignFormClient';

export default async function NewCampaignPage() {
  const session = await auth();

  // 1. Fetch available workflows
  let workflows: { id: string; name: string }[] = [];
  try {
    const res = await fetchApi<{ data: { id: string; name: string }[] }>('/api/v1/admissions/workflows', {
      token: session?.accessToken,
    });
    workflows = res.data || [];
  } catch (err) {
    console.error('Failed to fetch workflows', err);
  }

  // 2. Resolve Workspace context to get current academic year
  let academicYearId = null;
  try {
    const ctxRes = await fetchApi<{ academic: { sessionId: string } }>('/workspace/resolve', {
      method: 'POST',
      token: session?.accessToken,
    });
    academicYearId = ctxRes.academic?.sessionId || null;
  } catch (err) {
    console.error('Failed to resolve workspace context', err);
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Admission Campaign</h1>
        <p className="text-muted-foreground">Setup a new admissions drive and assign its workflow.</p>
      </div>
      
      <CampaignFormClient 
        workflows={workflows} 
        academicYearId={academicYearId} 
        token={session?.accessToken}
      />
    </div>
  );
}
