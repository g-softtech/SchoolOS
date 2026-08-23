'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { TruckIcon, MapIcon, UsersIcon, MapPinIcon } from 'lucide-react';

export default function TransportDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transport Dashboard" description="Manage fleet, routes, and student allocations" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/dashboard/transport/fleet">
          <Card className="p-6 hover:border-primary cursor-pointer transition-all hover:shadow-md">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <TruckIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Fleet Management</h3>
                <p className="text-sm text-muted-foreground">Vehicles & Maintenance</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/transport/routes">
          <Card className="p-6 hover:border-primary cursor-pointer transition-all hover:shadow-md">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-secondary/10 text-secondary rounded-lg">
                <MapIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Route Builder</h3>
                <p className="text-sm text-muted-foreground">Define paths and stops</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/transport/allocations">
          <Card className="p-6 hover:border-primary cursor-pointer transition-all hover:shadow-md">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <UsersIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Student Manifest</h3>
                <p className="text-sm text-muted-foreground">Manage allocations</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <MapPinIcon className="mr-2 h-5 w-5 text-muted-foreground" />
          Live Fleet GPS
        </h3>
        <Card className="p-8 flex items-center justify-center bg-muted/30 border-dashed border-2">
          <div className="text-center text-muted-foreground">
            <MapPinIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>GPS map tracking will appear here.</p>
            <p className="text-sm">Connect a vehicle device to see live locations.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
