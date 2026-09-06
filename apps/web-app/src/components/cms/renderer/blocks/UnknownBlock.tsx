import React from 'react';

export function UnknownBlock({ type }: { type: string }) {
  if (process.env.NODE_ENV === 'production') {
    // In production, fail silently or render a hidden comment to avoid breaking the UI layout
    return <div style={{ display: 'none' }} data-unknown-block={type} />;
  }

  // In development, show an informational badge to alert developers
  return (
    <div className="p-4 my-4 border-2 border-red-500 bg-red-50 rounded-md text-red-700">
      <strong>Developer Warning:</strong> Unrecognized or deprecated block type <code>"{type}"</code> encountered in registry.
    </div>
  );
}
