"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onResolve: (action: 'overwrite' | 'discard' | 'duplicate') => void;
}

export function ConflictResolutionModal({ isOpen, onResolve }: ConflictResolutionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="max-w-lg w-full p-6 shadow-2xl space-y-6 bg-white">
        <div>
          <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Edit Conflict Detected
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Another user (or session) has made changes to this page since you opened it. 
            Your changes have been saved safely on this device, but saving now will overwrite the newer version on the server.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            variant="destructive" 
            onClick={() => onResolve('overwrite')}
            className="w-full justify-start text-left bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          >
            <div>
              <div className="font-semibold">Review / Keep Local (Force Overwrite)</div>
              <div className="text-xs opacity-80 font-normal">Keep your edits and overwrite the server's changes.</div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            onClick={() => onResolve('discard')}
            className="w-full justify-start text-left"
          >
            <div>
              <div className="font-semibold text-gray-900">Load Server Version</div>
              <div className="text-xs text-gray-500 font-normal">Discard your local edits and load the latest changes.</div>
            </div>
          </Button>

          <Button 
            variant="outline" 
            onClick={() => onResolve('duplicate')}
            className="w-full justify-start text-left"
          >
            <div>
              <div className="font-semibold text-blue-700">Save as Duplicate / Copy</div>
              <div className="text-xs text-blue-600/80 font-normal">Create a new draft page with your current changes.</div>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );
}
