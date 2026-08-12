import React from 'react';

export default async function ReviewerBoardPage() {
  return (
    <div className="p-8 space-y-6 h-screen flex flex-col">
      <h1 className="text-3xl font-bold tracking-tight">Reviewer Queue</h1>
      <p className="text-muted-foreground">Kanban board for processing pending applications.</p>
      
      <div className="flex-1 border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        Kanban Board Client Component (React Query + Drag & Drop) goes here.
      </div>
    </div>
  );
}
