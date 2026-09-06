import React from 'react';

// Next.js 15+ requires params to be handled asynchronously if awaited, though layout params can sometimes be synchronous. 
// We type it as a Promise to be strict with the App Router constraint provided.
interface PublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ domain: string; slug?: string[] }>;
}

export default async function PublicWebsiteLayout({ children, params }: PublicLayoutProps) {
  const { domain } = await params;
  
  // Note: Global CSS or fonts can be injected here.
  // The layout wraps the entire public site per domain.
  return (
    <div className="min-h-screen flex flex-col bg-white" data-domain={domain}>
      <main className="flex-grow">
        {children}
      </main>
      {/* 
        A global footer could be rendered here by fetching global layout settings, 
        but for now, we rely on the dynamic page content.
      */}
    </div>
  );
}
