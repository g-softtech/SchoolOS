'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, SearchIcon, MapIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fetchApi } from '@/lib/api';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';

export default function RouteBuilder() {
  const { data: session } = useSession();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.accessToken) {
      fetchApi<{ data: any[] }>('/api/v1/transport/routes', { token: session.accessToken })
        .then(res => setRoutes(res.data || (res as any) || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [session]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader title="Route Builder" description="Define transport paths and pickup stops" />
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Route
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search routes by name..." />
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b whitespace-nowrap">
              <tr>
                <th className="px-4 py-3 font-medium">Route Name</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Stops Count</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
              ) : routes.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4">No routes found</td></tr>
              ) : (
                routes.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors whitespace-nowrap">
                    <td className="px-4 py-3 font-medium flex items-center">
                      <MapIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {r.name || 'Unnamed Route'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.vehicle?.plateNumber || r.vehicleId || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {Array.isArray(r.stops) ? r.stops.length : 0} Stops
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">Manage</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
