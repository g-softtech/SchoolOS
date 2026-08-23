'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { BookOpenIcon, ArrowRightLeftIcon } from 'lucide-react';

export default function LibraryDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader title="Library Dashboard" description="Manage book inventory and circulation" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/library/books">
          <Card className="p-6 hover:border-primary cursor-pointer transition-all hover:shadow-md">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <BookOpenIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Book Inventory</h3>
                <p className="text-sm text-muted-foreground">Manage catalog</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/library/circulation">
          <Card className="p-6 hover:border-primary cursor-pointer transition-all hover:shadow-md">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-secondary/10 text-secondary rounded-lg">
                <ArrowRightLeftIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Circulation Desk</h3>
                <p className="text-sm text-muted-foreground">Issue & Return books</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
