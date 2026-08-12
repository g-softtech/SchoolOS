'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@saas/ui';

// In a real app this would call the API Gateway which hits the Query Handler
const fetchDashboardData = async () => {
  const res = await fetch('/api/admissions/dashboard');
  if (!res.ok) throw new Error('Failed to fetch dashboard data');
  return res.json();
};

export function AdmissionDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admissions-dashboard'],
    queryFn: fetchDashboardData,
    refetchInterval: 5000, // Polling for hybrid realtime feel
  });

  if (isLoading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error loading dashboard</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.totalApplications || 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.pendingReviews || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(data?.conversionRate || 0 * 100).toFixed(1)}%</div>
        </CardContent>
      </Card>
    </div>
  );
}
