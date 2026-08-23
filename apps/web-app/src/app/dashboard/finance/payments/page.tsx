import React from 'react';
import { auth } from '../../../../../auth';
import Link from 'next/link';

export default async function PaymentsPage() {

  return (
    <div className="p-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/dashboard/finance" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Back to Finance
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Record Payment</h1>
          <p className="text-muted-foreground mt-1">Record a manual cash or bank-transfer payment.</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
            <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Enter student ID" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₦)</label>
            <input type="number" step="0.01" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Method</label>
            <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference</label>
            <input type="text" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Transaction Reference" />
          </div>
          
          <div className="pt-4">
            <button type="button" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-not-allowed opacity-70" title="Client component required to submit">
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
