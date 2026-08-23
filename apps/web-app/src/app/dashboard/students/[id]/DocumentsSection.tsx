'use client';
import React, { useState, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useSession } from 'next-auth/react';

export default function DocumentsSection({ ownerId, ownerType, initialDocuments }: { ownerId: string, ownerType: string, initialDocuments: any[] }) {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<any[]>(initialDocuments || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/documents/${ownerType}/${ownerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: formData
      });
      
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      
      const responseData = await res.json();
      if (responseData.data) {
        setDocuments([responseData.data, ...documents]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await fetchApi(`/api/v1/documents/${id}`, {
        method: 'DELETE',
        token: session?.accessToken
      });
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mt-6">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Documents</h3>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
      <div className="px-4 py-5 sm:p-6">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No documents uploaded.</p>
        ) : (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
            {documents.map((doc) => (
              <li key={doc.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                <div className="w-0 flex-1 flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-2 flex-1 w-0 truncate">
                    {doc.name}
                  </span>
                </div>
                <div className="ml-4 flex-shrink-0 space-x-4">
                  <a href={doc.url} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:text-blue-500">
                    Download
                  </a>
                  <button onClick={() => deleteDocument(doc.id)} className="font-medium text-red-600 hover:text-red-500">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
