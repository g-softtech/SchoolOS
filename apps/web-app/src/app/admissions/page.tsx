import React from 'react';
import { AdmissionDashboard } from './components/AdmissionDashboard';

export default function AdmissionsPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admissions Dashboard</h1>
      <p className="text-gray-500 mb-8">
        Manage applications, monitor conversion rates, and review pending admissions.
      </p>
      
      {/* 
        This is an RSC (Server Component) wrapping a Client Component.
        The layout and static parts are rendered on the server,
        while the AdmissionDashboard uses React Query on the client
        for interactivity and live-polling.
      */}
      <AdmissionDashboard />
    </div>
  );
}
