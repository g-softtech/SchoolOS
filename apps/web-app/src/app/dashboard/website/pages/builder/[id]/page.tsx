"use client";

import React, { useEffect, useState, use } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useOptimisticSave } from '@/hooks/useOptimisticSave';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { TipTapRichText } from '@/components/cms/editor/TipTapRichText';
import { ContentBlock } from '@/lib/cms/types';

// Wrapper for individual sortable blocks
function SortableBlockItem({ block, updateBlock, deleteBlock }: { block: ContentBlock, updateBlock: (id: string, data: any) => void, deleteBlock: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`mb-4 relative border-2 rounded-xl ${isDragging ? 'border-blue-500 shadow-xl' : 'border-transparent'}`}>
      <Card className="relative h-full overflow-hidden">
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute left-0 top-0 bottom-0 w-8 bg-gray-100 flex items-center justify-center cursor-grab hover:bg-gray-200 border-r"
          aria-label="Drag handle"
        >
          <span className="text-gray-400">⋮⋮</span>
        </div>
        <div className="pl-12 p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {block.type} Block
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => deleteBlock(block.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
            >
              Remove
            </Button>
          </div>

          {block.type === 'hero' && (
            <div className="space-y-4">
              <Input 
                value={(block as any).heading || ''} 
                onChange={(e: any) => updateBlock(block.id, { heading: e.target.value })} 
                placeholder="Hero Heading" 
                className="text-lg font-bold"
              />
              <Input 
                value={(block as any).subheading || ''} 
                onChange={(e: any) => updateBlock(block.id, { subheading: e.target.value })} 
                placeholder="Subheading (optional)" 
              />
            </div>
          )}

          {block.type === 'text' && (
            <div className="space-y-2">
              <TipTapRichText 
                value={(block as any).html || ''} 
                onChange={(html) => updateBlock(block.id, { html })} 
              />
            </div>
          )}

          {block.type === 'gallery' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-2">Gallery Images (Comma separated URLs for prototype)</p>
              <Input 
                value={((block as any).images || []).join(', ')} 
                onChange={(e: any) => updateBlock(block.id, { images: e.target.value.split(',').map((u: string) => u.trim()) })} 
                placeholder="https://image1.jpg, https://image2.jpg" 
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}


export default function VisualPageBuilder({ params }: { params: Promise<{ id: string }> }) {
  const { id: pageId } = use(params);
  
  const [initialData, setInitialData] = useState<{ version: number, blocks: ContentBlock[], title: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dnd Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Non-negotiable constraint to allow clicking in inputs
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Fetch initial page data
    fetch(`/api/v1/website/pages/${pageId}`)
      .then(res => res.json())
      .then(data => {
        setInitialData({
          version: data.version,
          blocks: data.contentBlocks || [],
          title: data.title
        });
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load page", err);
        setIsLoading(false);
      });
  }, [pageId]);

  const {
    blocks,
    updateBlocks,
    isSaving,
    isDirty,
    saveToServer,
    hasConflict,
    resolveConflict
  } = useOptimisticSave({
    pageId,
    initialVersion: initialData?.version || 1,
    initialBlocks: initialData?.blocks || []
  });

  if (isLoading) return <div className="p-8">Loading builder...</div>;
  if (!initialData) return <div className="p-8 text-red-500">Error loading page</div>;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      updateBlocks(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  const handleUpdateBlock = (id: string, data: any) => {
    updateBlocks(blocks.map(b => b.id === id ? { ...b, ...data } : b));
  };

  const handleDeleteBlock = (id: string) => {
    updateBlocks(blocks.filter(b => b.id !== id));
  };

  const handleAddBlock = (type: ContentBlock['type']) => {
    const newBlock = { id: crypto.randomUUID(), type } as ContentBlock;
    if (type === 'hero') (newBlock as any).heading = 'New Hero Section';
    updateBlocks([...blocks, newBlock]);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar Palette */}
      <div className="w-64 bg-gray-50 border-r p-4 flex flex-col gap-4 overflow-y-auto">
        <h3 className="font-semibold text-sm uppercase text-gray-500 tracking-wider mb-2">Block Palette</h3>
        <Button variant="outline" onClick={() => handleAddBlock('hero')} className="w-full justify-start text-left bg-white">
          + Hero Block
        </Button>
        <Button variant="outline" onClick={() => handleAddBlock('text')} className="w-full justify-start text-left bg-white">
          + Text Block
        </Button>
        <Button variant="outline" onClick={() => handleAddBlock('gallery')} className="w-full justify-start text-left bg-white">
          + Gallery Block
        </Button>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{initialData.title}</h1>
            <p className="text-sm text-gray-500">Visual Page Builder {isDirty && <span className="text-yellow-600 font-medium">• Unsaved Changes</span>}</p>
          </div>
          <div className="space-x-3">
            <Button variant="outline" onClick={() => window.location.href = '/dashboard/website/pages'}>Back</Button>
            <Button 
              onClick={() => saveToServer(false)} 
              disabled={!isDirty || isSaving}
              className={isDirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'}
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto min-h-[500px] pb-32">
            {blocks.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white text-gray-500">
                <p>This page is empty.</p>
                <p className="text-sm mt-2">Click a block in the palette to get started.</p>
              </div>
            ) : (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map((block) => (
                    <SortableBlockItem 
                      key={block.id} 
                      block={block} 
                      updateBlock={handleUpdateBlock}
                      deleteBlock={handleDeleteBlock}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      <ConflictResolutionModal 
        isOpen={hasConflict} 
        onResolve={resolveConflict} 
      />
    </div>
  );
}
