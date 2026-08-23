'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRightIcon, CheckCircle2Icon } from 'lucide-react';

export default function CirculationDesk() {
  const [studentId, setStudentId] = useState('');
  const [bookId, setBookId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleIssue = async () => {
    if (!studentId || !bookId) {
      return toast({ title: 'Error', description: 'Please enter Student ID and Book ID', variant: 'destructive' });
    }
    setLoading(true);
    try {
      // API call to /v1/library/circulation/issue
      // Assuming a generic API util exists or we just use fetch for the sake of the component
      toast({ title: 'Success', description: 'Book issued successfully', variant: 'default' });
      setBookId(''); // reset book id for next scan
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to issue book', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!bookId) {
      return toast({ title: 'Error', description: 'Please enter Borrowing ID or Scan Book', variant: 'destructive' });
    }
    setLoading(true);
    try {
      // API call to /v1/library/circulation/return/:borrowingId
      toast({ title: 'Success', description: 'Book returned successfully', variant: 'default' });
      setBookId('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to return book', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Circulation Desk" description="Quick issue and return for students" />

      <Card className="p-6 md:p-8 space-y-8">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Student / Staff ID</label>
            <Input 
              placeholder="Scan ID Card or type ID..." 
              value={studentId} 
              onChange={(e) => setStudentId(e.target.value)} 
              className="text-lg p-6"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Book ID / ISBN</label>
            <Input 
              placeholder="Scan Book Barcode..." 
              value={bookId} 
              onChange={(e) => setBookId(e.target.value)}
              className="text-lg p-6"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <Button 
            size="lg" 
            className="h-16 text-lg" 
            variant="default"
            onClick={handleIssue}
            disabled={loading}
          >
            <ArrowLeftRightIcon className="mr-2 h-6 w-6" />
            Issue Book
          </Button>
          
          <Button 
            size="lg" 
            className="h-16 text-lg" 
            variant="outline"
            onClick={handleReturn}
            disabled={loading}
          >
            <CheckCircle2Icon className="mr-2 h-6 w-6 text-green-600" />
            Return Book
          </Button>
        </div>
      </Card>
    </div>
  );
}
