import React from 'react';
import { auth } from '../../../../../../auth';
import { fetchApi } from '../../../../../lib/api';
import Link from 'next/link';

interface InvoiceItem {
  id: string;
  description: string;
  amountKobo: number;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  dueDate: string;
  studentId: string;
  termId: string;
  totalAmountKobo: number;
  amountPaidKobo: number;
  items: InvoiceItem[];
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  
  let invoice: InvoiceDetail | null = null;
  try {
    const res = await fetchApi<{ data: InvoiceDetail }>(`/api/v1/finance/invoices/${params.id}`, {
      token: session?.accessToken,
    });
    invoice = res.data;
  } catch (error) {
    console.error('Failed to fetch invoice details', error);
  }

  if (!invoice) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Invoice Not Found</h1>
        <Link href="/dashboard/finance/invoices" className="text-blue-600 mt-4 inline-block hover:underline">
          &larr; Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/dashboard/finance/invoices" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Back to Invoices
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h1>
          <p className="text-muted-foreground mt-1">
            Status: <span className="font-semibold">{invoice.status}</span> | Due: {new Date(invoice.dueDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-2">
          {invoice.status === 'DRAFT' && (
            <>
              {/* Note: Real app would use a client component for these actions */}
              <button className="py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 cursor-not-allowed opacity-70" title="Client interaction required to issue">
                Issue Invoice
              </button>
            </>
          )}
          {(invoice.status === 'DRAFT' || invoice.status === 'SENT') && (
            <button className="py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 cursor-not-allowed opacity-70" title="Client interaction required to cancel">
              Cancel Invoice
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="p-6 border-b dark:border-slate-800 flex justify-between">
          <div>
            <h3 className="text-lg font-semibold">Billed To</h3>
            <p className="text-sm text-gray-500">Student ID: {invoice.studentId}</p>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-semibold">Total Amount</h3>
            <p className="text-2xl font-bold">₦{(invoice.totalAmountKobo / 100).toFixed(2)}</p>
            <p className="text-sm text-green-600 font-medium">Paid: ₦{(invoice.amountPaidKobo / 100).toFixed(2)}</p>
          </div>
        </div>
        <div className="p-0">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900 dark:divide-slate-800">
              {invoice.items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    ₦{(item.amountKobo / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
