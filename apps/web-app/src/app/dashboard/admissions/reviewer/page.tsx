import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';
import ReviewerKanbanClient from './ReviewerKanbanClient';

export default async function ReviewerBoardPage() {
  const session = await auth();

  // Fetch active campaigns
  let campaigns: { id: string; name: string; status: string; workflowId?: string }[] = [];
  try {
    const res = await fetchApi<{ data: { data: { id: string; name: string; status: string; workflowId?: string }[] } }>('/api/v1/admissions/campaigns', {
      token: session?.accessToken,
    });
    // Can filter by ACTIVE status.
    campaigns = res.data?.data?.filter(c => c.status === 'ACTIVE') || [];
  } catch (err) {
    console.error('Failed to fetch campaigns', err);
  }
  return (
    <div className="p-8 space-y-6 h-screen flex flex-col">
      <h1 className="text-3xl font-bold tracking-tight">Reviewer Queue</h1>
      <p className="text-muted-foreground">Kanban board for processing pending applications.</p>
      
      <ReviewerKanbanClient
        campaigns={campaigns}
        token={session?.accessToken}
      />
    </div>
  );
}
