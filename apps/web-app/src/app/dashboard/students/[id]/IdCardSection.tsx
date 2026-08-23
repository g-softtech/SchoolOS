'use client';
import React, { useState } from 'react';
import { fetchApi } from '../../../../../lib/api';
import { useSession } from 'next-auth/react';

export default function IdCardSection({ studentId, initialIdCard }: { studentId: string, initialIdCard: any }) {
  const { data: session } = useSession();
  const [idCard, setIdCard] = useState<any>(initialIdCard);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const issueIdCard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<{ data: any }>('/api/v1/id-cards/issue', {
        method: 'POST',
        token: session?.accessToken,
        body: JSON.stringify({ ownerType: 'STUDENT', ownerId: studentId })
      });
      if (res.data) setIdCard(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to issue ID Card');
    }
    setLoading(false);
  };

  const revokeIdCard = async () => {
    if (!idCard) return;
    setLoading(true);
    setError('');
    try {
      await fetchApi(`/api/v1/id-cards/revoke/${idCard.id}`, {
        method: 'DELETE',
        token: session?.accessToken,
        body: JSON.stringify({ reason: 'REVOKED' })
      });
      setIdCard(null);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke ID Card');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">ID Card</h3>
      </div>
      <div className="px-4 py-5 sm:p-6">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {idCard ? (
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Active ID Card</p>
              <p className="text-sm text-gray-500 mt-1">Status: {idCard.status}</p>
              <p className="text-sm text-gray-500">Issued: {new Date(idCard.issueDate).toLocaleDateString()}</p>
              <p className="text-sm text-gray-500">Verification Token: {idCard.verificationToken.substring(0, 8)}...</p>
              <a 
                href={`/verify/id-card/${idCard.verificationToken}`} 
                target="_blank" 
                rel="noreferrer"
                className="mt-4 inline-block text-sm text-blue-600 hover:underline"
              >
                View Public Verification Page
              </a>
            </div>
            <button
              onClick={revokeIdCard}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50"
            >
              Revoke
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-4">No active ID card found for this student.</p>
            <button
              onClick={issueIdCard}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              {loading ? 'Issuing...' : 'Issue New ID Card'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
