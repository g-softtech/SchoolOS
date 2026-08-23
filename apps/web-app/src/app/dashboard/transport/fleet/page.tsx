'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, SearchIcon, TruckIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fetchApi } from '@/lib/api';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';

export default function FleetManagement() {
  const { data: session } = useSession();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.accessToken) {
      fetchApi<{ data: any[] }>('/api/v1/transport/vehicles', { token: session.accessToken })
        .then(res => setVehicles(res.data || (res as any) || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [session]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader title="Fleet Management" description="Manage vehicles, drivers, and maintenance logs" />
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by plate number, driver..." />
          </div>
        </div>

        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium">Assigned Driver (Staff)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4">No vehicles found</td></tr>
              ) : (
                vehicles.map((v, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center">
                      <TruckIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {v.plateNumber || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.capacity || 0} Seats</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.driver?.userId || v.driverId || 'None'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">{v.status || 'ACTIVE'}</span>
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
