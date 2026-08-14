import React from 'react';
import { auth } from '../../../../../../auth';
import { fetchApi } from '../../../../../lib/api';
import ApplicationTransitionClient from './ApplicationTransitionClient';

interface Stage {
  id: string;
  name: string;
  orderIndex: number;
}

interface Workflow {
  id: string;
  name: string;
  stages: Stage[];
}

interface Campaign {
  id: string;
  name: string;
  workflowId?: string;
}

interface Application {
  id: string;
  studentFirstName: string;
  studentLastName: string;
  admissionNumber: string;
  paymentStatus: string;
  campaignId?: string;
  currentStageId?: string;
}

export default async function ApplicationDetailsPage({ params }: { params: { id: string } }) {
  const applicationId = params.id;
  const session = await auth();

  let application: Application | null = null;
  let campaign: Campaign | null = null;
  let workflow: Workflow | null = null;

  try {
    const appRes = await fetchApi<{ data: Application }>(`/api/v1/admissions/applications/${applicationId}`, {
      token: session?.accessToken,
    });
    application = appRes.data;

    if (application?.campaignId) {
      const campRes = await fetchApi<{ data: Campaign }>(`/api/v1/admissions/campaigns/${application?.campaignId}`, {
        token: session?.accessToken,
      });
      campaign = campRes.data;

      if (campaign?.workflowId) {
        const wfRes = await fetchApi<{ data: Workflow }>(`/api/v1/admissions/workflows/${campaign?.workflowId}`, {
          token: session?.accessToken,
        });
        workflow = wfRes.data;
      }
    }
  } catch (error) {
    console.error('Failed to fetch application details', error);
  }

  if (!application) {
    return (
      <div className="p-8">
        <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900">
          Application not found.
        </div>
      </div>
    );
  }

  const stages = workflow?.stages || [];

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Application Details</h1>
      <p className="text-muted-foreground">View timeline, data, and transition workflow.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border p-6 rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Applicant Info</h2>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {application.studentFirstName} {application.studentLastName}</div>
            <div><span className="font-medium">Admission #:</span> {application.admissionNumber || 'N/A'}</div>
            <div><span className="font-medium">Payment Status:</span> {application.paymentStatus}</div>
            <div><span className="font-medium">Campaign:</span> {campaign?.name || 'Unknown'}</div>
          </div>
        </div>

        <div className="border p-6 rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Workflow Stages</h2>
          {stages.length === 0 ? (
            <div className="text-sm text-gray-500">No stages configured.</div>
          ) : (
            <ul className="space-y-4">
              {stages.map((stage: Stage, idx: number) => {
                const isCurrent = stage.id === application?.currentStageId;
                const isPast = stages.findIndex((s: Stage) => s.id === application?.currentStageId) > idx;

                let badgeColor = "bg-gray-100 text-gray-800";
                if (isCurrent) badgeColor = "bg-blue-100 text-blue-800 font-bold border border-blue-300";
                if (isPast) badgeColor = "bg-green-100 text-green-800";

                return (
                  <li key={stage.id} className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-xs ${badgeColor}`}>
                      {stage.orderIndex}. {stage.name}
                    </div>
                    {isCurrent && <span className="text-xs text-blue-600 font-medium">← Current Stage</span>}
                  </li>
                );
              })}
            </ul>
          )}

          <ApplicationTransitionClient
            applicationId={application.id}
            currentStageId={application.currentStageId}
            stages={stages}
            token={session?.accessToken}
          />
        </div>
      </div>
    </div>
  );
}
