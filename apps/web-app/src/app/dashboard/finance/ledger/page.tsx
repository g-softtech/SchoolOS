import React from 'react';
import { auth } from '../../../../../auth';
import { fetchApi } from '../../../../lib/api';

interface TrialBalanceLine {
  accountId: string;
  accountName: string;
  accountCode: string;
  accountType: string;
  balanceKobo: number;
}

interface TrialBalance {
  asOf: string;
  lines: TrialBalanceLine[];
  totalDebitsKobo: number;
  totalCreditsKobo: number;
}

export default async function LedgerPage() {
  const session = await auth();
  
  let tb: TrialBalance | null = null;
  try {
    const res = await fetchApi<{ data: TrialBalance }>('/api/v1/finance/reports/trial-balance', {
      token: session?.accessToken,
    });
    tb = res.data;
  } catch (error) {
    console.error('Failed to fetch trial balance', error);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">General Ledger (Trial Balance)</h1>
          <p className="text-muted-foreground">View account balances across the chart of accounts.</p>
        </div>
      </div>

      {!tb ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900">
          Unable to load ledger data.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Code</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900 dark:divide-slate-800">
              {tb.lines.map((line) => (
                <tr key={line.accountId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {line.accountCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {line.accountName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {line.accountType}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${line.balanceKobo < 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    ₦{(line.balanceKobo / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-slate-800 font-bold">
                <td colSpan={3} className="px-6 py-4 text-right text-sm">Total Debits</td>
                <td className="px-6 py-4 text-right text-sm text-blue-600">₦{(tb.totalDebitsKobo / 100).toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-50 dark:bg-slate-800 font-bold">
                <td colSpan={3} className="px-6 py-4 text-right text-sm">Total Credits</td>
                <td className="px-6 py-4 text-right text-sm text-blue-600">₦{(tb.totalCreditsKobo / 100).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
