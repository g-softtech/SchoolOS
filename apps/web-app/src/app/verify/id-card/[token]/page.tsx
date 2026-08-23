import React from 'react';
import { notFound } from 'next/navigation';

export default async function VerifyIdCardPage({ params }: { params: { token: string } }) {
  const { token } = params;

  let verificationResult = null;

  try {
    // Call the public API verification endpoint
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/id-cards/verify/${token}`, {
      cache: 'no-store'
    });
    
    if (res.ok) {
      const json = await res.json();
      verificationResult = json;
    }
  } catch (err) {
    console.error('Failed to verify ID card', err);
  }

  if (!verificationResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">Verification Failed</h2>
            <p className="text-gray-600">Could not connect to verification server.</p>
          </div>
        </div>
      </div>
    );
  }

  const { valid, reason, idCard } = verificationResult;

  if (!valid && reason === 'NOT_FOUND') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center border-t-4 border-red-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid ID Card</h2>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-gray-600">This ID card does not exist in our system.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          ID Card Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 ${valid ? 'border-green-500' : 'border-red-500'}`}>
          <div className="text-center mb-6">
            {valid ? (
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
            
            <h2 className={`text-2xl font-bold ${valid ? 'text-green-600' : 'text-red-600'}`}>
              {valid ? 'Valid & Active' : `Invalid (${reason})`}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Verified on {new Date().toLocaleString()}
            </p>
          </div>

          {idCard && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="text-center mb-4">
                <p className="text-sm font-bold text-gray-900 uppercase tracking-wider">{idCard.school?.name}</p>
              </div>
              
              <div className="flex items-center space-x-4">
                {idCard.owner?.photoUrl ? (
                  <img src={idCard.owner.photoUrl} alt="Photo" className="h-20 w-20 rounded-full object-cover shadow-sm border border-gray-300" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    No Photo
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{idCard.owner?.name}</h3>
                  <p className="text-sm font-medium text-blue-600">{idCard.owner?.role}</p>
                  <p className="text-sm text-gray-600 mt-1">ID: {idCard.owner?.idNumber}</p>
                  {idCard.owner?.departmentOrClass && (
                    <p className="text-sm text-gray-600">{idCard.owner?.departmentOrClass}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-500">Issued</p>
                  <p className="font-medium text-gray-900">{new Date(idCard.issueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Expires</p>
                  <p className="font-medium text-gray-900">{idCard.expiryDate ? new Date(idCard.expiryDate).toLocaleDateString() : 'Never'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
