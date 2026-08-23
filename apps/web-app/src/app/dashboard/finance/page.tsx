import React from 'react';
import { auth } from '../../../../auth';
import { fetchApi } from '../../../lib/api';
import Link from 'next/link';

interface FinancialSummary {
  cashBalanceKobo: number;
  arBalanceKobo: number;
  liabilityBalanceKobo: number;
  revenueKobo: number;
}

export default async function FinanceDashboardPage() {
  const session = await auth();
  
  let summary: FinancialSummary | null = null;
  try {
    const res = await fetchApi<{ data: FinancialSummary }>('/api/v1/finance/reports/summary', {
      token: session?.accessToken,
    });
    summary = res.data;
  } catch (error) {
    console.error('Failed to fetch finance summary', error);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Dashboard</h1>
          <p className="text-muted-foreground">Manage invoices, payments, and financial reporting.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/finance/invoices" className="p-6 bg-white border rounded-lg shadow-sm hover:border-blue-500 transition-colors cursor-pointer dark:bg-slate-900 dark:border-slate-800">
          <h2 className="font-semibold text-lg mb-2">Invoices</h2>
          <p className="text-sm text-muted-foreground">View and manage student invoices</p>
        </Link>
        <Link href="/dashboard/finance/payments" className="p-6 bg-white border rounded-lg shadow-sm hover:border-blue-500 transition-colors cursor-pointer dark:bg-slate-900 dark:border-slate-800">
          <h2 className="font-semibold text-lg mb-2">Payments</h2>
          <p className="text-sm text-muted-foreground">Record and allocate payments</p>
        </Link>
        <Link href="/dashboard/finance/ledger" className="p-6 bg-white border rounded-lg shadow-sm hover:border-blue-500 transition-colors cursor-pointer dark:bg-slate-900 dark:border-slate-800">
          <h2 className="font-semibold text-lg mb-2">General Ledger</h2>
          <p className="text-sm text-muted-foreground">View transaction journals</p>
        </Link>
      </div>

      <div className="mt-8 border rounded-lg p-6 bg-white dark:bg-slate-900">
        <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
        {summary ? (
          <pre className="text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded overflow-auto">
            {JSON.stringify(summary, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load financial summary.</p>
        )}
      </div>
    </div>
  );
}
