"use client";

import React, { useState, useEffect } from 'react';

export default function ReviewerKanbanClient({ campaigns, token }: { campaigns: { id: string; name: string; workflowId?: string }[], token: string | undefined }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [workflow, setWorkflow] = useState<{ id: string; name: string; stages: { id: string; name: string }[] } | null>(null);
  const [applications, setApplications] = useState<{ id: string; studentFirstName: string; studentLastName: string; admissionNumber?: string; currentStageId?: string }[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review Modal State
  const [selectedAppForReview, setSelectedAppForReview] = useState<{ id: string; studentFirstName: string; studentLastName: string; currentStageId?: string } | null>(null);
  const [reviewScore, setReviewScore] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [reviewRecommendation, setReviewRecommendation] = useState('HOLD');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!selectedCampaignId) {
      setWorkflow(null);
      setApplications([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Find Campaign to get workflowId
        const campaign = campaigns.find(c => c.id === selectedCampaignId);
        if (!campaign?.workflowId) throw new Error('Campaign has no workflow');

        // 2. Fetch Workflow stages
        const wfRes = await fetch(`/api/v1/admissions/workflows/${campaign.workflowId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const wfData = await wfRes.json();
        if (!wfRes.ok || !wfData.success) throw new Error('Failed to load workflow');
        setWorkflow(wfData.data);

        // 3. Fetch Applications for Campaign
        const appRes = await fetch(`/api/v1/admissions/applications?campaignId=${selectedCampaignId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const appData = await appRes.json();
        if (!appRes.ok || !appData.success) throw new Error('Failed to load applications');
        setApplications(appData.data || []);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCampaignId, campaigns, token]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForReview) return;

    setSubmittingReview(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/admissions/applications/${selectedAppForReview.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stageId: selectedAppForReview.currentStageId,
          score: reviewScore ? parseInt(reviewScore, 10) : undefined,
          comments: reviewComments,
          recommendation: reviewRecommendation
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');

      // Refresh applications to show the new review
      const appRes = await fetch(`/api/v1/admissions/applications?campaignId=${selectedCampaignId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const appData = await appRes.json();
      if (appRes.ok && appData.success) {
        setApplications(appData.data || []);
      }
      
      closeReviewModal();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const closeReviewModal = () => {
    setSelectedAppForReview(null);
    setReviewScore('');
    setReviewComments('');
    setReviewRecommendation('HOLD');
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm border">
        <label className="font-medium text-gray-700 text-sm">Select Campaign:</label>
        <select 
          value={selectedCampaignId}
          onChange={e => setSelectedCampaignId(e.target.value)}
          className="border-gray-300 rounded-md shadow-sm p-2 border text-sm w-64 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Choose Campaign --</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {loading && <span className="text-sm text-gray-500">Loading...</span>}
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">{error}</div>}

      {/* Kanban Board */}
      {workflow && (
        <div className="flex space-x-4 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
          {workflow.stages?.map((stage) => {
            const stageApps = applications.filter(a => a.currentStageId === stage.id);
            return (
              <div key={stage.id} className="min-w-[300px] w-[300px] bg-slate-50 border rounded-lg flex flex-col">
                <div className="p-3 border-b bg-slate-100 rounded-t-lg flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800 text-sm">{stage.name}</h3>
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
                    {stageApps.length}
                  </span>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {stageApps.map(app => (
                    <div key={app.id} className="bg-white p-3 border rounded shadow-sm hover:shadow-md transition-shadow">
                      <div className="font-medium text-sm text-blue-700">
                        {app.studentFirstName} {app.studentLastName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">App #{app.admissionNumber || app.id.slice(0,8)}</div>
                      <div className="mt-3 flex justify-end">
                        <button 
                          onClick={() => setSelectedAppForReview(app)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                  {stageApps.length === 0 && (
                    <div className="text-center text-xs text-gray-400 py-6">No applications in this stage</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedAppForReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-w-full overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-gray-800">Submit Review</h3>
              <button onClick={closeReviewModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Reviewing: <span className="font-semibold text-gray-900">{selectedAppForReview.studentFirstName} {selectedAppForReview.studentLastName}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100) *</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  max="100"
                  value={reviewScore}
                  onChange={e => setReviewScore(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments *</label>
                <textarea 
                  required
                  rows={4}
                  value={reviewComments}
                  onChange={e => setReviewComments(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation *</label>
                <select 
                  required
                  value={reviewRecommendation}
                  onChange={e => setReviewRecommendation(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm p-2 border" 
                >
                  <option value="PROCEED">Proceed</option>
                  <option value="HOLD">Hold / Waitlist</option>
                  <option value="REJECT">Reject</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeReviewModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingReview}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
