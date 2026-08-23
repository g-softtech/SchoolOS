'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchIcon, UserPlusIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fetchApi } from '@/lib/api';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';

export default function StudentManifest() {
  const { data: session } = useSession();
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.accessToken) {
      fetchApi<{ data: any[] }>('/api/v1/transport/allocations', { token: session.accessToken })
        .then(res => setAllocations(res.data || (res as any) || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [session]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader title="Student Manifest" description="Assign students to transport routes and vehicles" />
        <Button>
          <UserPlusIcon className="mr-2 h-4 w-4" />
          Assign Student
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by student name, route, or vehicle..." />
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b whitespace-nowrap">
              <tr>
                <th className="px-4 py-3 font-medium">Student Name</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Pickup Point</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
              ) : allocations.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4">No allocations found</td></tr>
              ) : (
                allocations.map((a, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors whitespace-nowrap">
                    <td className="px-4 py-3 font-medium">{a.student?.firstName} {a.student?.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.route?.name || a.routeId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.vehicle?.plateNumber || a.vehicleId}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.pickupPoint}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">{a.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
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
