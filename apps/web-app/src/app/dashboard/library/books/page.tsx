'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function BookInventory() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader title="Book Inventory" description="Manage library catalog" />
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Book
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search books by title, author, ISBN..." />
          </div>
        </div>

        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">ISBN</th>
                <th className="px-4 py-3 font-medium text-right">Available Copies</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium">Sample Book</td>
                <td className="px-4 py-3 text-muted-foreground">Jane Doe</td>
                <td className="px-4 py-3 text-muted-foreground">978-3-16-148410-0</td>
                <td className="px-4 py-3 text-right">5</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm">Edit</Button>
                </td>
              </tr>
              {/* More items would be mapped here */}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
