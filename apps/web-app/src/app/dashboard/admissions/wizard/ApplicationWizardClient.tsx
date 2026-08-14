"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApplicationWizardClient({ campaigns, token }: { campaigns: { id: string; name: string }[], token: string | undefined }) {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState('');
  const [formConfig, setFormConfig] = useState<{ version: number; fields: { id: string; label: string; isRequired: boolean; type: string; options?: { id: string; value: string }[] }[] } | null>(null);
  
  // Base fields
  const [baseFields, setBaseFields] = useState({
    studentFirstName: '',
    studentLastName: '',
    studentDateOfBirth: ''
  });
  
  // Custom fields
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCampaignSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId) return;
    
    setIsLoadingForm(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admissions/campaigns/${campaignId}/form`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load admission form for this campaign.');
      }
      
      setFormConfig(data.data);
      setStep(2);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/admissions/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaignId,
          studentFirstName: baseFields.studentFirstName,
          studentLastName: baseFields.studentLastName,
          studentDateOfBirth: new Date(baseFields.studentDateOfBirth).toISOString(),
          formVersion: formConfig?.version || 1,
          customFields
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit application');
      }

      router.push(`/dashboard/admissions/applications/${data.data.id}`);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      setIsSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <form onSubmit={handleCampaignSelect} className="space-y-6 bg-white p-8 rounded-lg shadow-sm border max-w-xl">
        <h2 className="text-xl font-semibold">Step 1: Select Admission Campaign</h2>
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
          <select 
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            required
            className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a Campaign</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={!campaignId || isLoadingForm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isLoadingForm ? 'Loading Form...' : 'Next Step →'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-sm border max-w-3xl">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Step 2: Applicant Information</h2>
        <button 
          type="button" 
          onClick={() => setStep(1)}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Change Campaign
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* BASE FIELDS (Always present as per authoritative schema) */}
      <div className="bg-slate-50 p-6 rounded-md border space-y-4">
        <h3 className="font-medium text-gray-900 border-b pb-2 mb-4">Required Base Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input 
              type="text" 
              required
              value={baseFields.studentFirstName}
              onChange={e => setBaseFields({...baseFields, studentFirstName: e.target.value})}
              className="w-full border-gray-300 rounded-md shadow-sm p-2 border" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input 
              type="text" 
              required
              value={baseFields.studentLastName}
              onChange={e => setBaseFields({...baseFields, studentLastName: e.target.value})}
              className="w-full border-gray-300 rounded-md shadow-sm p-2 border" 
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
          <input 
            type="date" 
            required
            value={baseFields.studentDateOfBirth}
            onChange={e => setBaseFields({...baseFields, studentDateOfBirth: e.target.value})}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 border" 
          />
        </div>
      </div>

      {/* DYNAMIC CUSTOM FIELDS (From published form configuration) */}
      {formConfig?.fields && formConfig.fields.length > 0 && (
        <div className="bg-white p-6 rounded-md border space-y-4">
          <h3 className="font-medium text-gray-900 border-b pb-2 mb-4">Additional Information</h3>
          {formConfig.fields.map((field) => (
            <div key={field.id} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.isRequired && '*'}
              </label>
              
              {field.type === 'SELECT' ? (
                <select
                  required={field.isRequired}
                  value={(customFields[field.id] as string) || ''}
                  onChange={e => setCustomFields({...customFields, [field.id]: e.target.value})}
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                >
                  <option value="">Select an option</option>
                  {field.options?.map((opt) => (
                    <option key={opt.id} value={opt.value}>{opt.value}</option>
                  ))}
                </select>
              ) : field.type === 'LONG_TEXT' ? (
                <textarea
                  required={field.isRequired}
                  value={(customFields[field.id] as string) || ''}
                  onChange={e => setCustomFields({...customFields, [field.id]: e.target.value})}
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                  rows={3}
                />
              ) : (
                <input 
                  type={field.type === 'DATE' ? 'date' : field.type === 'NUMBER' ? 'number' : 'text'}
                  required={field.isRequired}
                  value={(customFields[field.id] as string) || ''}
                  onChange={e => setCustomFields({...customFields, [field.id]: e.target.value})}
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <button 
          type="button" 
          onClick={() => router.push('/dashboard/admissions/applications')}
          className="mr-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </form>
  );
}
