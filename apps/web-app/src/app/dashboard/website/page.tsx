"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WebsiteSettings {
  domain: string;
  themeColors: {
    primary: string;
    secondary?: string;
  };
  seoMeta: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
}

export default function WebsiteSettingsPage() {
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/v1/website/settings", {
        headers: {
          "Content-Type": "application/json",
          // The tenantId is handled by the backend session or proxy in a real app,
          // but if needed explicitly via headers it would be injected by a fetch wrapper.
        },
      });

      if (res.status === 404) {
        // No website exists yet, handle gracefully or initialize default
        setSettings({
          domain: "",
          themeColors: { primary: "#000000" },
          seoMeta: { title: "" },
        });
        return;
      }

      if (!res.ok) throw new Error("Failed to load settings");

      const data = await res.json();
      setSettings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/v1/website/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <PageHeader title="Website Settings" description="Manage your public school website's branding and domain" />

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>}
      {success && <div className="p-4 bg-green-50 text-green-600 rounded-md">Settings saved successfully!</div>}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Domain Configuration</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Domain</label>
            <Input
              value={settings?.domain || ""}
              onChange={(e: any) => setSettings({ ...settings!, domain: e.target.value })}
              placeholder="e.g., www.myschool.com"
            />
            <p className="text-xs text-gray-500">Configure your DNS A-record to point to our edge servers before saving.</p>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Branding & Theme</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Color</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  className="w-16 p-1 h-10"
                  value={settings?.themeColors?.primary || "#000000"}
                  onChange={(e: any) =>
                    setSettings({
                      ...settings!,
                      themeColors: { ...settings!.themeColors, primary: e.target.value },
                    })
                  }
                />
                <Input
                  value={settings?.themeColors?.primary || "#000000"}
                  onChange={(e: any) =>
                    setSettings({
                      ...settings!,
                      themeColors: { ...settings!.themeColors, primary: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secondary Color</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  className="w-16 p-1 h-10"
                  value={settings?.themeColors?.secondary || "#ffffff"}
                  onChange={(e: any) =>
                    setSettings({
                      ...settings!,
                      themeColors: { ...settings!.themeColors, secondary: e.target.value },
                    })
                  }
                />
                <Input
                  value={settings?.themeColors?.secondary || "#ffffff"}
                  onChange={(e: any) =>
                    setSettings({
                      ...settings!,
                      themeColors: { ...settings!.themeColors, secondary: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Default SEO Metadata</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Site Title</label>
            <Input
              value={settings?.seoMeta?.title || ""}
              onChange={(e: any) =>
                setSettings({
                  ...settings!,
                  seoMeta: { ...settings!.seoMeta, title: e.target.value },
                })
              }
              placeholder="My Awesome School"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Site Description</label>
            <Input
              value={settings?.seoMeta?.description || ""}
              onChange={(e: any) =>
                setSettings({
                  ...settings!,
                  seoMeta: { ...settings!.seoMeta, description: e.target.value },
                })
              }
              placeholder="Welcome to the best school in the region."
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
