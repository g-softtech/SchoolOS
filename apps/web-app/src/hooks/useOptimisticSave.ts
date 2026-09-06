import { useState, useCallback, useEffect } from 'react';
import { ContentBlock } from '@/lib/cms/types';

interface OptimisticSaveOptions {
  pageId: string;
  initialVersion: number;
  initialBlocks: ContentBlock[];
}

export function useOptimisticSave({ pageId, initialVersion, initialBlocks }: OptimisticSaveOptions) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const [version, setVersion] = useState<number>(initialVersion);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // Conflict state
  const [hasConflict, setHasConflict] = useState(false);
  const [serverVersion, setServerVersion] = useState<number | null>(null);

  // Load from localStorage if a previous dirty session crashed
  useEffect(() => {
    const savedDirtyState = localStorage.getItem(`cms_draft_${pageId}`);
    if (savedDirtyState) {
      try {
        const { savedBlocks, savedVersion } = JSON.parse(savedDirtyState);
        if (savedVersion === initialVersion) {
          setBlocks(savedBlocks);
          setIsDirty(true);
        }
      } catch (e) {
        localStorage.removeItem(`cms_draft_${pageId}`);
      }
    }
  }, [pageId, initialVersion]);

  // Update blocks locally
  const updateBlocks = useCallback((newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
    setIsDirty(true);
    localStorage.setItem(`cms_draft_${pageId}`, JSON.stringify({
      savedBlocks: newBlocks,
      savedVersion: version
    }));
  }, [pageId, version]);

  const saveToServer = async (forceOverwrite: boolean = false, overwriteVersion?: number) => {
    if (!isDirty && !forceOverwrite) return;
    
    setIsSaving(true);
    const versionToSend = forceOverwrite && overwriteVersion !== undefined ? overwriteVersion : version;

    try {
      const res = await fetch(`/api/v1/website/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: versionToSend,
          contentBlocks: blocks
        })
      });

      if (res.status === 409) {
        // Optimistic lock failed
        const errorData = await res.json().catch(() => ({}));
        setServerVersion(errorData.currentVersion || versionToSend + 1);
        setHasConflict(true);
        setIsSaving(false);
        return;
      }

      if (!res.ok) throw new Error('Failed to save blocks');

      const updatedPage = await res.json();
      setVersion(updatedPage.version);
      setIsDirty(false);
      setHasConflict(false);
      localStorage.removeItem(`cms_draft_${pageId}`);
      
    } catch (err) {
      console.error("Save error:", err);
      alert("An error occurred while saving. Your changes are saved locally.");
    } finally {
      setIsSaving(false);
    }
  };

  const resolveConflict = async (action: 'overwrite' | 'discard' | 'duplicate') => {
    if (action === 'overwrite' && serverVersion !== null) {
      await saveToServer(true, serverVersion);
    } else if (action === 'discard') {
      // Reload page data to get the latest from server
      window.location.reload();
    } else if (action === 'duplicate') {
      // Logic for duplicate would POST a new page
      alert("Duplicate functionality to be implemented in a dedicated modal action.");
    }
    
    if (action !== 'duplicate') {
      setHasConflict(false);
    }
  };

  return {
    blocks,
    updateBlocks,
    version,
    isSaving,
    isDirty,
    saveToServer,
    hasConflict,
    resolveConflict
  };
}
