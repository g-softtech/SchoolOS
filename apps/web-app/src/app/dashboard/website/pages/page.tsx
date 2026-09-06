"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PageSummary {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  version: number;
  updatedAt: string;
}

export default function WebsitePagesList() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Creation
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      // In a real app, there would be a GET endpoint to list pages.
      // Assuming the backend has GET /api/v1/website/pages
      const res = await fetch("/api/v1/website/pages", {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to load pages");
      const data = await res.json();
      setPages(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSlug) return;

    try {
      const res = await fetch("/api/v1/website/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, slug: newSlug }),
      });
      if (!res.ok) throw new Error("Failed to create page");
      const newPage = await res.json();
      setPages((prev) => [...prev, newPage]);
      setIsCreating(false);
      setNewTitle("");
      setNewSlug("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePublish = async (id: string, currentlyPublished: boolean) => {
    try {
      const endpoint = currentlyPublished ? "archive" : "publish";
      const res = await fetch(`/api/v1/website/pages/${id}/${endpoint}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Failed to ${endpoint} page`);
      const updatedPage = await res.json();
      setPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isPublished: updatedPage.isPublished } : p))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) return <div className="p-8">Loading pages...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader title="Website Pages" description="Manage content and publishing status of your school website pages." />
        <Button onClick={() => setIsCreating(true)}>Create New Page</Button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>}

      {isCreating && (
        <Card className="p-6 mb-6 border-blue-200 bg-blue-50">
          <form onSubmit={handleCreatePage} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Page Title</label>
              <Input
                value={newTitle}
                onChange={(e: any) => setNewTitle(e.target.value)}
                placeholder="e.g., About Us"
                required
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">URL Slug</label>
              <Input
                value={newSlug}
                onChange={(e: any) => setNewSlug(e.target.value)}
                placeholder="e.g., about-us"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => setIsCreating(false)} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b text-gray-900">
            <tr>
              <th className="p-4 font-medium">Title</th>
              <th className="p-4 font-medium">Slug / Path</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Last Updated</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pages.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No pages found. Create one to get started.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{page.title}</td>
                  <td className="p-4 font-mono text-xs">/{page.slug}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        page.isPublished ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {page.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="p-4">{new Date(page.updatedAt || Date.now()).toLocaleDateString()}</td>
                  <td className="p-4 text-right space-x-2">
                    <Button onClick={() => window.location.href = `/dashboard/website/pages/builder/${page.id}`} className="bg-white border text-gray-700 hover:bg-gray-50 px-3 py-1 text-xs h-8">
                      Edit
                    </Button>
                    <Button
                      onClick={() => handlePublish(page.id, page.isPublished)}
                      className={`px-3 py-1 text-xs h-8 ${
                        page.isPublished ? "bg-red-50 text-red-600 hover:bg-red-100 border-0" : ""
                      }`}
                    >
                      {page.isPublished ? "Unpublish" : "Publish"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
